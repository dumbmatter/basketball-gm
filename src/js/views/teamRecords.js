import Promise from 'bluebird';
import React from 'react';
import _ from 'underscore';
import g from '../globals';
import * as team from '../core/team';
import bbgmViewReact from '../util/bbgmViewReact';
import * as helpers from '../util/helpers';
import TeamRecords from './views/TeamRecords';

function get(ctx) {
    return {
        byType: ctx.params.byType || "team",
    };
}

function getTeamLink(t) {
    return <a href={helpers.leagueUrl(["team_history", t.abbrev])}>{t.region} {t.name}</a>;
}

function getTeamRecord(t, awards) {
    let totalWon = 0;
    let totalLost = 0;
    let playoffAppearances = 0;
    let championships = 0;
    let finals = 0;
    let lastPlayoffAppearance = null;
    let lastChampionship = null;
    for (let i = 0; i < t.seasons.length; i++) {
        totalWon += t.seasons[i].won;
        totalLost += t.seasons[i].lost;
        if (t.seasons[i].playoffRoundsWon >= 0) {
            playoffAppearances++;
            lastPlayoffAppearance = t.seasons[i].season;
        }
        if (t.seasons[i].playoffRoundsWon >= g.numPlayoffRounds - 1) {
            finals++;
        }
        if (t.seasons[i].playoffRoundsWon === g.numPlayoffRounds) {
            championships++;
            lastChampionship = t.seasons[i].season;
        }
    }

    const totalWP = (totalWon > 0) ? helpers.round(totalWon / (totalWon + totalLost), 3) : "0.000";

    return {
        id: t.tid,
        team: getTeamLink(t),
        cid: t.cid,
        did: t.did,
        won: totalWon,
        lost: totalLost,
        winp: totalWP.slice(1),
        playoffAppearances,
        lastPlayoffAppearance,
        championships,
        lastChampionship,
        finals,
        mvp: awards[t.tid].mvp,
        dpoy: awards[t.tid].dpoy,
        smoy: awards[t.tid].smoy,
        roy: awards[t.tid].roy,
        bestRecord: awards[t.tid].bestRecord,
        bestRecordConf: awards[t.tid].bestRecordConf,
        allRookie: awards[t.tid].allRookie,
        allLeague: awards[t.tid].allLeagueTotal,
        allDefense: awards[t.tid].allDefenseTotal,
    };
}

function tallyAwards(awards) {
    const teams = _.range(g.numTeams).map(() => {
        return {
            mvp: 0,
            dpoy: 0,
            smoy: 0,
            roy: 0,
            allLeague: [0, 0, 0],
            allLeagueTotal: 0,
            allDefense: [0, 0, 0],
            allDefenseTotal: 0,
            allRookie: 0,
            bestRecord: 0,
            bestRecordConf: 0,
        };
    });

    awards.forEach(a => {
        teams[a.mvp.tid].mvp++;
        teams[a.dpoy.tid].dpoy++;
        teams[a.smoy.tid].smoy++;
        teams[a.roy.tid].roy++;
        if (a.bre && a.brw) {
            // For old league files, this format is obsolete now
            teams[a.bre.tid].bestRecordConf++;
            teams[a.brw.tid].bestRecordConf++;
            if (a.bre.won >= a.brw.won) {
                teams[a.bre.tid].bestRecord++;
            } else {
                teams[a.brw.tid].bestRecord++;
            }
        } else {
            for (const t of a.bestRecordConfs) {
                teams[t.tid].bestRecordConf++;
            }
            teams[a.bestRecord.tid].bestRecord++;

            for (let i = 0; i < a.allRookie.length; i++) {
                teams[a.allRookie[i].tid].allRookie++;
            }
        }

        for (let i = 0; i < a.allLeague.length; i++) {
            for (const p of a.allLeague[i].players) {
                teams[p.tid].allLeague[i]++;
                teams[p.tid].allLeagueTotal++;
            }
        }

        for (let i = 0; i < a.allDefensive.length; i++) {
            for (const p of a.allDefensive[i].players) {
                teams[p.tid].allDefense[i]++;
                teams[p.tid].allDefenseTotal++;
            }
        }
    });

    return teams;
}

function sumRecordsFor(group, id, name, records) {
    const except = ['id', 'lastChampionship', 'lastPlayoffAppearance', 'team', 'cid', 'did', 'winp'];
    const keys = Object.keys(records[0]);
    const out = {};

    const xRecords = records.filter(r => r[group] === id);

    for (const k of keys) {
        if (except.includes(k)) {
            out[k] = null;
        } else {
            out[k] = xRecords.reduce((a, b) => a + Number(b[k]), 0);
        }
    }
    out.id = id;
    out.team = name;
    out.winp = String(out.won / (out.won + out.lost));
    out.winp = (out.won > 0) ? helpers.round(Number(out.won) / (Number(out.won) + Number(out.lost)), 3) : "0.000";
    return out;
}

async function updateTeamRecords(inputs, updateEvents, state) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || inputs.byType !== state.byType) {
        const [teams, awards] = await Promise.all([
            team.filter({
                attrs: ["tid", "cid", "did", "abbrev", "region", "name"],
                seasonAttrs: ["season", "playoffRoundsWon", "won", "lost"],
            }),
            g.dbl.awards.getAll(),
        ]);

        const awardsPerTeam = tallyAwards(awards);
        const teamRecords = [];
        for (let i = 0; i < teams.length; i++) {
            teamRecords.push(getTeamRecord(teams[i], awardsPerTeam));
        }
        const seasonCount = teamRecords.map(tr => tr.championships).reduce((a, b) => Number(a) + Number(b));

        let display;
        let displayName;
        if (inputs.byType === "team") {
            display = teamRecords;
            displayName = "Team";
        } else if (inputs.byType === "conf") {
            display = g.confs.map(conf => sumRecordsFor('cid', conf.cid, conf.name, teamRecords));
            displayName = "Conference";
        } else {
            display = g.divs.map(div => sumRecordsFor('did', div.did, div.name, teamRecords));
            displayName = "Division";
        }

        return {
            teamRecords: display,
            displayName,
            seasonCount,
            byType: inputs.byType,
        };
    }
}

export default bbgmViewReact.init({
    id: "teamRecords",
    get,
    runBefore: [updateTeamRecords],
    Component: TeamRecords,
});

