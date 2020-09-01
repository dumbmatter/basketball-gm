import { idb } from "../../db";
import { getUpcoming } from "../../views/schedule";
import { g, toUI } from "../../util";
import type { LocalStateUI } from "../../../common/types";
import addDaysToSchedule from "./addDaysToSchedule";

/**
 * Save the schedule to the database, overwriting what's currently there.
 *
 * @param {Array} tids A list of lists, each containing the team IDs of the home and
        away teams, respectively, for every game in the season, respectively.
 * @return {Promise}
 */
const setSchedule = async (tids: [number, number][]) => {
	await idb.cache.schedule.clear();

	const schedule = addDaysToSchedule(
		tids.map(([homeTid, awayTid]) => ({
			homeTid,
			awayTid,
		})),
	);
	for (const game of schedule) {
		idb.cache.schedule.add(game);
	}

	// Add upcoming games
	const games: LocalStateUI["games"] = [];
	const userTid = g.get("userTid");
	const upcoming = await getUpcoming({ tid: userTid });
	for (const game of upcoming) {
		games.push({
			gid: game.gid,
			teams: [
				{
					ovr: game.teams[0].ovr,
					tid: game.teams[0].tid,
					playoffs: game.teams[0].playoffs,
				},
				{
					ovr: game.teams[1].ovr,
					tid: game.teams[1].tid,
					playoffs: game.teams[1].playoffs,
				},
			],
		});
	}

	await toUI("mergeGames", [games]);
};

export default setSchedule;
