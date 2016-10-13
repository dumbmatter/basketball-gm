import backboard from 'backboard';
import Promise from 'bluebird';
import g from '../globals';
import * as team from './team';

/**
 * Assess the payroll and apply minimum and luxury taxes.
 * Distribute half of the collected luxury taxes to teams under the salary cap.
 *
 * @memberOf core.finances
 * @return {Promise}
 */
async function assessPayrollMinLuxury(tx) {
    let collectedTax = 0;

    const payrolls = await team.getPayrolls(tx);

    await tx.teamSeasons.index("season, tid").iterate(backboard.bound([g.season], [g.season, '']), teamSeason => {
        // Store payroll
        teamSeason.payrollEndOfSeason = payrolls[teamSeason.tid];

        // Assess minimum payroll tax and luxury tax
        if (payrolls[teamSeason.tid] < g.minPayroll) {
            teamSeason.expenses.minTax.amount = g.minPayroll - payrolls[teamSeason.tid];
            teamSeason.cash -= teamSeason.expenses.minTax.amount;
        } else if (payrolls[teamSeason.tid] > g.luxuryPayroll) {
            const amount = g.luxuryTax * (payrolls[teamSeason.tid] - g.luxuryPayroll);
            collectedTax += amount;
            teamSeason.expenses.luxuryTax.amount = amount;
            teamSeason.cash -= teamSeason.expenses.luxuryTax.amount;
        }

        return teamSeason;
    });

    const payteams = payrolls.filter(x => x <= g.salaryCap);
    if (payteams.length > 0 && collectedTax > 0) {
        const distribute = (collectedTax * 0.5) / payteams.length;
        return await tx.teamSeasons.index("season, tid").iterate(backboard.bound([g.season], [g.season, '']), teamSeason => {
            if (payrolls[teamSeason.tid] <= g.salaryCap) {
                teamSeason.revenues.luxuryTaxShare = {
                    amount: distribute,
                    rank: 15.5,
                };
                teamSeason.cash += distribute;
            } else {
                teamSeason.revenues.luxuryTaxShare = {
                    amount: 0,
                    rank: 15.5,
                };
            }
            return teamSeason;
        });
    }
}

/**
 * Update the rankings of team budgets, expenses, and revenue sources.
 *
 * Budget ranks should be updated after *any* team updates *any* budget item.
 *
 * Revenue and expenses ranks should be updated any time any revenue or expense occurs - so basically, after every game.
 *
 * @memberOf core.finances
 * @param {IDBTransaction} ot An IndexedDB transaction on teams, readwrite.
 * @param {Array.<string>} type The types of ranks to update - some combination of "budget", "expenses", and "revenues"
 * @param {Promise}
 */
async function updateRanks(tx, types) {
    const sortFn = (a, b) => b.amount - a.amount;

    const getByItem = byTeam => {
        const byItem = {};
        for (const item of Object.keys(byTeam[0])) {
            byItem[item] = byTeam.map(x => x[item]);
            byItem[item].sort(sortFn);
        }
        return byItem;
    };

    const updateObj = (obj, byItem) => {
        for (const item of Object.keys(obj)) {
            for (let i = 0; i < byItem[item].length; i++) {
                if (byItem[item][i].amount === obj[item].amount) {
                    obj[item].rank = i + 1;
                    break;
                }
            }
        }
    };

    let teamSeasonsPromise;
    if (types.indexOf("expenses") >= 0 || types.indexOf("revenues") >= 0) {
        teamSeasonsPromise = tx.teamSeasons.index("season, tid").getAll(backboard.bound([g.season], [g.season, '']));
    } else {
        teamSeasonsPromise = Promise.resolve();
    }

    const [teams, teamSeasons] = await Promise.all([tx.teams.getAll(), teamSeasonsPromise]);

    let budgetsByItem;
    let budgetsByTeam;
    if (types.indexOf("budget") >= 0) {
        budgetsByTeam = teams.map(t => t.budget);
        budgetsByItem = getByItem(budgetsByTeam);
    }
    let expensesByItem;
    let expensesByTeam;
    if (types.indexOf("expenses") >= 0) {
        expensesByTeam = teamSeasons.map(ts => ts.expenses);
        expensesByItem = getByItem(expensesByTeam);
    }
    let revenuesByItem;
    let revenuesByTeam;
    if (types.indexOf("revenues") >= 0) {
        revenuesByTeam = teamSeasons.map(ts => ts.revenues);
        revenuesByItem = getByItem(revenuesByTeam);
    }

    await tx.teams.iterate(t => {
        if (types.indexOf("budget") >= 0) {
            updateObj(t.budget, budgetsByItem);
        }
        if (types.indexOf("revenues") >= 0) {
            updateObj(teamSeasons[t.tid].expenses, expensesByItem);
        }
        if (types.indexOf("expenses") >= 0) {
            updateObj(teamSeasons[t.tid].revenues, revenuesByItem);
        }

        return t;
    });

    if (types.indexOf("revenues") >= 0 || types.indexOf("expenses") >= 0) {
        await Promise.map(teamSeasons, teamSeason => tx.teamSeasons.put(teamSeason));
    }
}

/**
 * Gets the rank of some financial thing over the past 3 seasons, if available.
 *
 * If only 1 or 2 seasons are available, assume 15.5 (average) for the other seasons
 *
 * @memberOf core.finances
 * @param {Object} t Team object
 * @param {string} category Currently either "expenses" or "revenues", but could be extended to allow "budget" if needed.
 * @param {string} item Item inside the category
 * @return {number} Rank, from 1 to g.numTeams (default 30)
 */
function getRankLastThree(teamSeasons, category, item) {
    const s = teamSeasons.length - 1; // Most recent season index
    if (s > 1) {
        // Use three seasons if possible
        return (teamSeasons[s][category][item].rank + teamSeasons[s - 1][category][item].rank + teamSeasons[s - 2][category][item].rank) / 3;
    }
    if (s > 0) {
        // Use two seasons if possible
        return (teamSeasons[s][category][item].rank + teamSeasons[s - 1][category][item].rank + 15.5) / 3;
    }
    if (s === 0) {
        return (teamSeasons[s][category][item].rank + 15.5 + 15.5) / 3;
    }

    return 15.5;
}

export {
    assessPayrollMinLuxury,
    updateRanks,
    getRankLastThree,
};

