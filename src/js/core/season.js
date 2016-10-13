import backboard from 'backboard';
import Promise from 'bluebird';
import _ from 'underscore';
import g from '../globals';
import * as league from './league';
import * as player from './player';
import * as team from './team';
import * as helpers from '../util/helpers';
import logEvent from '../util/logEvent';
import * as random from '../util/random';

/**
 * Update g.ownerMood based on performance this season.
 *
 * This is based on three factors: regular season performance, playoff performance, and finances. Designed to be called after the playoffs end.
 *
 * @memberOf core.season
 * @param {(IDBTransaction|null)} tx An IndexedDB transaction on gameAttributes and and teams, readwrite.
 * @return {Promise.Object} Resolves to an object containing the changes in g.ownerMood this season.
 */
async function updateOwnerMood(tx) {
    const t = await team.filter({
        ot: tx,
        seasonAttrs: ["won", "playoffRoundsWon", "profit"],
        season: g.season,
        tid: g.userTid,
    });

    const deltas = {};
    deltas.wins = 0.25 * (t.won - g.numGames / 2) / (g.numGames / 2);
    if (t.playoffRoundsWon < 0) {
        deltas.playoffs = -0.2;
    } else if (t.playoffRoundsWon < 4) {
        deltas.playoffs = 0.04 * t.playoffRoundsWon;
    } else {
        deltas.playoffs = 0.2;
    }
    deltas.money = (t.profit - 15) / 100;

    // Only update owner mood if grace period is over
    if (g.season >= g.gracePeriodEnd) {
        const ownerMood = {};
        ownerMood.wins = g.ownerMood.wins + deltas.wins;
        ownerMood.playoffs = g.ownerMood.playoffs + deltas.playoffs;
        ownerMood.money = g.ownerMood.money + deltas.money;

        // Bound only the top - can't win the game by doing only one thing, but you can lose it by neglecting one thing
        if (ownerMood.wins > 1) { ownerMood.wins = 1; }
        if (ownerMood.playoffs > 1) { ownerMood.playoffs = 1; }
        if (ownerMood.money > 1) { ownerMood.money = 1; }

        await league.setGameAttributes(tx, {ownerMood});
    }

    return deltas;
}


async function saveAwardsByPlayer(tx, awardsByPlayer) {
    const pids = _.uniq(awardsByPlayer.map(award => award.pid));

    await Promise.map(pids, async pid => {
        const p = await tx.players.get(pid);

        for (let i = 0; i < awardsByPlayer.length; i++) {
            if (p.pid === awardsByPlayer[i].pid) {
                p.awards.push({season: g.season, type: awardsByPlayer[i].type});
            }
        }

        await tx.players.put(p);
    });
}

/**
 * Compute the awards (MVP, etc) after a season finishes.
 *
 * The awards are saved to the "awards" object store.
 *
 * @memberOf core.season
 * @param {(IDBTransaction)} tx An IndexedDB transaction on awards, players, playerStats, releasedPlayers, and teams, readwrite.
 * @return {Promise}
 */
