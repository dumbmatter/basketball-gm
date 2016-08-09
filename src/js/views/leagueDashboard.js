const g = require('../globals');
const player = require('../core/player');
const season = require('../core/season');
const team = require('../core/team');
const backboard = require('backboard');
const Promise = require('bluebird');
const bbgmViewReact = require('../util/bbgmViewReact');
const helpers = require('../util/helpers');
const LeagueDashboard = require('./views/LeagueDashboard');

async function updateInbox(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0) {
        let messages = await g.dbl.messages.getAll();

        messages.reverse();

        for (let i = 0; i < messages.length; i++) {
            delete messages[i].text;
        }
        messages = messages.slice(0, 2);

        return {
            messages,
        };
    }
}

async function updateTeam(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("gameSim") >= 0 || updateEvents.indexOf("playerMovement") >= 0 || updateEvents.indexOf("newPhase") >= 0) {
        const [t, latestSeason] = await Promise.all([
            g.dbl.teams.get(g.userTid),
            g.dbl.teamSeasons.index("season, tid").get([g.season, g.userTid]),
        ]);

        return {
            region: t.region,
            name: t.name,
            abbrev: t.abbrev,
            won: latestSeason.won,
            lost: latestSeason.lost,
            cash: latestSeason.cash / 1000, // [millions of dollars]
            salaryCap: g.salaryCap / 1000, // [millions of dollars]
            season: g.season,
            playoffRoundsWon: latestSeason.playoffRoundsWon,
        };
    }
}

async function updatePayroll(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("playerMovement") >= 0) {
        const payroll = await team.getPayroll(null, g.userTid).get(0);
        return {
            payroll: payroll / 1000, // [millions of dollars]
        };
    }
}


async function updateTeams(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("gameSim") >= 0 || updateEvents.indexOf("playerMovement") >= 0 || updateEvents.indexOf("newPhase") >= 0) {
        const vars = {};
        const stats = ["pts", "oppPts", "trb", "ast"];  // This is also used later to find ranks for these team stats

        const teams = await team.filter({
            attrs: ["tid", "cid"],
            seasonAttrs: ["won", "lost", "winp", "att", "revenue", "profit"],
            stats,
            season: g.season,
            sortBy: ["winp", "-lost", "won"],
        });

        const cid = teams.find(t => t.tid === g.userTid).cid;

        vars.rank = 1;
        for (let i = 0; i < teams.length; i++) {
            if (teams[i].cid === cid) {
                if (teams[i].tid === g.userTid) {
                    vars.pts = teams[i].pts;
                    vars.oppPts = teams[i].oppPts;
                    vars.trb = teams[i].trb;
                    vars.ast = teams[i].ast;

                    vars.att = teams[i].att;
                    vars.revenue = teams[i].revenue;
                    vars.profit = teams[i].profit;
                    break;
                } else {
                    vars.rank += 1;
                }
            }
        }

        for (let i = 0; i < stats.length; i++) {
            teams.sort((a, b) => b[stats[i]] - a[stats[i]]);
            for (let j = 0; j < teams.length; j++) {
                if (teams[j].tid === g.userTid) {
                    vars[`${stats[i]}Rank`] = j + 1;
                    break;
                }
            }
        }
        vars.oppPtsRank = 31 - vars.oppPtsRank;

        return vars;
    }
}

async function updateGames(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("gameSim") >= 0 || updateEvents.indexOf("newPhase") >= 0) {
        const numShowCompleted = 4;
        const completed = [];

        // This could be made much faster by using a compound index to search for season + team, but that's not supported by IE 10
        await g.dbl.games.index('season').iterate(g.season, "prev", (game, shortCircuit) => {
            if (completed.length >= numShowCompleted) {
                return shortCircuit();
            }

            let overtime;
            if (game.overtimes === 1) {
                overtime = " (OT)";
            } else if (game.overtimes > 1) {
                overtime = ` (${game.overtimes}OT)`;
            } else {
                overtime = "";
            }

            // Check tid
            if (game.teams[0].tid === g.userTid || game.teams[1].tid === g.userTid) {
                completed.push({
                    gid: game.gid,
                    overtime,
                });

                const i = completed.length - 1;
                if (game.teams[0].tid === g.userTid) {
                    completed[i].home = true;
                    completed[i].pts = game.teams[0].pts;
                    completed[i].oppPts = game.teams[1].pts;
                    completed[i].oppTid = game.teams[1].tid;
                    completed[i].oppAbbrev = g.teamAbbrevsCache[game.teams[1].tid];
                    completed[i].won = game.teams[0].pts > game.teams[1].pts;
                } else if (game.teams[1].tid === g.userTid) {
                    completed[i].home = false;
                    completed[i].pts = game.teams[1].pts;
                    completed[i].oppPts = game.teams[0].pts;
                    completed[i].oppTid = game.teams[0].tid;
                    completed[i].oppAbbrev = g.teamAbbrevsCache[game.teams[0].tid];
                    completed[i].won = game.teams[1].pts > game.teams[0].pts;
                }

                completed[i] = helpers.formatCompletedGame(completed[i]);
            }
        });

        return {completed};
    }
}

