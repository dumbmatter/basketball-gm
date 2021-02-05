import orderBy from "lodash/orderBy";
import {
	GetTopPlayersOptions,
	getPlayers,
	getTopPlayers,
	leagueLeaders,
	teamAwards,
	AwardsByPlayer,
	addSimpleAndTeamAwardsToAwardsByPlayer,
	saveAwardsByPlayer,
} from "./awards";
import { idb } from "../../db";
import { g } from "../../util";
import type { Conditions, PlayerFiltered } from "../../../common/types";

import type {
	AwardPlayer,
	AwardPlayerDefense,
	Awards,
} from "../../../common/types.hockey";

const getPlayerInfoOffense = (p: PlayerFiltered): AwardPlayer => {
	return {
		pid: p.pid,
		name: p.name,
		tid: p.tid,
		abbrev: p.abbrev,
		keyStats: p.currentStats.keyStats,
		pts: p.currentStats.pts,
	};
};

const getPlayerInfoDefense = (p: PlayerFiltered): AwardPlayerDefense => {
	return {
		pid: p.pid,
		name: p.name,
		tid: p.tid,
		abbrev: p.abbrev,
		tk: p.currentStats.tk,
		gaa: p.currentStats.gaa,
	};
};

const getTopPlayersOffense = (
	options: GetTopPlayersOptions,
	playersUnsorted: PlayerFiltered[],
): AwardPlayer[] => {
	return getTopPlayers(options, playersUnsorted).map(getPlayerInfoOffense);
};

const getTopPlayersDefense = (
	options: GetTopPlayersOptions,
	playersUnsorted: PlayerFiltered[],
): AwardPlayerDefense[] => {
	return getTopPlayers(options, playersUnsorted).map(getPlayerInfoDefense);
};

const makeTeams = <T>(
	players: T[],
): [
	{
		title: "First Team";
		players: T[];
	},
	{
		title: "Second Team";
		players: T[];
	},
	{
		title: "Third Team";
		players: T[];
	},
] => {
	return [
		{
			title: "First Team",
			players: players.slice(0, 5),
		},
		{
			title: "Second Team",
			players: players.slice(5, 10),
		},
		{
			title: "Third Team",
			players: players.slice(10, 15),
		},
	];
};

const getRealFinalsMvp = async (
	players: PlayerFiltered[],
	champTid: number,
): Promise<AwardPlayer | undefined> => {
	const games = await idb.cache.games.getAll(); // Last game of the season will have the two finals teams

	const finalsTids = games[games.length - 1].teams.map(t => t.tid); // Get all playoff games between those two teams - that will be all finals games

	const finalsGames = games.filter(
		game =>
			game.playoffs &&
			finalsTids.includes(game.teams[0].tid) &&
			finalsTids.includes(game.teams[1].tid),
	);

	if (finalsGames.length === 0) {
		return;
	}

	// Calculate sum of game scores for each player
	const playerInfos: Map<
		number,
		{
			pid: number;
			score: number;
			tid: number;
			pts: number;
		}
	> = new Map();

	for (const game of finalsGames) {
		for (const t of game.teams) {
			for (const p of t.players) {
				const info = playerInfos.get(p.pid) || {
					pid: p.pid,
					score: 0,
					tid: t.tid,
					pts: 0,
				};

				// 75% bonus for the winning team
				const factor = t.tid === champTid ? 1.75 : 1;
				info.score += factor * p.pts;
				info.pts += p.pts;
				playerInfos.set(p.pid, info);
			}
		}
	}

	const playerArray = orderBy(
		Array.from(playerInfos.values()),
		"score",
		"desc",
	);

	if (playerArray.length === 0) {
		return;
	}

	const { pid } = playerArray[0];
	const p = players.find(p2 => p2.pid === pid);

	if (p) {
		return {
			pid: p.pid,
			name: p.name,
			tid: p.tid,
			abbrev: p.abbrev,
			pts: playerArray[0].pts / finalsGames.length,
			keyStats: "",
		};
	}
};

export const mvpScore = (p: PlayerFiltered) => {
	let teamFactor = 0;
	if (p.currentStats.gp >= 20) {
		teamFactor =
			(Math.min(p.currentStats.gp - 20, 40) / 40) * p.teamInfo.winp * 20;
	}

	return p.currentStats.pts + teamFactor;
};