async function doAwards(tx) {
    const awards = {season: g.season};

    // [{pid, type}]
    const awardsByPlayer = [];

    // Get teams for won/loss record for awards, as well as finding the teams with the best records
    const teams = await team.filter({
        attrs: ["tid", "abbrev", "region", "name", "cid"],
        seasonAttrs: ["won", "lost", "winp", "playoffRoundsWon"],
        season: g.season,
        sortBy: "winp",
        ot: tx,
    });

    awards.bestRecord = {tid: teams[0].tid, abbrev: teams[0].abbrev, region: teams[0].region, name: teams[0].name, won: teams[0].won, lost: teams[0].lost};
    awards.bestRecordConfs = g.confs.map(c => {
        const t = teams.find(t2 => t2.cid === c.cid);
        return {tid: t.tid, abbrev: t.abbrev, region: t.region, name: t.name, won: t.won, lost: t.lost};
    });

    // Sort teams by tid so it can be easily used in awards formulas
    teams.sort((a, b) => a.tid - b.tid);

    let players = await tx.players.index('tid').getAll(backboard.lowerBound(g.PLAYER.FREE_AGENT));
    players = await player.withStats(tx, players, {
        statsSeasons: [g.season],
    });

    players = player.filter(players, {
        attrs: ["pid", "name", "tid", "abbrev", "draft"],
        stats: ["gp", "gs", "min", "pts", "trb", "ast", "blk", "stl", "ewa"],
        season: g.season,
    });

    // League leaders - points, rebounds, assists, steals, blocks
    const factor = (g.numGames / 82) * Math.sqrt(g.quarterLength / 12); // To handle changes in number of games and playing time
    const categories = [
        {name: "League Scoring Leader", stat: "pts", minValue: 1400},
        {name: "League Rebounding Leader", stat: "trb", minValue: 800},
        {name: "League Assists Leader", stat: "ast", minValue: 400},
        {name: "League Steals Leader", stat: "stl", minValue: 125},
        {name: "League Blocks Leader", stat: "blk", minValue: 100},
    ];
    for (const cat of categories) {
        players.sort((a, b) => b.stats[cat.stat] - a.stats[cat.stat]);
        for (const p of players) {
            if (p.stats[cat.stat] * p.stats.gp >= cat.minValue * factor || p.stats.gp >= 70 * factor) {
                awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type: cat.name});
                break;
            }
        }
    }

    // Add team games won to players
    for (let i = 0; i < players.length; i++) {
        // Special handling for players who were cut mid-season
        if (players[i].tid > 0) {
            players[i].won = teams[players[i].tid].won;
        } else {
            players[i].won = 20;
        }
    }

    // Rookie of the Year
    const rookies = players.filter(p => {
        // This doesn't factor in players who didn't start playing right after being drafted, because currently that doesn't really happen in the game.
        return p.draft.year === g.season - 1;
    }).sort((a, b) => b.stats.ewa - a.stats.ewa); // Same formula as MVP, but no wins because some years with bad rookie classes can have the wins term dominate EWA
    {
        const p = rookies[0];
        if (p !== undefined) { // I suppose there could be no rookies at all.. which actually does happen when skip the draft from the debug menu
            awards.roy = {pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, pts: p.stats.pts, trb: p.stats.trb, ast: p.stats.ast};
            awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type: "Rookie of the Year"});
        }
    }

    // All Rookie Team - same sort as ROY
    awards.allRookie = [];
    for (let i = 0; i < 5; i++) {
        const p = rookies[i];
        if (p !== undefined) {
            awards.allRookie.push({pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, pts: p.stats.pts, trb: p.stats.trb, ast: p.stats.ast});
            awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type: "All Rookie Team"});
        }
    }

    // Most Valuable Player
    players.sort((a, b) => (b.stats.ewa + 0.1 * b.won) - (a.stats.ewa + 0.1 * a.won));
    {
        const p = players[0];
        awards.mvp = {pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, pts: p.stats.pts, trb: p.stats.trb, ast: p.stats.ast};
        awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type: "Most Valuable Player"});
    }

    // Sixth Man of the Year - same sort as MVP, must have come off the bench in most games
    {
        const p = players.find(p2 => p2.stats.gs === 0 || p2.stats.gp / p2.stats.gs > 2);
        awards.smoy = {pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, pts: p.stats.pts, trb: p.stats.trb, ast: p.stats.ast};
        awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type: "Sixth Man of the Year"});
    }

    // All League Team - same sort as MVP
    awards.allLeague = [{title: "First Team", players: []}];
    let type = "First Team All-League";
    for (let i = 0; i < 15; i++) {
        const p = players[i];
        if (i === 5) {
            awards.allLeague.push({title: "Second Team", players: []});
            type = "Second Team All-League";
        } else if (i === 10) {
            awards.allLeague.push({title: "Third Team", players: []});
            type = "Third Team All-League";
        }
        _.last(awards.allLeague).players.push({pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, pts: p.stats.pts, trb: p.stats.trb, ast: p.stats.ast});
        awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type});
    }

    // Defensive Player of the Year
    players.sort((a, b) => b.stats.gp * (b.stats.trb + 5 * b.stats.blk + 5 * b.stats.stl) - a.stats.gp * (a.stats.trb + 5 * a.stats.blk + 5 * a.stats.stl));
    {
        const p = players[0];
        awards.dpoy = {pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, trb: p.stats.trb, blk: p.stats.blk, stl: p.stats.stl};
        awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type: "Defensive Player of the Year"});
    }

    // All Defensive Team - same sort as DPOY
    awards.allDefensive = [{title: "First Team", players: []}];
    type = "First Team All-Defensive";
    for (let i = 0; i < 15; i++) {
        const p = players[i];
        if (i === 5) {
            awards.allDefensive.push({title: "Second Team", players: []});
            type = "Second Team All-Defensive";
        } else if (i === 10) {
            awards.allDefensive.push({title: "Third Team", players: []});
            type = "Third Team All-Defensive";
        }
        _.last(awards.allDefensive).players.push({pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, trb: p.stats.trb, blk: p.stats.blk, stl: p.stats.stl});
        awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type});
    }

    // Finals MVP - most WS in playoffs
    const champTid = teams.find(t => t.playoffRoundsWon === g.numPlayoffRounds).tid;

    // Need to read from DB again to really make sure I'm only looking at players from the champs. player.filter might not be enough. This DB call could be replaced with a loop manually checking tids, though.
    let champPlayers = await tx.players.index('tid').getAll(champTid);
    champPlayers = await player.withStats(tx, champPlayers, {
        statsSeasons: [g.season],
        statsTid: champTid,
        statsPlayoffs: true,
    });
    champPlayers = player.filter(champPlayers, { // Only the champions, only playoff stats
        attrs: ["pid", "name", "tid", "abbrev"],
        stats: ["pts", "trb", "ast", "ewa"],
        season: g.season,
        playoffs: true,
        tid: champTid,
    });
    champPlayers.sort((a, b) => b.statsPlayoffs.ewa - a.statsPlayoffs.ewa);
    {
        const p = champPlayers[0];
        awards.finalsMvp = {pid: p.pid, name: p.name, tid: p.tid, abbrev: p.abbrev, pts: p.statsPlayoffs.pts, trb: p.statsPlayoffs.trb, ast: p.statsPlayoffs.ast};
        awardsByPlayer.push({pid: p.pid, tid: p.tid, name: p.name, type: "Finals MVP"});
    }

    await tx.awards.put(awards);
    await saveAwardsByPlayer(tx, awardsByPlayer);

    // None of this stuff needs to block, it's just notifications of crap
    // Notifications for awards for user's players
    for (let i = 0; i < awardsByPlayer.length; i++) {
        const p = awardsByPlayer[i];
        let text = `<a href="${helpers.leagueUrl(["player", p.pid])}">${p.name}</a> (<a href="${helpers.leagueUrl(["roster", g.teamAbbrevsCache[p.tid], g.season])}">${g.teamAbbrevsCache[p.tid]}</a>) `;
        if (p.type.indexOf("Team") >= 0) {
            text += `made the ${p.type}.`;
        } else if (p.type.indexOf("Leader") >= 0) {
            text += `led the league in ${p.type.replace("League ", "").replace(" Leader", "").toLowerCase()}.`;
        } else {
            text += `won the ${p.type} award.`;
        }
        logEvent(null, {
            type: "award",
            text,
            showNotification: p.tid === g.userTid || p.type === "Most Valuable Player",
            pids: [p.pid],
            tids: [p.tid],
        });
    }
}

