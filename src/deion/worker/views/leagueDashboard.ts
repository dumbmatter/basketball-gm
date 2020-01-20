import { PHASE, PLAYER } from "../../common";
import { season, team } from "../core";
import { idb } from "../db";
import { g, getProcessedGames, helpers } from "../util";
import { UpdateEvents } from "../../common/types";

const updateInbox = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (updateEvents.includes("firstRun") || updateEvents.includes("newPhase")) {
		const messages = await idb.getCopies.messages({
			limit: 2,
		});
		messages.reverse();
		return {
			messages: messages.map(message => ({
				mid: message.mid,
				read: message.read,
				year: message.year,
				from: message.from,
			})),
		};
	}
};

const updateTeam = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (
		updateEvents.includes("firstRun") ||
		updateEvents.includes("gameSim") ||
		updateEvents.includes("playerMovement") ||
		updateEvents.includes("newPhase")
	) {
		const [t, latestSeason] = await Promise.all([
			idb.cache.teams.get(g.get("userTid")),
			idb.cache.teamSeasons.indexGet("teamSeasonsBySeasonTid", [
				g.get("season"),
				g.get("userTid"),
			]),
		]);
		return {
			region: t.region,
			name: t.name,
			abbrev: t.abbrev,
			won: latestSeason !== undefined ? latestSeason.won : 0,
			lost: latestSeason !== undefined ? latestSeason.lost : 0,
			tied: latestSeason !== undefined ? latestSeason.tied : 0,
			ties: g.get("ties"),
			cash: latestSeason !== undefined ? latestSeason.cash / 1000 : 0,
			// [millions of dollars]
			salaryCap: g.get("salaryCap") / 1000,
			// [millions of dollars]
			season: g.get("season"),
			playoffRoundsWon:
				latestSeason !== undefined ? latestSeason.playoffRoundsWon : 0,
			numGames: g.get("numGames"),
			phase: g.get("phase"),
			userTid: g.get("userTid"),
		};
	}
};

const updatePayroll = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (
		updateEvents.includes("firstRun") ||
		updateEvents.includes("playerMovement")
	) {
		const payroll = await team.getPayroll(g.get("userTid"));
		return {
			payroll: payroll / 1000, // [millions of dollars]
		};
	}
};

const updateTeams = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (
		updateEvents.includes("firstRun") ||
		updateEvents.includes("gameSim") ||
		updateEvents.includes("playerMovement") ||
		updateEvents.includes("newPhase")
	) {
		const stats =
			process.env.SPORT === "basketball"
				? ["pts", "oppPts", "trb", "ast"]
				: ["ptsPerGame", "oppPtsPerGame", "pssYdsPerGame", "rusYdsPerGame"];
		const statNames =
			process.env.SPORT === "basketball"
				? ["Points", "Allowed", "Rebounds", "Assists"]
				: ["Points", "Allowed", "PssYds", "RusYds"];
		const teams = helpers.orderByWinp(
			await idb.getCopies.teamsPlus({
				attrs: ["tid", "cid", "did"],
				seasonAttrs: ["won", "winp", "att", "revenue", "profit"],
				stats,
				season: g.get("season"),
			}),
		);
		const t = teams.find(t2 => t2.tid === g.get("userTid"));
		const cid = t !== undefined ? t.cid : undefined;
		let att = 0;
		let rank = 1;
		let revenue = 0;
		let profit = 0;
		let teamStats: {
			name: string;
			rank: number;
			stat: string;
			value: number;
		}[] = [];

		for (const t2 of teams) {
			if (t2.cid === cid) {
				if (t2.tid === g.get("userTid")) {
					teamStats = stats.map((stat, i) => {
						return {
							name: statNames[i],
							rank: 0,
							stat,
							value: t2.stats[stats[i]],
						};
					});
					att = t2.seasonAttrs.att;
					revenue = t2.seasonAttrs.revenue;
					profit = t2.seasonAttrs.profit;
					break;
				} else {
					rank += 1;
				}
			}
		}

		for (const stat of stats) {
			teams.sort((a, b) => b.stats[stat] - a.stats[stat]);

			for (let j = 0; j < teams.length; j++) {
				if (teams[j].tid === g.get("userTid")) {
					const entry = teamStats.find(teamStat => teamStat.stat === stat);

					if (entry) {
						entry.rank = j + 1;

						if (stat.startsWith("opp")) {
							entry.rank = g.get("numTeams") + 1 - entry.rank;
						}
					}

					break;
				}
			}
		}

		return {
			att,
			rank,
			revenue,
			profit,
			teamStats,
		};
	}
};

