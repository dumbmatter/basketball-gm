import { bySport, PLAYER } from "../../common";
import { player, team } from "../core";
import { idb } from "../db";
import { g } from "../util";

const updateFreeAgents = async () => {
	const userTid = g.get("userTid");

	const payroll = await team.getPayroll(userTid);
	const userPlayersAll = await idb.cache.players.indexGetAll(
		"playersByTid",
		userTid,
	);
	const playersAll = await idb.cache.players.indexGetAll(
		"playersByTid",
		PLAYER.FREE_AGENT,
	);
	const capSpace =
		g.get("salaryCap") > payroll ? (g.get("salaryCap") - payroll) / 1000 : 0;
	const stats = bySport({
		basketball: ["min", "pts", "trb", "ast", "per"],
		football: ["gp", "keyStats", "av"],
	});

	for (const p of playersAll) {
		(p as any).mood = await player.moodInfos(p);
	}

	const players = await idb.getCopies.playersPlus(playersAll, {
		attrs: [
			"pid",
			"name",
			"age",
			"contract",
			"injury",
			"watch",
			"jerseyNumber",
			"mood",
		],
		ratings: ["ovr", "pot", "skills", "pos"],
		stats,
		season: g.get("season"),
		showNoStats: true,
		showRookies: true,
		fuzz: true,
		oldStats: true,
	});

	const userPlayers = await idb.getCopies.playersPlus(userPlayersAll, {
		attrs: [],
		ratings: ["pos"],
		stats: [],
		season: g.get("season"),
		showNoStats: true,
		showRookies: true,
	});

	return {
		capSpace,
		challengeNoFreeAgents: g.get("challengeNoFreeAgents"),
		challengeNoRatings: g.get("challengeNoRatings"),
		hardCap: g.get("hardCap"),
		maxContract: g.get("maxContract"),
		minContract: g.get("minContract"),
		numRosterSpots: g.get("maxRosterSize") - userPlayers.length,
		spectator: g.get("spectator"),
		phase: g.get("phase"),
		players,
		stats,
		userPlayers,
	};
};

export default updateFreeAgents;