async function updateSchedule(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("gameSim") >= 0 || updateEvents.indexOf("newPhase") >= 0) {
        const schedule = await season.getSchedule();
        const games = [];
        const numShowUpcoming = 3;
        for (let i = 0; i < schedule.length; i++) {
            const game = schedule[i];
            if (g.userTid === game.homeTid || g.userTid === game.awayTid) {
                const team0 = {tid: game.homeTid, abbrev: g.teamAbbrevsCache[game.homeTid], region: g.teamRegionsCache[game.homeTid], name: g.teamNamesCache[game.homeTid]};
                const team1 = {tid: game.awayTid, abbrev: g.teamAbbrevsCache[game.awayTid], region: g.teamRegionsCache[game.awayTid], name: g.teamNamesCache[game.awayTid]};

                let row;
                if (g.userTid === game.homeTid) {
                    row = {gid: game.gid, teams: [team1, team0], vsat: "at"};
                } else {
                    row = {gid: game.gid, teams: [team1, team0], vsat: "at"};
                }
                games.push(row);
            }

            if (games.length >= numShowUpcoming) {
                break;
            }
        }
        return {upcoming: games};
    }
}

function updatePlayers(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("gameSim") >= 0 || updateEvents.indexOf("playerMovement") >= 0 || updateEvents.indexOf("newPhase") >= 0) {
        return g.dbl.tx(["players", "playerStats"], async tx => {
            const vars = {};

            let players = await tx.players.index('tid').getAll(backboard.lowerBound(g.PLAYER.UNDRAFTED));
            players = await player.withStats(tx, players, {statsSeasons: [g.season]});
            players = player.filter(players, {
                attrs: ["pid", "name", "abbrev", "tid", "age", "contract", "rosterOrder", "injury", "watch"],
                ratings: ["ovr", "pot", "dovr", "dpot", "skills", "pos"],
                stats: ["gp", "min", "pts", "trb", "ast", "per", "yearsWithTeam"],
                season: g.season,
                showNoStats: true,
                showRookies: true,
                fuzz: true,
            });

            // League leaders
            vars.leagueLeaders = {};
            const stats = ["pts", "trb", "ast"]; // Categories for leaders
            for (const stat of stats) {
                players.sort((a, b) => b.stats[stat] - a.stats[stat]);
                vars.leagueLeaders[stat] = {
                    pid: players[0].pid,
                    name: players[0].name,
                    abbrev: players[0].abbrev,
                    stat: players[0].stats[stat],
                };
            }

            // Team leaders
            const userPlayers = players.filter(p => p.tid === g.userTid);
            vars.teamLeaders = {};
            for (const stat of stats) {
                if (userPlayers.length > 0) {
                    userPlayers.sort((a, b) => b.stats[stat] - a.stats[stat]);
                    vars.teamLeaders[stat] = {
                        pid: userPlayers[0].pid,
                        name: userPlayers[0].name,
                        stat: userPlayers[0].stats[stat],
                    };
                } else {
                    vars.teamLeaders[stat] = {
                        pid: 0,
                        name: "",
                        stat: 0,
                    };
                }
            }

            // Roster
            // Find starting 5
            vars.starters = userPlayers.sort((a, b) => a.rosterOrder - b.rosterOrder).slice(0, 5);

            return vars;
        });
    }
}

async function updatePlayoffs(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || (g.phase >= g.PHASE.PLAYOFFS && updateEvents.indexOf("gameSim") >= 0) || (updateEvents.indexOf("newPhase") >= 0 && g.phase === g.PHASE.PLAYOFFS)) {
        const playoffSeries = await g.dbl.playoffSeries.get(g.season);

        const vars = {
            showPlayoffSeries: false,
        };

        if (playoffSeries !== undefined) {
            const series = playoffSeries.series;
            let found = false;

            // Find the latest playoff series with the user's team in it
            for (let rnd = playoffSeries.currentRound; rnd >= 0; rnd--) {
                for (let i = 0; i < series[rnd].length; i++) {
                    if (series[rnd][i].home.tid === g.userTid || series[rnd][i].away.tid === g.userTid) {
                        vars.series = series[rnd][i];
                        found = true;
                        vars.showPlayoffSeries = true;
                        if (rnd === 0) {
                            vars.seriesTitle = "First Round";
                        } else if (rnd === 1) {
                            vars.seriesTitle = "Second Round";
                        } else if (rnd === 2) {
                            vars.seriesTitle = "Conference Finals";
                        } else if (rnd === 3) {
                            vars.seriesTitle = "League Finals";
                        }
                        break;
                    }
                }
                if (found) {
                    break;
                }
            }
        }

        return vars;
    }
}

async function updateStandings(inputs, updateEvents) {
    if (updateEvents.indexOf("dbChange") >= 0 || updateEvents.indexOf("firstRun") >= 0 || updateEvents.indexOf("gameSim") >= 0) {
        const teams = await team.filter({
            attrs: ["tid", "cid", "abbrev", "region"],
            seasonAttrs: ["won", "lost", "winp"],
            season: g.season,
            sortBy: ["winp", "-lost", "won"],
        });

        // Find user's conference
        let cid;
        for (const t of teams) {
            if (t.tid === g.userTid) {
                cid = t.cid;
                break;
            }
        }

        const confTeams = [];
        let l = 0;
        for (let k = 0; k < teams.length; k++) {
            if (cid === teams[k].cid) {
                confTeams.push(helpers.deepCopy(teams[k]));
                confTeams[l].rank = l + 1;
                if (l === 0) {
                    confTeams[l].gb = 0;
                } else {
                    confTeams[l].gb = helpers.gb(confTeams[0], confTeams[l]);
                }
                l += 1;
            }
        }

        const playoffsByConference = g.confs.length === 2 && !localStorage.top16playoffs;

        return {
            confTeams,
            playoffsByConference,
        };
    }
}

module.exports = bbgmViewReact.init({
    id: "leagueDashboard",
    runBefore: [
        updateInbox,
        updateTeam,
        updatePayroll,
        updateTeams,
        updateGames,
        updateSchedule,
        updatePlayers,
        updatePlayoffs,
        updateStandings,
    ],
    Component: LeagueDashboard,
});