const updateGames = async (
	inputs: unknown,
	updateEvents: UpdateEvents,
	state: any,
) => {
	const NUM_SHOW_COMPLETED = 4;

	if (updateEvents.includes("firstRun")) {
		// Load all games in list - would be more efficient to just load NUM_SHOW_COMPLETED
		const games = await getProcessedGames(
			g.get("teamAbbrevsCache")[g.get("userTid")],
			g.get("season"),
		);
		const completed = games
			.slice(0, NUM_SHOW_COMPLETED)
			.map(game => helpers.formatCompletedGame(game));
		return {
			completed,
		};
	}

	if (updateEvents.includes("gameSim")) {
		const completed = Array.isArray(state.completed) ? state.completed : []; // Partial update of only new games

		const games = await getProcessedGames(
			g.get("teamAbbrevsCache")[g.get("userTid")],
			g.get("season"),
			state.completed,
		);

		for (let i = games.length - 1; i >= 0; i--) {
			completed.unshift(helpers.formatCompletedGame(games[i]));

			if (completed.length > NUM_SHOW_COMPLETED) {
				completed.pop();
			}
		}

		return {
			completed,
		};
	}
};

const updateSchedule = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (
		updateEvents.includes("firstRun") ||
		updateEvents.includes("gameSim") ||
		updateEvents.includes("newPhase")
	) {
		const schedule = await season.getSchedule();
		const games: {
			gid?: number;
			teams: [
				{
					tid: number;
					abbrev: string;
					region: string;
					name: string;
				},
				{
					tid: number;
					abbrev: string;
					region: string;
					name: string;
				},
			];
		}[] = [];
		const numShowUpcoming = 3;

		for (let i = 0; i < schedule.length; i++) {
			const game = schedule[i];

			if (
				g.get("userTid") === game.homeTid ||
				g.get("userTid") === game.awayTid
			) {
				const team0 = {
					tid: game.homeTid,
					abbrev: g.get("teamAbbrevsCache")[game.homeTid],
					region: g.get("teamRegionsCache")[game.homeTid],
					name: g.get("teamNamesCache")[game.homeTid],
				};
				const team1 = {
					tid: game.awayTid,
					abbrev: g.get("teamAbbrevsCache")[game.awayTid],
					region: g.get("teamRegionsCache")[game.awayTid],
					name: g.get("teamNamesCache")[game.awayTid],
				};
				games.push({
					gid: game.gid,
					teams: [team1, team0],
				});
			}

			if (games.length >= numShowUpcoming) {
				break;
			}
		}

		return {
			upcoming: games,
		};
	}
};

const updatePlayers = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (
		updateEvents.includes("firstRun") ||
		updateEvents.includes("gameSim") ||
		updateEvents.includes("playerMovement") ||
		updateEvents.includes("newPhase")
	) {
		const startersStats =
			process.env.SPORT === "basketball"
				? ["gp", "min", "pts", "trb", "ast", "per"]
				: ["gp", "keyStats"];
		const leaderStats =
			process.env.SPORT === "basketball"
				? ["pts", "trb", "ast"]
				: ["pssYds", "rusYds", "recYds"];
		const playersAll = await idb.cache.players.indexGetAll("playersByTid", [
			PLAYER.FREE_AGENT,
			Infinity,
		]);
		const players = await idb.getCopies.playersPlus(playersAll, {
			attrs: [
				"pid",
				"name",
				"abbrev",
				"tid",
				"age",
				"contract",
				"rosterOrder",
				"injury",
				"watch",
			],
			ratings: ["ovr", "pot", "dovr", "dpot", "skills", "pos"],
			stats: [...startersStats, ...leaderStats, "yearsWithTeam"],
			season: g.get("season"),
			showNoStats: true,
			showRookies: true,
			fuzz: true,
		});

		// League leaders
		const leagueLeaders: {
			abbrev: string;
			name: string;
			pid: number;
			stat: string;
			value: number;
		}[] = [];

		for (const stat of leaderStats) {
			if (players.length > 0) {
				players.sort((a, b) => b.stats[stat] - a.stats[stat]);
				leagueLeaders.push({
					abbrev: players[0].abbrev,
					name: players[0].name,
					pid: players[0].pid,
					stat,
					value: players[0].stats[stat],
				});
			} else {
				leagueLeaders.push({
					abbrev: g.get("teamAbbrevsCache")[g.get("userTid")],
					name: "",
					pid: 0,
					stat,
					value: 0,
				});
			}
		}

		// Team leaders
		const userPlayers = players.filter(p => p.tid === g.get("userTid"));
		const teamLeaders: {
			name: string;
			pid: number;
			stat: string;
			value: number;
		}[] = [];

		for (const stat of leaderStats) {
			if (userPlayers.length > 0) {
				userPlayers.sort((a, b) => b.stats[stat] - a.stats[stat]);
				teamLeaders.push({
					name: userPlayers[0].name,
					pid: userPlayers[0].pid,
					stat,
					value: userPlayers[0].stats[stat],
				});
			} else {
				teamLeaders.push({
					name: "",
					pid: 0,
					stat,
					value: 0,
				});
			}
		}

		// Roster
		// Find starting 5 or top 5
		if (process.env.SPORT === "basketball") {
			userPlayers.sort((a, b) => a.rosterOrder - b.rosterOrder);
		} else {
			userPlayers.sort((a, b) => b.ratings.ovr - a.ratings.ovr);
		}

		const starters = userPlayers.slice(0, 5);
		return {
			leagueLeaders,
			teamLeaders,
			starters,
			startersStats,
		};
	}
};