export const royScore = (p: PlayerFiltered) => p.currentStats.pts;

export const dpoyScore = (p: PlayerFiltered) => p.currentStats.tk;

export const goyScore = (p: PlayerFiltered) => p.currentStats.gaa;

// This doesn't factor in players who didn't start playing right after being drafted, because currently that doesn't really happen in the game.
export const royFilter = (p: PlayerFiltered) => {
	const repeatSeason = g.get("repeatSeason");
	return (
		p.draft.year === p.currentStats.season - 1 ||
		(repeatSeason !== undefined &&
			p.draft.year === repeatSeason.startingSeason - 1)
	);
};

const doAwards = async (conditions: Conditions) => {
	// Careful - this array is mutated in various functions called below
	const awardsByPlayer: AwardsByPlayer = [];
	const teams = await idb.getCopies.teamsPlus({
		attrs: ["tid"],
		seasonAttrs: [
			"won",
			"lost",
			"tied",
			"winp",
			"playoffRoundsWon",
			"abbrev",
			"region",
			"name",
			"cid",
			"did",
		],
		season: g.get("season"),
		active: true,
	});
	const players = await getPlayers(g.get("season"));
	const { bestRecord, bestRecordConfs } = teamAwards(teams);
	leagueLeaders(players, [], awardsByPlayer);

	const mvpPlayers = getTopPlayersOffense(
		{
			allowNone: true,
			amount: 15,
			score: mvpScore,
		},
		players,
	);
	const mvp = mvpPlayers[0];
	const allLeague = makeTeams(mvpPlayers);
	const royPlayers = getTopPlayersOffense(
		{
			allowNone: true,
			amount: 5,
			filter: royFilter,
			score: royScore,
		},
		players,
	);

	// Unlike mvp and allLeague, roy can be undefined and allRookie can be any length <= 5
	const roy = royPlayers[0];
	const allRookie = royPlayers.slice(0, 5);
	const dpoyPlayers: AwardPlayerDefense[] = getTopPlayersDefense(
		{
			allowNone: true,
			amount: 15,
			score: dpoyScore,
		},
		players,
	);
	const dpoy = dpoyPlayers[0];
	const allDefensive = makeTeams(dpoyPlayers);
	const goyPlayers: AwardPlayerDefense[] = getTopPlayersDefense(
		{
			allowNone: true,
			score: goyScore,
		},
		players,
	);
	const goy = goyPlayers[0];
	let finalsMvp;
	const champTeam = teams.find(
		t =>
			t.seasonAttrs.playoffRoundsWon ===
			g.get("numGamesPlayoffSeries", "current").length,
	);

	if (champTeam) {
		const champTid = champTeam.tid;
		const champPlayersAll = await idb.cache.players.indexGetAll(
			"playersByTid",
			champTid,
		);

		// Alternatively, could filter original players array by tid, but still need playersPlus to fill in playoff stats
		const champPlayers = await idb.getCopies.playersPlus(champPlayersAll, {
			// Only the champions, only playoff stats
			attrs: ["pid", "name", "tid", "abbrev"],
			stats: ["pts", "trb", "ast", "ws", "ewa"],
			season: g.get("season"),
			playoffs: true,
			regularSeason: false,
			tid: champTid,
		});

		// For symmetry with players array
		for (const p of champPlayers) {
			p.currentStats = p.stats;
		}

		finalsMvp = await getRealFinalsMvp(players, champTid);

		// If for some reason there is no Finals MVP (like if the finals box scores were not found), use total playoff stats
		if (finalsMvp === undefined) {
			[finalsMvp] = getTopPlayersOffense(
				{
					score: mvpScore,
				},
				champPlayers,
			);
		}
	}

	const awards: Awards = {
		bestRecord,
		bestRecordConfs,
		mvp,
		dpoy,
		goy,
		roy,
		finalsMvp,
		allLeague,
		allDefensive,
		allRookie,
		season: g.get("season"),
	};
	addSimpleAndTeamAwardsToAwardsByPlayer(awards, awardsByPlayer);
	await idb.cache.awards.put(awards);
	await saveAwardsByPlayer(awardsByPlayer, conditions, awards.season);
};

export default doAwards;