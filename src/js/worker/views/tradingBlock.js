// @flow

import {g, helpers} from '../../common';
import {trade} from '../core';
import {idb} from '../db';
import type {GetOutput, UpdateEvents} from '../../common/types';

async function updateUserRoster(
    inputs: GetOutput,
    updateEvents: UpdateEvents,
): void | {[key: string]: any} {
    if (updateEvents.includes('firstRun') || updateEvents.includes('playerMovement') || updateEvents.includes('gameSim')) {
        let [userRoster, userPicks] = await Promise.all([
            idb.cache.players.indexGetAll('playersByTid', g.userTid),
            idb.cache.draftPicks.indexGetAll('draftPicksByTid', g.userTid),
        ]);

        userRoster = await idb.getCopies.playersPlus(userRoster, {
            attrs: ["pid", "name", "age", "contract", "injury", "watch", "gamesUntilTradable"],
            ratings: ["ovr", "pot", "skills", "pos", "hgt", "stre", "spd",
                "jmp", "endu", "ins", "dnk", "ft", "fg", "tp", "blk", "stl", "drb", "pss", "reb"],
            stats: ["min", "pts", "trb", "ast", "per",
                "fg", "fga", "tp", "tpa", "ft", "fta"],
            season: g.season,
            tid: g.userTid,
            showNoStats: true,
            showRookies: true,
            fuzz: true,
        });
        userRoster = trade.filterUntradable(userRoster);

        const userPicksWithDescs = userPicks.map((pick) => {
            const pickWithDesc: any = helpers.deepCopy(pick);
            pickWithDesc.desc = helpers.pickDesc(pickWithDesc);
            return pickWithDesc;
        });

        return {
            gameOver: g.gameOver,
            phase: g.phase,
            userPicks: userPicksWithDescs,
            userRoster,
        };
    }
}

export default {
    runBefore: [updateUserRoster],
};