const updatePlayoffs = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (
		updateEvents.includes("firstRun") ||
		(g.get("phase") >= PHASE.PLAYOFFS && updateEvents.includes("gameSim")) ||
		(updateEvents.includes("newPhase") && g.get("phase") === PHASE.PLAYOFFS)
	) {
		const playoffSeries = await idb.getCopy.playoffSeries({
			season: g.get("season"),
		});
		let foundSeries;
		let seriesTitle = "";
		let showPlayoffSeries = false;
		let numGamesToWinSeries = 4;

		if (playoffSeries !== undefined) {
			const series = playoffSeries.series;
			await helpers.augmentSeries(series); // Find the latest playoff series with the user's team in it

			let found = false;

			for (let rnd = playoffSeries.currentRound; rnd >= 0; rnd--) {
				for (let i = 0; i < series[rnd].length; i++) {
					const { away, home } = series[rnd][i];
					if (
						home.tid === g.get("userTid") ||
						(away && away.tid === g.get("userTid"))
					) {
						foundSeries = series[rnd][i];
						found = true;
						showPlayoffSeries = true;

						if (rnd === 0) {
							seriesTitle = "First Round";
						} else if (rnd === 1) {
							seriesTitle = "Second Round";
						} else if (rnd === 2) {
							seriesTitle = "Conference Finals";
						} else if (rnd === 3) {
							seriesTitle = "League Finals";
						}

						numGamesToWinSeries = helpers.numGamesToWinSeries(
							g.get("numGamesPlayoffSeries")[rnd],
						);
						break;
					}
				}

				if (found) {
					break;
				}
			}
		}

		return {
			numConfs: g.get("confs").length,
			numGamesToWinSeries,
			numPlayoffRounds: g.get("numGamesPlayoffSeries").length,
			series: foundSeries,
			seriesTitle,
			showPlayoffSeries,
		};
	}
};

const updateStandings = async (inputs: unknown, updateEvents: UpdateEvents) => {
	if (updateEvents.includes("firstRun") || updateEvents.includes("gameSim")) {
		const teams = helpers.orderByWinp(
			await idb.getCopies.teamsPlus({
				attrs: ["tid", "cid", "did", "abbrev", "region"],
				seasonAttrs: ["won", "lost", "winp"],
				season: g.get("season"),
			}),
		);

		// Find user's conference
		let cid;

		for (const t of teams) {
			if (t.tid === g.get("userTid")) {
				cid = t.cid;
				break;
			}
		}

		const confTeams: any[] = [];
		let l = 0;

		for (let k = 0; k < teams.length; k++) {
			if (cid === teams[k].cid) {
				confTeams.push(helpers.deepCopy(teams[k]));
				confTeams[l].rank = l + 1;

				if (l === 0) {
					confTeams[l].gb = 0;
				} else {
					confTeams[l].gb = helpers.gb(
						confTeams[0].seasonAttrs,
						confTeams[l].seasonAttrs,
					);
				}

				l += 1;
			}
		}

		const numPlayoffTeams =
			(2 ** g.get("numGamesPlayoffSeries").length - g.get("numPlayoffByes")) /
			2;
		const playoffsByConference = g.get("confs").length === 2;
		return {
			confTeams,
			numPlayoffTeams,
			playoffsByConference,
		};
	}
};

export default async (
	inputs: unknown,
	updateEvents: UpdateEvents,
	state: any,
) => {
	return Object.assign(
		{},
		await updateInbox(inputs, updateEvents),
		await updateTeam(inputs, updateEvents),
		await updatePayroll(inputs, updateEvents),
		await updateTeams(inputs, updateEvents),
		await updateGames(inputs, updateEvents, state),
		await updateSchedule(inputs, updateEvents),
		await updatePlayers(inputs, updateEvents),
		await updatePlayoffs(inputs, updateEvents),
		await updateStandings(inputs, updateEvents),
	);
};