/**
 * Get an array of games from the schedule.
 *
 * @param {(IDBObjectStore|IDBTransaction|null)} options.ot An IndexedDB object store or transaction on schedule; if null is passed, then a new transaction will be used.
 * @param {boolean} options.oneDay Number of days of games requested. Default false.
 * @return {Promise} Resolves to the requested schedule array.
 */
function getSchedule(options) {
    options = options !== undefined ? options : {};
    options.ot = options.ot !== undefined ? options.ot : null;
    options.oneDay = options.oneDay !== undefined ? options.oneDay : false;

    return helpers.maybeReuseTx(["schedule"], "readonly", options.ot, async tx => {
        let schedule = await tx.schedule.getAll();
        if (options.oneDay) {
            schedule = schedule.slice(0, g.numTeams / 2);  // This is the maximum number of games possible in a day

            // Only take the games up until right before a team plays for the second time that day
            const tids = [];
            let i;
            for (i = 0; i < schedule.length; i++) {
                if (tids.indexOf(schedule[i].homeTid) < 0 && tids.indexOf(schedule[i].awayTid) < 0) {
                    tids.push(schedule[i].homeTid);
                    tids.push(schedule[i].awayTid);
                } else {
                    break;
                }
            }
            schedule = schedule.slice(0, i);
        }

        return schedule;
    });
}

