// @flow

import Promise from 'bluebird';
import g from '../globals';
import * as player from '../core/player';
import bbgmViewReact from '../util/bbgmViewReact';
import DraftScouting from './views/DraftScouting';

async function addSeason(season, tid) {
    let playersAll = await g.dbl.players.index('tid').getAll(tid);

    playersAll = player.filter(playersAll, {
        attrs: ["pid", "nameAbbrev", "age", "watch", "valueFuzz"],
        ratings: ["ovr", "pot", "skills", "fuzz", "pos"],
        showNoStats: true,
        showRookies: true,
        fuzz: true,
    });
    playersAll.sort((a, b) => b.valueFuzz - a.valueFuzz);

    const players = [];
    for (let i = 0; i < playersAll.length; i++) {
        const pa = playersAll[i];

        players.push({
            // Attributes
            pid: pa.pid,
            name: pa.nameAbbrev, // use abbrev to prevent overflows
            age: pa.age,
            watch: pa.watch,
            valueFuzz: pa.valueFuzz,

            // Ratings - just take the only entry
            ovr: pa.ratings[0].ovr,
            pot: pa.ratings[0].pot,
            skills: pa.ratings[0].skills,
            pos: pa.ratings[0].pos,

            rank: i + 1,
        });
    }

    return {
        players,
        season,
    };
}

async function updateDraftScouting(inputs, updateEvents) {
    if (updateEvents.includes('firstRun') || updateEvents.includes('dbChange')) {
        // Once a new draft class is generated, if the next season hasn't started, need to bump up year numbers
        const seasonOffset = g.phase < g.PHASE.FREE_AGENCY ? 0 : 1;

        // In fantasy draft, use temp tid
        const firstUndraftedTid = g.phase === g.PHASE.FANTASY_DRAFT ? g.PLAYER.UNDRAFTED_FANTASY_TEMP : g.PLAYER.UNDRAFTED;

        const seasons = await Promise.all([
            addSeason(g.season + seasonOffset, firstUndraftedTid),
            addSeason(g.season + seasonOffset + 1, g.PLAYER.UNDRAFTED_2),
            addSeason(g.season + seasonOffset + 2, g.PLAYER.UNDRAFTED_3),
        ]);

        return {
            seasons,
        };
    }
}

export default bbgmViewReact.init({
    id: "draftScouting",
    runBefore: [updateDraftScouting],
    Component: DraftScouting,
});