/**
 * Save the schedule to the database, overwriting what's currently there.
 *
 * @param {(IDBTransaction)} tx An IndexedDB transaction on schedule readwrite.
 * @param {Array} tids A list of lists, each containing the team IDs of the home and
        away teams, respectively, for every game in the season, respectively.
 * @return {Promise}
 */
async function setSchedule(tx, tids) {
    await tx.schedule.clear();

    for (const matchup of tids) {
        await tx.schedule.add({
            homeTid: matchup[0],
            awayTid: matchup[1],
        });
    }
}

/**
 * Creates a new regular season schedule for 30 teams.
 *
 * This makes an NBA-like schedule in terms of conference matchups, division matchups, and home/away games.
 *
 * @memberOf core.season
 * @return {Array.<Array.<number>>} All the season's games. Each element in the array is an array of the home team ID and the away team ID, respectively.
 */
function newScheduleDefault(teams) {
    const tids = []; // tid_home, tid_away

    // Collect info needed for scheduling
    for (let i = 0; i < teams.length; i++) {
        teams[i].homeGames = 0;
        teams[i].awayGames = 0;
    }
    for (let i = 0; i < teams.length; i++) {
        for (let j = 0; j < teams.length; j++) {
            if (teams[i].tid !== teams[j].tid) {
                const game = [teams[i].tid, teams[j].tid];

                // Constraint: 1 home game vs. each team in other conference
                if (teams[i].cid !== teams[j].cid) {
                    tids.push(game);
                    teams[i].homeGames += 1;
                    teams[j].awayGames += 1;
                }

                // Constraint: 2 home games vs. each team in same division
                if (teams[i].did === teams[j].did) {
                    tids.push(game);
                    tids.push(game);
                    teams[i].homeGames += 2;
                    teams[j].awayGames += 2;
                }

                // Constraint: 1-2 home games vs. each team in same conference and different division
                // Only do 1 now
                if (teams[i].cid === teams[j].cid && teams[i].did !== teams[j].did) {
                    tids.push(game);
                    teams[i].homeGames += 1;
                    teams[j].awayGames += 1;
                }
            }
        }
    }

    // Constraint: 1-2 home games vs. each team in same conference and different division
    // Constraint: We need 8 more of these games per home team!
    const tidsByConf = [[], []];
    const dids = [[], []];
    for (let i = 0; i < teams.length; i++) {
        tidsByConf[teams[i].cid].push(i);
        dids[teams[i].cid].push(teams[i].did);
    }

    for (let cid = 0; cid < g.confs.length; cid++) {
        const matchups = [];
        matchups.push([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
        let games = 0;
        while (games < 8) {
            let newMatchup = [];
            let n = 0;
            while (n <= 14) {  // 14 = num teams in conference - 1
                let iters = 0;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const tryNum = random.randInt(0, 14);
                    // Pick tryNum such that it is in a different division than n and has not been picked before
                    if (dids[cid][tryNum] !== dids[cid][n] && newMatchup.indexOf(tryNum) < 0) {
                        let good = true;
                        // Check for duplicate games
                        for (let j = 0; j < matchups.length; j++) {
                            const matchup = matchups[j];
                            if (matchup[n] === tryNum) {
                                good = false;
                                break;
                            }
                        }
                        if (good) {
                            newMatchup.push(tryNum);
                            break;
                        }
                    }
                    iters += 1;
                    // Sometimes this gets stuck (for example, first 14 teams in fine but 15th team must play itself)
                    // So, catch these situations and reset the newMatchup
                    if (iters > 50) {
                        newMatchup = [];
                        n = -1;
                        break;
                    }
                }
                n += 1;
            }
            matchups.push(newMatchup);
            games += 1;
        }
        matchups.shift();  // Remove the first row in matchups
        for (let j = 0; j < matchups.length; j++) {
            const matchup = matchups[j];
            for (let k = 0; k < matchup.length; k++) {
                const t = matchup[k];
                const ii = tidsByConf[cid][t];
                const jj = tidsByConf[cid][matchup[t]];
                const game = [teams[ii].tid, teams[jj].tid];
                tids.push(game);
                teams[ii].homeGames += 1;
                teams[jj].awayGames += 1;
            }
        }
    }

    return tids;
}

/**
 * Creates a new regular season schedule for an arbitrary number of teams.
 *
 * newScheduleDefault is much nicer and more balanced, but only works for 30 teams and 82 games.
 *
 * @memberOf core.season
 * @return {Array.<Array.<number>>} All the season's games. Each element in the array is an array of the home team ID and the away team ID, respectively.
 */
function newScheduleCrappy() {
    // Number of games left to reschedule for each team
    const numRemaining = [];
    for (let i = 0; i < g.numTeams; i++) {
        numRemaining[i] = g.numGames;
    }
    let numWithRemaining = g.numTeams; // Number of teams with numRemaining > 0

    const tids = [];

    while (tids.length < g.numGames * g.numTeams / 2) {
        let i = -1; // Home tid
        let j = -1; // Away tid

        let tries = 0;
        while (i === j || numRemaining[i] === 0 || numRemaining[j] === 0) {
            i = random.randInt(0, g.numTeams - 1);
            j = random.randInt(0, g.numTeams - 1);
            tries += 1;
            if (tries > 10000) {
                console.log(tids, tids.length);
                console.log(numRemaining.length);
                throw new Error(`Failed to generate schedule with ${g.numTeams} teams and ${g.numGames} games.`);
            }
        }

        tids.push([i, j]);

        numRemaining[i] -= 1;
        numRemaining[j] -= 1;

        // Make sure we're not left with just one team to play itself
        if (numRemaining[i] === 0) {
            numWithRemaining -= 1;
        }
        if (numRemaining[j] === 0) {
            numWithRemaining -= 1;
        }
        if (numWithRemaining === 1) {
            // If this happens, we didn't find g.numGames for each team and one team will play a few less games
            break;
        }
    }

    return tids;
}

/**
 * Wrapper function to generate a new schedule with the appropriate algorithm based on the number of teams in the league.
 *
 * For 30 teams, use newScheduleDefault (NBA-like).
 *
 * @memberOf core.season
 * @return {Array.<Array.<number>>} All the season's games. Each element in the array is an array of the home team ID and the away team ID, respectively.
 */
function newSchedule(teams) {
    let tids;
    let threeDivsPerConf = true;
    for (const conf of g.confs) {
        if (g.divs.filter(div => div.cid === conf.cid).length !== 3) {
            threeDivsPerConf = false;
            break;
        }
    }
    if (g.numTeams === 30 && g.numGames === 82 && g.confs.length === 2 && threeDivsPerConf) {
        tids = newScheduleDefault(teams);
    } else {
        tids = newScheduleCrappy();
    }

    // Order the schedule so that it takes fewer days to play
    random.shuffle(tids);
    const days = [[]];
    const tidsInDays = [[]];
    let jMax = 0;
    for (let i = 0; i < tids.length; i++) {
        let used = false;
        for (let j = 0; j <= jMax; j++) {
            if (tidsInDays[j].indexOf(tids[i][0]) < 0 && tidsInDays[j].indexOf(tids[i][1]) < 0) {
                tidsInDays[j].push(tids[i][0]);
                tidsInDays[j].push(tids[i][1]);
                days[j].push(tids[i]);
                used = true;
                break;
            }
        }
        if (!used) {
            days.push([tids[i]]);
            tidsInDays.push([tids[i][0], tids[i][1]]);
            jMax += 1;
        }
    }
    random.shuffle(days); // Otherwise the most dense days will be at the beginning and the least dense days will be at the end
    tids = _.flatten(days, true);

    return tids;
}

/**/
/**
 * Create a single day's schedule for an in-progress playoffs.
 *
 * @memberOf core.season
 * @param {(IDBTransaction)} tx An IndexedDB transaction on playoffSeries, schedule, and teamSeasons, readwrite.
 * @return {Promise.boolean} Resolves to true if the playoffs are over. Otherwise, false.
 */
async function newSchedulePlayoffsDay(tx) {
    const playoffSeries = await tx.playoffSeries.get(g.season);

    const series = playoffSeries.series;
    const rnd = playoffSeries.currentRound;
    const tids = [];

    // Try to schedule games if there are active series
    for (let i = 0; i < series[rnd].length; i++) {
        if (series[rnd][i].home.won < 4 && series[rnd][i].away.won < 4) {
            // Make sure to set home/away teams correctly! Home for the lower seed is 1st, 2nd, 5th, and 7th games.
            const numGames = series[rnd][i].home.won + series[rnd][i].away.won;
            if (numGames === 0 || numGames === 1 || numGames === 4 || numGames === 6) {
                tids.push([series[rnd][i].home.tid, series[rnd][i].away.tid]);
            } else {
                tids.push([series[rnd][i].away.tid, series[rnd][i].home.tid]);
            }
        }
    }

    // If series are still in progress, write games and short circuit
    if (tids.length > 0) {
        await setSchedule(tx, tids);
        return false;
    }

    // If playoffs are over, update winner and go to next phase
    if (rnd === g.numPlayoffRounds - 1) {
        let key;
        if (series[rnd][0].home.won >= 4) {
            key = series[rnd][0].home.tid;
        } else {
            key = series[rnd][0].away.tid;
        }

        await tx.teamSeasons.index("season, tid").iterate([g.season, key], teamSeason => {
            teamSeason.playoffRoundsWon = g.numPlayoffRounds;
            teamSeason.hype += 0.05;
            if (teamSeason.hype > 1) {
                teamSeason.hype = 1;
            }

            return teamSeason;
        });

        // Playoffs are over! Return true!
        return true;
    }

    // Playoffs are not over! Make another round

    // Set matchups for next round
    const tidsWon = [];
    for (let i = 0; i < series[rnd].length; i += 2) {
        // Find the two winning teams
        let team1;
        let team2;
        if (series[rnd][i].home.won >= 4) {
            team1 = helpers.deepCopy(series[rnd][i].home);
            tidsWon.push(series[rnd][i].home.tid);
        } else {
            team1 = helpers.deepCopy(series[rnd][i].away);
            tidsWon.push(series[rnd][i].away.tid);
        }
        if (series[rnd][i + 1].home.won >= 4) {
            team2 = helpers.deepCopy(series[rnd][i + 1].home);
            tidsWon.push(series[rnd][i + 1].home.tid);
        } else {
            team2 = helpers.deepCopy(series[rnd][i + 1].away);
            tidsWon.push(series[rnd][i + 1].away.tid);
        }

        // Set home/away in the next round
        let matchup;
        if (team1.winp > team2.winp) {
            matchup = {home: team1, away: team2};
        } else {
            matchup = {home: team2, away: team1};
        }

        matchup.home.won = 0;
        matchup.away.won = 0;
        series[rnd + 1][i / 2] = matchup;
    }

    playoffSeries.currentRound += 1;
    await tx.playoffSeries.put(playoffSeries);

    // Update hype for winning a series
    await Promise.map(tidsWon, async tid => {
        const teamSeason = await tx.teamSeasons.index("season, tid").get([g.season, tid]);

        teamSeason.playoffRoundsWon = playoffSeries.currentRound;
        teamSeason.hype += 0.05;
        if (teamSeason.hype > 1) {
            teamSeason.hype = 1;
        }

        await tx.teamSeasons.put(teamSeason);
    });

    // Next time, the schedule for the first day of the next round will be set
    return newSchedulePlayoffsDay(tx);
}

/**
 * Get the number of days left in the regular season schedule.
 *
 * @memberOf core.season
 * @return {Promise} The number of days left in the schedule.
 */
async function getDaysLeftSchedule() {
    let schedule = await getSchedule();

    let numDays = 0;

    while (schedule.length > 0) {
        // Only take the games up until right before a team plays for the second time that day
        const tids = [];
        let i;
        for (i = 0; i < schedule.length; i++) {
            if (tids.indexOf(schedule[i].homeTid) < 0 && tids.indexOf(schedule[i].awayTid) < 0) {
                tids.push(schedule[i].homeTid);
                tids.push(schedule[i].awayTid);
            } else {
                break;
            }
        }
        numDays += 1;
        schedule = schedule.slice(i);
    }

    return numDays;
}

function genPlayoffSeries(teams) {
    // Playoffs are split into two branches by conference only if there are exactly 2 conferences and the special secret option top16playoffs is not set
    const playoffsByConference = g.confs.length === 2 && !localStorage.top16playoffs;

    const tidPlayoffs = [];
    const numPlayoffTeams = Math.pow(2, g.numPlayoffRounds);
    const series = _.range(g.numPlayoffRounds).map(() => []);
    if (playoffsByConference) {
        // Default: top 50% of teams in each of the two conferences
        const numSeriesPerConference = numPlayoffTeams / 4;
        for (let cid = 0; cid < g.confs.length; cid++) {
            const teamsConf = [];
            for (let i = 0; i < teams.length; i++) {
                if (teams[i].cid === cid) {
                    teamsConf.push(teams[i]);
                    tidPlayoffs.push(teams[i].tid);
                    if (teamsConf.length >= numPlayoffTeams / 2) {
                        break;
                    }
                }
            }
            for (let i = 0; i < numSeriesPerConference; i++) {
                const j = i % 2 === 0 ? i : numSeriesPerConference - i;
                series[0][j + cid * numSeriesPerConference] = {home: teamsConf[i], away: teamsConf[numPlayoffTeams / 2 - 1 - i]};
                series[0][j + cid * numSeriesPerConference].home.seed = i + 1;
                series[0][j + cid * numSeriesPerConference].away.seed = numPlayoffTeams / 2 - i;
            }
        }
    } else {
        // Alternative: top 50% of teams overall
        const teamsConf = [];
        for (let i = 0; i < teams.length; i++) {
            teamsConf.push(teams[i]);
            tidPlayoffs.push(teams[i].tid);
            if (teamsConf.length >= numPlayoffTeams) {
                break;
            }
        }
        for (let i = 0; i < numPlayoffTeams / 2; i++) {
            const j = i % 2 === 0 ? i : numPlayoffTeams / 2 - i;
            series[0][j] = {home: teamsConf[i], away: teamsConf[numPlayoffTeams - 1 - i]};
            series[0][j].home.seed = i + 1;
            series[0][j].away.seed = numPlayoffTeams - i;
        }
    }

    return {series, tidPlayoffs};
}

export {
    doAwards,
    updateOwnerMood,
    getSchedule,
    setSchedule,
    newSchedule,
    newSchedulePlayoffsDay,
    getDaysLeftSchedule,
    genPlayoffSeries,
};
