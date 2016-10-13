import g from '../globals';
import * as helpers from '../util/helpers';
import * as random from '../util/random';

// x is value, a controls sharpness, b controls center
const sigmoid = (x, a, b) => {
    return 1 / (1 + Math.exp(-(a * (x - b))));
};

/**
 * Pick a player to do something.
 *
 * @param {Array.<number>} ratios output of this.ratingArray.
 * @param {number} exempt An integer representing a player that can't be picked (i.e. you can't assist your own shot, which is the only current use of exempt). The value of exempt ranges from 0 to 4, corresponding to the index of the player in this.playersOnCourt. This is *NOT* the same value as the player ID *or* the index of the this.team[t].player list. Yes, that's confusing.
 */
const pickPlayer = (ratios, exempt) => {
    exempt = exempt !== undefined ? exempt : false;

    if (exempt !== false) {
        ratios[exempt] = 0;
    }

    const rand = Math.random() * (ratios[0] + ratios[1] + ratios[2] + ratios[3] + ratios[4]);

    let pick;
    if (rand < ratios[0]) {
        pick = 0;
    } else if (rand < (ratios[0] + ratios[1])) {
        pick = 1;
    } else if (rand < (ratios[0] + ratios[1] + ratios[2])) {
        pick = 2;
    } else if (rand < (ratios[0] + ratios[1] + ratios[2] + ratios[3])) {
        pick = 3;
    } else {
        pick = 4;
    }

    return pick;
};

/**
 * Convert energy into fatigue, which can be multiplied by a rating to get a fatigue-adjusted value.
 *
 * @param {number} energy A player's energy level, from 0 to 1 (0 = lots of energy, 1 = none).
 * @return {number} Fatigue, from 0 to 1 (0 = lots of fatigue, 1 = none).
 */
const fatigue = energy => {
    energy += 0.05;
    if (energy > 1) {
        energy = 1;
    }

    return energy;
};

class GameSim {
    /**
     * Initialize the two teams that are playing this game.
     *
     * When an instance of this class is created, information about the two teams is passed to GameSim. Then GameSim.run will actually simulate a game and return the results (i.e. stats) of the simulation. Also see core.game where the inputs to this function are generated.
     *
     * @param {number} gid Integer game ID, which must be unique as it will serve as the primary key in the database when the game is saved.
     * @param {Object} team1 Information about the home team. Top-level properties are: id (team ID number), defense (a number representing the overall team defensive rating), pace (the mean number of possessions the team likes to have in a game), stat (an for storing team stats), and player (a list of objects, one for each player on the team, ordered by rosterOrder). Each player's object contains: id (player's unique ID number), valueNoPot (current player value, from core.player.value), stat (an object for storing player stats, similar to the one for team stats), and compositeRatings (an object containing various ratings used in the game simulation), and skills (a list of discrete skills a player has, as defined in core.player.skills, which influence game simulation). In other words...
     *     {
     *         "id": 0,
     *         "defense": 0,
     *         "pace": 0,
     *         "stat": {},
     *         "player": [
     *             {
     *                 "id": 0,
     *                 "valueNoPot": 0,
     *                 "stat": {},
     *                 "compositeRating": {},
     *                 "skills": [],
     *                 "injured": false,
     *                 "ptMultiplier": 1
     *             },
     *             ...
     *         ]
     *     }
     * @param {Object} team2 Same as team1, but for the away team.
     */
    constructor(gid, team1, team2, doPlayByPlay) {
        if (doPlayByPlay) {
            this.playByPlay = [];
        }

        this.id = gid;
        this.team = [team1, team2]; // If a team plays twice in a day, this needs to be a deep copy
        const numPossessions = Math.round((this.team[0].pace + this.team[1].pace) / 2 * random.uniform(0.9, 1.1));
        this.dt = 48 / (2 * numPossessions); // Time elapsed per possession

        // Starting lineups, which will be reset by updatePlayersOnCourt. This must be done because of injured players in the top 5.
        this.playersOnCourt = [[0, 1, 2, 3, 4], [0, 1, 2, 3, 4]];
        this.startersRecorded = false; // Used to track whether the *real* starters have been recorded or not.
        this.updatePlayersOnCourt();

        this.subsEveryN = 6; // How many possessions to wait before doing substitutions

        this.overtimes = 0; // Number of overtime periods that have taken place

        this.t = g.quarterLength; // Game clock, in minutes

        // Parameters
        this.synergyFactor = 0.1; // How important is synergy?

        this.homeCourtAdvantage();

        this.lastScoringPlay = [];
        this.clutchPlays = [];
    }

    /**
     * Home court advantage.
     *
     * Scales composite ratings, giving home players bonuses and away players penalties.
     *
     */
    homeCourtAdvantage() {
        for (let t = 0; t < 2; t++) {
            let factor;
            if (t === 0) {
                factor = 1.01; // Bonus for home team
            } else {
                factor = 0.99; // Penalty for away team
            }

            for (let p = 0; p < this.team[t].player.length; p++) {
                for (const r of Object.keys(this.team[t].player[p].compositeRating)) {
                    this.team[t].player[p].compositeRating[r] *= factor;
                }
            }
        }
    }

    /**
     * Simulates the game and returns the results.
     *
     * Also see core.game where the outputs of this function are used.
     *
     * @return {Array.<Object>} Game result object, an array of two objects similar to the inputs to GameSim, but with both the team and player "stat" objects filled in and the extraneous data (pace, valueNoPot, compositeRating) removed. In other words...
     *     {
     *         "gid": 0,
     *         "overtimes": 0,
     *         "team": [
     *             {
     *                 "id": 0,
     *                 "stat": {},
     *                 "player": [
     *                     {
     *                         "id": 0,
     *                         "stat": {},
     *                         "skills": [],
     *                         "injured": false
     *                     },
     *                     ...
     *                 ]
     *             },
     *         ...
     *         ]
     *     }
     */
    run() {
        // Simulate the game up to the end of regulation
        this.simRegulation();

        // Play overtime periods if necessary
        while (this.team[0].stat.pts === this.team[1].stat.pts) {
            this.checkGameTyingShot();
            this.simOvertime();
        }

        this.checkGameWinner();

        // Delete stuff that isn't needed before returning
        for (let t = 0; t < 2; t++) {
            delete this.team[t].compositeRating;
            delete this.team[t].pace;
            for (let p = 0; p < this.team[t].player.length; p++) {
                delete this.team[t].player[p].valueNoPot;
                delete this.team[t].player[p].compositeRating;
                delete this.team[t].player[p].ptModifier;
            }
        }

        const out = {
            gid: this.id,
            overtimes: this.overtimes,
            team: this.team,
            clutchPlays: this.clutchPlays,
        };

        if (this.playByPlay !== undefined) {
            out.playByPlay = this.playByPlay;
            this.playByPlay.unshift({
                type: "init",
                boxScore: this.team,
            });
        }

        return out;
    }

    simRegulation() {
        this.o = 0;
        this.d = 1;
        let quarter = 1;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            while (this.t > 0) {
                this.simPossession();
            }
            quarter += 1;

            if (quarter === 5) {
                break;
            }
            this.team[0].stat.ptsQtrs.push(0);
            this.team[1].stat.ptsQtrs.push(0);
            this.t = g.quarterLength;
            this.lastScoringPlay = [];
            this.recordPlay("quarter");
        }
    }

    simOvertime() {
        this.t = Math.ceil(0.4 * g.quarterLength); // 5 minutes by default, but scales
        this.lastScoringPlay = [];
        this.overtimes += 1;
        this.team[0].stat.ptsQtrs.push(0);
        this.team[1].stat.ptsQtrs.push(0);
        this.recordPlay("overtime");
        this.o = random.randInt(0, 1);
        this.d = this.o - 1;
        while (this.t > 0) {
            this.simPossession();
        }
    }

    simPossession() {
        // Clock
        this.t -= this.dt;
        let possessionTime = this.dt;
        if (this.t < 0) {
            possessionTime += this.t;
            this.t = 0;
        }

        // Possession change
        this.o = (this.o === 1) ? 0 : 1;
        this.d = (this.o === 1) ? 0 : 1;

        this.updateTeamCompositeRatings();

        const outcome = this.getPossessionOutcome();

        // Swap o and d so that o will get another possession when they are swapped again at the beginning of the loop.
        if (outcome === "orb") {
            this.o = (this.o === 1) ? 0 : 1;
            this.d = (this.o === 1) ? 0 : 1;
        }

        this.updatePlayingTime(possessionTime);

        this.injuries();

        if (random.randInt(1, this.subsEveryN) === 1) {
            const substitutions = this.updatePlayersOnCourt();
            if (substitutions) {
                this.updateSynergy();
            }
        }
    }

    /**
     * Perform appropriate substitutions.
     *
     * Can this be sped up?
     *
     * @return {boolean} true if a substitution occurred, false otherwise.
     */
    updatePlayersOnCourt() {
        let substitutions = false;

        for (let t = 0; t < 2; t++) {
            // Overall values scaled by fatigue
            const ovrs = [];
            for (let p = 0; p < this.team[t].player.length; p++) {
                // Injured or fouled out players can't play
                if (this.team[t].player[p].injured || this.team[t].player[p].stat.pf >= 6) {
                    ovrs[p] = -Infinity;
                } else {
                    ovrs[p] = this.team[t].player[p].valueNoPot * fatigue(this.team[t].player[p].stat.energy) * this.team[t].player[p].ptModifier * random.uniform(0.9, 1.1);
                }
            }

            // Loop through players on court (in inverse order of current roster position)
            let i = 0;
            for (let pp = 0; pp < this.playersOnCourt[t].length; pp++) {
                const p = this.playersOnCourt[t][pp];
                this.playersOnCourt[t][i] = p;
                // Loop through bench players (in order of current roster position) to see if any should be subbed in)
                for (let b = 0; b < this.team[t].player.length; b++) {
                    if (this.playersOnCourt[t].indexOf(b) === -1 && ((this.team[t].player[p].stat.courtTime > 3 && this.team[t].player[b].stat.benchTime > 3 && ovrs[b] > ovrs[p]) || ((this.team[t].player[p].injured || this.team[t].player[p].stat.pf >= 6) && (!this.team[t].player[b].injured && this.team[t].player[b].stat.pf < 6)))) {
                        // Check if position of substitute makes for a valid lineup
                        const pos = [];
                        for (let j = 0; j < this.playersOnCourt[t].length; j++) {
                            if (j !== pp) {
                                pos.push(this.team[t].player[this.playersOnCourt[t][j]].pos);
                            }
                        }
                        pos.push(this.team[t].player[b].pos);
                        // Requre 2 Gs (or 1 PG) and 2 Fs (or 1 C)
                        let numG = 0;
                        let numPG = 0;
                        let numF = 0;
                        let numC = 0;
                        for (let j = 0; j < pos.length; j++) {
                            if (pos[j].indexOf('G') >= 0) {
                                numG += 1;
                            }
                            if (pos[j] === 'PG') {
                                numPG += 1;
                            }
                            if (pos[j].indexOf('F') >= 0) {
                                numF += 1;
                            }
                            if (pos[j] === 'C') {
                                numC += 1;
                            }
                        }
                        if ((numG < 2 && numPG === 0) || (numF < 2 && numC === 0)) {
                            if (fatigue(this.team[t].player[p].stat.energy) > 0.7) {
                                // Exception for ridiculously tired players, so really unbalanced teams won't play starters whole game
                                continue;
                            }
                        }

                        substitutions = true;

                        // Substitute player
                        this.playersOnCourt[t][i] = b;

                        this.team[t].player[b].stat.courtTime = random.uniform(-2, 2);
                        this.team[t].player[b].stat.benchTime = random.uniform(-2, 2);
                        this.team[t].player[p].stat.courtTime = random.uniform(-2, 2);
                        this.team[t].player[p].stat.benchTime = random.uniform(-2, 2);

                        // Keep track of deviations from the normal starting lineup for the play-by-play
                        if (this.playByPlay !== undefined) {
                            this.playByPlay.push({
                                type: "sub",
                                t,
                                on: this.team[t].player[b].id,
                                off: this.team[t].player[p].id,
                            });
                        }

                        // It's only a "substitution" if it's not the starting lineup
                        if (this.startersRecorded) {
                            this.recordPlay("sub", t, [this.team[t].player[b].name, this.team[t].player[p].name]);
                        }
                        break;
                    }
                }
                i += 1;
            }
        }

        // Record starters if that hasn't been done yet. This should run the first time this function is called, and never again.
        if (!this.startersRecorded) {
            for (let t = 0; t < 2; t++) {
                for (let p = 0; p < this.team[t].player.length; p++) {
                    if (this.playersOnCourt[t].indexOf(p) >= 0) {
                        this.recordStat(t, p, "gs");
                    }
                }
            }
            this.startersRecorded = true;
        }

        return substitutions;
    }

    /**
     * Update synergy.
     *
     * This should be called after this.updatePlayersOnCourt as it only produces different output when the players on the court change.
     */
    updateSynergy() {
        for (let t = 0; t < 2; t++) {
            // Count all the *fractional* skills of the active players on a team (including duplicates)
            const skillsCount = {
                3: 0,
                A: 0,
                B: 0,
                Di: 0,
                Dp: 0,
                Po: 0,
                Ps: 0,
                R: 0,
            };

            for (let i = 0; i < 5; i++) {
                const p = this.playersOnCourt[t][i];

                // 1 / (1 + e^-(15 * (x - 0.7))) from 0 to 1
                skillsCount["3"] += sigmoid(this.team[t].player[p].compositeRating.shootingThreePointer, 15, 0.7);
                skillsCount.A += sigmoid(this.team[t].player[p].compositeRating.athleticism, 15, 0.7);
                skillsCount.B += sigmoid(this.team[t].player[p].compositeRating.dribbling, 15, 0.7);
                skillsCount.Di += sigmoid(this.team[t].player[p].compositeRating.defenseInterior, 15, 0.7);
                skillsCount.Dp += sigmoid(this.team[t].player[p].compositeRating.defensePerimeter, 15, 0.7);
                skillsCount.Po += sigmoid(this.team[t].player[p].compositeRating.shootingLowPost, 15, 0.7);
                skillsCount.Ps += sigmoid(this.team[t].player[p].compositeRating.passing, 15, 0.7);
                skillsCount.R += sigmoid(this.team[t].player[p].compositeRating.rebounding, 15, 0.7);
            }

            // Base offensive synergy
            this.team[t].synergy.off = 0;
            this.team[t].synergy.off += 5 * sigmoid(skillsCount["3"], 3, 2); // 5 / (1 + e^-(3 * (x - 2))) from 0 to 5
            this.team[t].synergy.off += 3 * sigmoid(skillsCount.B, 15, 0.75) + sigmoid(skillsCount.B, 5, 1.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5
            this.team[t].synergy.off += 3 * sigmoid(skillsCount.Ps, 15, 0.75) + sigmoid(skillsCount.Ps, 5, 1.75) + sigmoid(skillsCount.Ps, 5, 2.75); // 3 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5
            this.team[t].synergy.off += sigmoid(skillsCount.Po, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5
            this.team[t].synergy.off += sigmoid(skillsCount.A, 15, 1.75) + sigmoid(skillsCount.A, 5, 2.75); // 1 / (1 + e^-(15 * (x - 1.75))) + 1 / (1 + e^-(5 * (x - 2.75))) from 0 to 5
            this.team[t].synergy.off /= 17;

            // Punish teams for not having multiple perimeter skills
            const perimFactor = helpers.bound(Math.sqrt(1 + skillsCount.B + skillsCount.Ps + skillsCount["3"]) - 1, 0, 2) / 2; // Between 0 and 1, representing the perimeter skills
            this.team[t].synergy.off *= 0.5 + 0.5 * perimFactor;

            // Defensive synergy
            this.team[t].synergy.def = 0;
            this.team[t].synergy.def += sigmoid(skillsCount.Dp, 15, 0.75); // 1 / (1 + e^-(15 * (x - 0.75))) from 0 to 5
            this.team[t].synergy.def += 2 * sigmoid(skillsCount.Di, 15, 0.75); // 2 / (1 + e^-(15 * (x - 0.75))) from 0 to 5
            this.team[t].synergy.def += sigmoid(skillsCount.A, 5, 2) + sigmoid(skillsCount.A, 5, 3.25); // 1 / (1 + e^-(5 * (x - 2))) + 1 / (1 + e^-(5 * (x - 3.25))) from 0 to 5
            this.team[t].synergy.def /= 6;

            // Rebounding synergy
            this.team[t].synergy.reb = 0;
            this.team[t].synergy.reb += sigmoid(skillsCount.R, 15, 0.75) + sigmoid(skillsCount.R, 5, 1.75); // 1 / (1 + e^-(15 * (x - 0.75))) + 1 / (1 + e^-(5 * (x - 1.75))) from 0 to 5
            this.team[t].synergy.reb /= 4;
        }
    }

    /**
     * Update team composite ratings.
     *
     * This should be called once every possession, after this.updatePlayersOnCourt and this.updateSynergy as they influence output, to update the team composite ratings based on the players currently on the court.
     */
    updateTeamCompositeRatings() {
        // Only update ones that are actually used
        const toUpdate = ["dribbling", "passing", "rebounding", "defense", "defensePerimeter", "blocking"];

        for (let t = 0; t < 2; t++) {
            for (let j = 0; j < toUpdate.length; j++) {
                const rating = toUpdate[j];
                this.team[t].compositeRating[rating] = 0;

                for (let i = 0; i < 5; i++) {
                    const p = this.playersOnCourt[t][i];
                    this.team[t].compositeRating[rating] += this.team[t].player[p].compositeRating[rating] * fatigue(this.team[t].player[p].stat.energy);
                }

                this.team[t].compositeRating[rating] = this.team[t].compositeRating[rating] / 5;
            }

            this.team[t].compositeRating.dribbling += this.synergyFactor * this.team[t].synergy.off;
            this.team[t].compositeRating.passing += this.synergyFactor * this.team[t].synergy.off;
            this.team[t].compositeRating.rebounding += this.synergyFactor * this.team[t].synergy.reb;
            this.team[t].compositeRating.defense += this.synergyFactor * this.team[t].synergy.def;
            this.team[t].compositeRating.defensePerimeter += this.synergyFactor * this.team[t].synergy.def;
            this.team[t].compositeRating.blocking += this.synergyFactor * this.team[t].synergy.def;
        }
    }

    /**
     * Update playing time stats.
     *
     * This should be called once every possession, at the end, to record playing time and bench time for players.
     */
    updatePlayingTime(possessionTime) {
        for (let t = 0; t < 2; t++) {
            // Update minutes (overall, court, and bench)
            for (let p = 0; p < this.team[t].player.length; p++) {
                if (this.playersOnCourt[t].indexOf(p) >= 0) {
                    this.recordStat(t, p, "min", possessionTime);
                    this.recordStat(t, p, "courtTime", possessionTime);
                    // This used to be 0.04. Increase more to lower PT
                    this.recordStat(t, p, "energy", -possessionTime * 0.06 * (1 - this.team[t].player[p].compositeRating.endurance));
                    if (this.team[t].player[p].stat.energy < 0) {
                        this.team[t].player[p].stat.energy = 0;
                    }
                } else {
                    this.recordStat(t, p, "benchTime", possessionTime);
                    this.recordStat(t, p, "energy", possessionTime * 0.1);
                    if (this.team[t].player[p].stat.energy > 1) {
                        this.team[t].player[p].stat.energy = 1;
                    }
                }
            }
        }
    }

    /**
     * See if any injuries occurred this possession, and handle the consequences.
     *
     * This doesn't actually compute the type of injury, it just determines if a player is injured bad enough to miss the rest of the game.
     */
    injuries() {
        if (g.disableInjuries) {
            return;
        }

        let newInjury = false;

        for (let t = 0; t < 2; t++) {
            for (let p = 0; p < this.team[t].player.length; p++) {
                // Only players on the court can be injured
                if (this.playersOnCourt[t].indexOf(p) >= 0) {
                    // According to data/injuries.ods, 0.25 injuries occur every game. Divided over 10 players and ~200 possessions, that means each player on the court has P = 0.25 / 10 / 200 = 0.000125 probability of being injured this play.
                    if (Math.random() < 0.000125) {
                        this.team[t].player[p].injured = true;
                        newInjury = true;
                        this.recordPlay("injury", t, [this.team[t].player[p].name]);
                    }
                }
            }
        }

        // Sub out injured player
        if (newInjury) {
            this.updatePlayersOnCourt();
        }
    }

    /**
     * Simulate a single possession.
     *
     * @return {string} Outcome of the possession, such as "tov", "drb", "orb", "fg", etc.
     */
    getPossessionOutcome() {
        // Turnover?
        if (this.probTov() > Math.random()) {
            return this.doTov(); // tov
        }

        // Shot if there is no turnover
        const ratios = this.ratingArray("usage", this.o);
        const shooter = pickPlayer(ratios);

        return this.doShot(shooter); // fg, orb, or drb
    }

    /**
     * Probability of the current possession ending in a turnover.
     *
     * @return {number} Probability from 0 to 1.
     */
    probTov() {
        return 0.13 * (1 + this.team[this.d].compositeRating.defense) / (1 + 0.5 * (this.team[this.o].compositeRating.dribbling + this.team[this.o].compositeRating.passing));
    }

    /**
     * Turnover.
     *
     * @return {string} Either "tov" or "stl" depending on whether the turnover was caused by a steal or not.
     */
    doTov() {
        const ratios = this.ratingArray("turnovers", this.o, 0.5);
        const p = this.playersOnCourt[this.o][pickPlayer(ratios)];
        this.recordStat(this.o, p, "tov");
        if (this.probStl() > Math.random()) {
            return this.doStl(p); // "stl"
        }

        this.recordPlay("tov", this.o, [this.team[this.o].player[p].name]);

        return "tov";
    }


    /**
     * Probability that a turnover occurring in this possession is a steal.
     *
     * @return {number} Probability from 0 to 1.
     */
    probStl() {
        return 0.55 * this.team[this.d].compositeRating.defensePerimeter / (0.5 * (this.team[this.o].compositeRating.dribbling + this.team[this.o].compositeRating.passing));
    }

    /**
     * Steal.
     *
     * @return {string} Currently always returns "stl".
     */
    doStl(pStoleFrom) {
        const ratios = this.ratingArray("stealing", this.d);
        const p = this.playersOnCourt[this.d][pickPlayer(ratios)];
        this.recordStat(this.d, p, "stl");
        this.recordPlay("stl", this.d, [this.team[this.d].player[p].name, this.team[this.o].player[pStoleFrom].name]);

        return "stl";
    }

    /**
     * Shot.
     *
     * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
     * @return {string} Either "fg" or output of this.doReb, depending on make or miss and free throws.
     */
    doShot(shooter) {
        const p = this.playersOnCourt[this.o][shooter];

        const currentFatigue = fatigue(this.team[this.o].player[p].stat.energy);

        // Is this an "assisted" attempt (i.e. an assist will be recorded if it's made)
        let passer = -1;
        if (this.probAst() > Math.random()) {
            const ratios = this.ratingArray("passing", this.o, 2);
            passer = pickPlayer(ratios, shooter);
        }

        // Pick the type of shot and store the success rate (with no defense) in probMake and the probability of an and one in probAndOne
        let probAndOne;
        let probMake;
        let probMissAndFoul;
        let type;
        if (this.team[this.o].player[p].compositeRating.shootingThreePointer > 0.5 && Math.random() < (0.35 * this.team[this.o].player[p].compositeRating.shootingThreePointer)) {
            // Three pointer
            type = "threePointer";
            probMissAndFoul = 0.02;
            probMake = this.team[this.o].player[p].compositeRating.shootingThreePointer * 0.35 + 0.24;
            probAndOne = 0.01;
        } else {
            const r1 = Math.random() * this.team[this.o].player[p].compositeRating.shootingMidRange;
            const r2 = Math.random() * (this.team[this.o].player[p].compositeRating.shootingAtRim + this.synergyFactor * (this.team[this.o].synergy.off - this.team[this.d].synergy.def)); // Synergy makes easy shots either more likely or less likely
            const r3 = Math.random() * (this.team[this.o].player[p].compositeRating.shootingLowPost + this.synergyFactor * (this.team[this.o].synergy.off - this.team[this.d].synergy.def)); // Synergy makes easy shots either more likely or less likely
            if (r1 > r2 && r1 > r3) {
                // Two point jumper
                type = "midRange";
                probMissAndFoul = 0.07;
                probMake = this.team[this.o].player[p].compositeRating.shootingMidRange * 0.3 + 0.29;
                probAndOne = 0.05;
            } else if (r2 > r3) {
                // Dunk, fast break or half court
                type = "atRim";
                probMissAndFoul = 0.37;
                probMake = this.team[this.o].player[p].compositeRating.shootingAtRim * 0.3 + 0.52;
                probAndOne = 0.25;
            } else {
                // Post up
                type = "lowPost";
                probMissAndFoul = 0.33;
                probMake = this.team[this.o].player[p].compositeRating.shootingLowPost * 0.3 + 0.37;
                probAndOne = 0.15;
            }
        }

        probMake = (probMake - 0.25 * this.team[this.d].compositeRating.defense + this.synergyFactor * (this.team[this.o].synergy.off - this.team[this.d].synergy.def)) * currentFatigue;

        // Assisted shots are easier
        if (passer >= 0) {
            probMake += 0.025;
        }

        if (this.probBlk() > Math.random()) {
            return this.doBlk(shooter, type); // orb or drb
        }

        // Make
        if (probMake > Math.random()) {
            // And 1
            if (probAndOne > Math.random()) {
                return this.doFg(shooter, passer, type, true); // fg, orb, or drb
            }
            return this.doFg(shooter, passer, type); // fg
        }

        // Miss, but fouled
        if (probMissAndFoul > Math.random()) {
            if (type === "threePointer") {
                return this.doFt(shooter, 3); // fg, orb, or drb
            }
            return this.doFt(shooter, 2); // fg, orb, or drb
        }

        // Miss
        this.recordStat(this.o, p, "fga");
        if (type === "atRim") {
            this.recordStat(this.o, p, "fgaAtRim");
            this.recordPlay("missAtRim", this.o, [this.team[this.o].player[p].name]);
        } else if (type === "lowPost") {
            this.recordStat(this.o, p, "fgaLowPost");
            this.recordPlay("missLowPost", this.o, [this.team[this.o].player[p].name]);
        } else if (type === "midRange") {
            this.recordStat(this.o, p, "fgaMidRange");
            this.recordPlay("missMidRange", this.o, [this.team[this.o].player[p].name]);
        } else if (type === "threePointer") {
            this.recordStat(this.o, p, "tpa");
            this.recordPlay("missTp", this.o, [this.team[this.o].player[p].name]);
        }
        return this.doReb(); // orb or drb
    }

    /**
     * Probability that a shot taken this possession is blocked.
     *
     * @return {number} Probability from 0 to 1.
     */
    probBlk() {
        return 0.1 * this.team[this.d].compositeRating.blocking;
    }

    /**
     * Blocked shot.
     *
     * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
     * @return {string} Output of this.doReb.
     */
    doBlk(shooter, type) {
        const p = this.playersOnCourt[this.o][shooter];
        this.recordStat(this.o, p, "ba");
        this.recordStat(this.o, p, "fga");
        if (type === "atRim") {
            this.recordStat(this.o, p, "fgaAtRim");
        } else if (type === "lowPost") {
            this.recordStat(this.o, p, "fgaLowPost");
        } else if (type === "midRange") {
            this.recordStat(this.o, p, "fgaMidRange");
        } else if (type === "threePointer") {
            this.recordStat(this.o, p, "tpa");
        }

        const ratios = this.ratingArray("blocking", this.d, 4);
        const p2 = this.playersOnCourt[this.d][pickPlayer(ratios)];
        this.recordStat(this.d, p2, "blk");


        if (type === "atRim") {
            this.recordPlay("blkAtRim", this.d, [this.team[this.d].player[p2].name, this.team[this.o].player[p].name]);
        } else if (type === "lowPost") {
            this.recordPlay("blkLowPost", this.d, [this.team[this.d].player[p2].name, this.team[this.o].player[p].name]);
        } else if (type === "midRange") {
            this.recordPlay("blkMidRange", this.d, [this.team[this.d].player[p2].name, this.team[this.o].player[p].name]);
        } else if (type === "threePointer") {
            this.recordPlay("blkTp", this.d, [this.team[this.d].player[p2].name, this.team[this.o].player[p].name]);
        }

        return this.doReb(); // orb or drb
    }

    /**
     * Field goal.
     *
     * Simulate a successful made field goal.
     *
     * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
     * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the passing player, who will get an assist. -1 if no assist.
     * @param {number} type 2 for a two pointer, 3 for a three pointer.
     * @return {string} fg, orb, or drb (latter two are for and ones)
     */
    doFg(shooter, passer, type, andOne) {
        const p = this.playersOnCourt[this.o][shooter];
        this.recordStat(this.o, p, "fga");
        this.recordStat(this.o, p, "fg");
        this.recordStat(this.o, p, "pts", 2); // 2 points for 2's
        if (type === "atRim") {
            this.recordStat(this.o, p, "fgaAtRim");
            this.recordStat(this.o, p, "fgAtRim");
            this.recordPlay(`fgAtRim${andOne ? "AndOne" : ""}`, this.o, [this.team[this.o].player[p].name]);
        } else if (type === "lowPost") {
            this.recordStat(this.o, p, "fgaLowPost");
            this.recordStat(this.o, p, "fgLowPost");
            this.recordPlay(`fgLowPost${andOne ? "AndOne" : ""}`, this.o, [this.team[this.o].player[p].name]);
        } else if (type === "midRange") {
            this.recordStat(this.o, p, "fgaMidRange");
            this.recordStat(this.o, p, "fgMidRange");
            this.recordPlay(`fgMidRange${andOne ? "AndOne" : ""}`, this.o, [this.team[this.o].player[p].name]);
        } else if (type === "threePointer") {
            this.recordStat(this.o, p, "pts"); // Extra point for 3's
            this.recordStat(this.o, p, "tpa");
            this.recordStat(this.o, p, "tp");
            this.recordPlay(`tp${andOne ? "AndOne" : ""}`, this.o, [this.team[this.o].player[p].name]);
        }
        this.recordLastScore(this.o, p, type, this.t);

        if (passer >= 0) {
            const p2 = this.playersOnCourt[this.o][passer];
            this.recordStat(this.o, p2, "ast");
            this.recordPlay("ast", this.o, [this.team[this.o].player[p2].name]);
        }

        if (andOne) {
            return this.doFt(shooter, 1); // fg, orb, or drb
        }
        return "fg";
    }

    /**
     * Probability that a shot taken this possession is assisted.
     *
     * @return {number} Probability from 0 to 1.
     */
    probAst() {
        return 0.6 * (2 + this.team[this.o].compositeRating.passing) / (2 + this.team[this.d].compositeRating.defense);
    }

    checkGameTyingShot() {
        if (this.lastScoringPlay.length === 0) { return; }

        // can assume that the last scoring play tied the game
        const i = this.lastScoringPlay.length - 1;
        const play = this.lastScoringPlay[i];

        let shotType;
        switch (play.type) {
            case "atRim":
            case "lowPost":
            case "midRange":
                shotType = "a basket";
                break;
            case "threePointer":
                shotType = "a three-pointer";
                break;
            case "ft":
                shotType = "a free throw";
                if (i > 0) {
                    const prevPlay = this.lastScoringPlay[i - 1];
                    if (prevPlay.team === play.team) {
                        switch (prevPlay.type) {
                            case "atRim":
                            case "lowPost":
                            case "midRange":
                                shotType = "a three-point play";
                                break;
                            case "threePointer":
                                shotType = "a four-point play";
                                break;
                            case "ft":
                                if (i > 1 && this.lastScoringPlay[i - 2].team === play.team && this.lastScoringPlay[i - 2].type === "ft") {
                                    shotType = "three free throws";
                                } else {
                                    shotType = "two free throws";
                                }
                                break;
                            default:
                        }
                    }
                }
                break;
            default:
        }

        const team = this.team[play.team];
        const player = this.team[play.team].player[play.player];

        let eventText = `<a href="${helpers.leagueUrl(["player", player.id])}">${player.name}</a> made ${shotType}`;
        if (play.time > 0) {
            eventText += ` with ${play.time} seconds remaining`;
        } else {
            eventText += (play.type === "ft" ? ' with no time on the clock' : ' at the buzzer');
        }
        eventText += ` to force ${helpers.overtimeCounter(this.team[0].stat.ptsQtrs.length - 3)} overtime`;

        this.clutchPlays.push({
            type: "playerFeat",
            tempText: eventText,
            showNotification: team.id === g.userTid,
            pids: [player.id],
            tids: [team.id],
        });
    }

    checkGameWinner() {
        if (this.lastScoringPlay.length === 0) { return; }

        const winner = (this.team[0].stat.pts > this.team[1].stat.pts ? 0 : 1);
        const loser = (winner === 0 ? 1 : 0);
        let margin = this.team[winner].stat.pts - this.team[loser].stat.pts;

        // work backwards from last scoring plays, check if any resulted in a tie-break or lead change
        let pts;
        let shotType;
        for (let i = this.lastScoringPlay.length - 1; i >= 0; i--) {
            const play = this.lastScoringPlay[i];
            switch (play.type) {
                case "atRim":
                case "lowPost":
                case "midRange":
                    shotType = "basket";
                    pts = 2;
                    break;
                case "threePointer":
                    shotType = "three-pointer";
                    pts = 3;
                    break;
                case "ft":
                    // Special handling for free throws
                    shotType = "free throw";
                    if (i > 0) {
                        const prevPlay = this.lastScoringPlay[i - 1];
                        if (prevPlay.team === play.team) {
                            switch (prevPlay.type) {
                                // cases where the basket ties the game, and the and-one wins it
                                case "atRim":
                                case "lowPost":
                                case "midRange":
                                    shotType = "three-point play";
                                    break;
                                case "threePointer":
                                    shotType = "four-point play";
                                    break;
                                // case where more than one free throw is needed to take the lead
                                case "ft":
                                    shotType += "s";
                                    break;
                                default:
                            }
                        }
                    }
                    pts = 1;
                    break;
                default:
            }

            margin -= (play.team === winner ? pts : -pts);
            if (margin <= 0) {
                const team = this.team[play.team];
                const player = this.team[play.team].player[play.player];

                let eventText = `<a href="${helpers.leagueUrl(["player", player.id])}">${player.name}</a> made the game-winning ${shotType}`;
                if (play.time > 0) {
                    eventText += ` with ${play.time} seconds remaining`;
                } else {
                    eventText += (play.type === "ft" ? ' with no time on the clock' : ' at the buzzer');
                }
                eventText += ` in ${this.team[winner].stat.pts.toString().charAt(0) === '8' ? 'an' : 'a'} <a href="${helpers.leagueUrl(["game_log", g.teamAbbrevsCache[team.id], g.season, this.id])}">${this.team[winner].stat.pts}-${this.team[loser].stat.pts}</a> win over the ${g.teamNamesCache[this.team[loser].id]}.`;

                this.clutchPlays.push({
                    type: "playerFeat",
                    text: eventText,
                    showNotification: team.id === g.userTid,
                    pids: [player.id],
                    tids: [team.id],
                });
                return;
            }
        }
    }

    recordLastScore(teamnum, playernum, type, time) {
        // only record plays in the fourth quarter or overtime...
        if (this.team[0].stat.ptsQtrs.length < 4) { return; }
        // ...in the last 24 seconds...
        if (time > 0.4) { return; }
        // ...when the lead is 3 or less
        if (Math.abs(this.team[0].stat.pts - this.team[1].stat.pts) > 4) { return; }

        const currPlay = {
            team: teamnum,
            player: playernum,
            type,
            time: Math.floor(time * 600) / 10, // up to 0.1 of a second
        };

        if (this.lastScoringPlay.length === 0) {
            this.lastScoringPlay.push(currPlay);
        } else {
            const lastPlay = this.lastScoringPlay[0];
            if (lastPlay.time !== currPlay.time) { this.lastScoringPlay = []; }
            this.lastScoringPlay.push(currPlay);
        }
    }

    /**
     * Free throw.
     *
     * @param {number} shooter Integer from 0 to 4 representing the index of this.playersOnCourt[this.o] for the shooting player.
     * @param {number} amount Integer representing the number of free throws to shoot
     * @return {string} "fg" if the last free throw is made; otherwise, this.doReb is called and its output is returned.
     */
    doFt(shooter, amount) {
        this.doPf(this.d);
        const p = this.playersOnCourt[this.o][shooter];

        let outcome;
        for (let i = 0; i < amount; i++) {
            this.recordStat(this.o, p, "fta");
            if (Math.random() < this.team[this.o].player[p].compositeRating.shootingFT * 0.3 + 0.6) { // Between 60% and 90%
                this.recordStat(this.o, p, "ft");
                this.recordStat(this.o, p, "pts");
                this.recordPlay("ft", this.o, [this.team[this.o].player[p].name]);
                outcome = "fg";
                this.recordLastScore(this.o, p, "ft", this.t);
            } else {
                this.recordPlay("missFt", this.o, [this.team[this.o].player[p].name]);
                outcome = null;
            }
        }

        if (outcome !== "fg") {
            outcome = this.doReb(); // orb or drb
        }

        return outcome;
    }

    /**
     * Personal foul.
     *
     * @param {number} t Team (0 or 1, this.or or this.d).
     */
    doPf(t) {
        const ratios = this.ratingArray("fouling", t);
        const p = this.playersOnCourt[t][pickPlayer(ratios)];
        this.recordStat(this.d, p, "pf");
        this.recordPlay("pf", this.d, [this.team[this.d].player[p].name]);
        // Foul out
        if (this.team[this.d].player[p].stat.pf >= 6) {
            this.recordPlay("foulOut", this.d, [this.team[this.d].player[p].name]);
            // Force substitutions now
            this.updatePlayersOnCourt();
            this.updateSynergy();
        }
    }

    /**
     * Rebound.
     *
     * Simulates a rebound opportunity (e.g. after a missed shot).
     *
     * @return {string} "drb" for a defensive rebound, "orb" for an offensive rebound, null for no rebound (like if the ball goes out of bounds).
     */
    doReb() {
        let p;
        let ratios;

        if (Math.random() < 0.15) {
            return null;
        }

        if (0.75 * (2 + this.team[this.d].compositeRating.rebounding) / (2 + this.team[this.o].compositeRating.rebounding) > Math.random()) {
            ratios = this.ratingArray("rebounding", this.d);
            p = this.playersOnCourt[this.d][pickPlayer(ratios)];
            this.recordStat(this.d, p, "drb");
            this.recordPlay("drb", this.d, [this.team[this.d].player[p].name]);

            return "drb";
        }

        ratios = this.ratingArray("rebounding", this.o);
        p = this.playersOnCourt[this.o][pickPlayer(ratios)];
        this.recordStat(this.o, p, "orb");
        this.recordPlay("orb", this.o, [this.team[this.o].player[p].name]);

        return "orb";
    }

    /**
     * Generate an array of composite ratings.
     *
     * @param {string} rating Key of this.team[t].player[p].compositeRating to use.
     * @param {number} t Team (0 or 1, this.or or this.d).
     * @param {number=} power Power that the composite rating is raised to after the components are linearly combined by  the weights and scaled from 0 to 1. This can be used to introduce nonlinearities, like making a certain stat more uniform (power < 1) or more unevenly distributed (power > 1) or making a composite rating an inverse (power = -1). Default value is 1.
     * @return {Array.<number>} Array of composite ratings of the players on the court for the given rating and team.
     */
    ratingArray(rating, t, power) {
        power = power !== undefined ? power : 1;

        const array = [0, 0, 0, 0, 0];
        for (let i = 0; i < 5; i++) {
            const p = this.playersOnCourt[t][i];
            array[i] = Math.pow(this.team[t].player[p].compositeRating[rating] * fatigue(this.team[t].player[p].stat.energy), power);
        }

        return array;
    }

    /**
     * Increments a stat (s) for a player (p) on a team (t) by amount (default is 1).
     *
     * @param {number} t Team (0 or 1, this.or or this.d).
     * @param {number} p Integer index of this.team[t].player for the player of interest.
     * @param {string} s Key for the property of this.team[t].player[p].stat to increment.
     * @param {number} amt Amount to increment (default is 1).
     */
    recordStat(t, p, s, amt) {
        amt = amt !== undefined ? amt : 1;
        this.team[t].player[p].stat[s] += amt;
        if (s !== "gs" && s !== "courtTime" && s !== "benchTime" && s !== "energy") {
            this.team[t].stat[s] += amt;
            // Record quarter-by-quarter scoring too
            if (s === "pts") {
                this.team[t].stat.ptsQtrs[this.team[t].stat.ptsQtrs.length - 1] += amt;
                for (let i = 0; i < 2; i++) {
                    for (let j = 0; j < 5; j++) {
                        const k = this.playersOnCourt[i][j];
                        this.team[i].player[k].stat.pm += (i === t ? amt : -amt);
                    }
                }
            }
            if (this.playByPlay !== undefined) {
                this.playByPlay.push({
                    type: "stat",
                    qtr: this.team[t].stat.ptsQtrs.length - 1,
                    t,
                    p,
                    s,
                    amt,
                });
            }
        }
    }

    recordPlay(type, t, names) {
        let texts;
        if (this.playByPlay !== undefined) {
            if (type === "injury") {
                texts = ["{0} was injured!"];
            } else if (type === "tov") {
                texts = ["{0} turned the ball over"];
            } else if (type === "stl") {
                texts = ["{0} stole the ball from {1}"];
            } else if (type === "fgAtRim") {
                texts = ["{0} made a dunk/layup"];
            } else if (type === "fgAtRimAndOne") {
                texts = ["{0} made a dunk/layup and got fouled!"];
            } else if (type === "fgLowPost") {
                texts = ["{0} made a low post shot"];
            } else if (type === "fgLowPostAndOne") {
                texts = ["{0} made a low post shot and got fouled!"];
            } else if (type === "fgMidRange") {
                texts = ["{0} made a mid-range shot"];
            } else if (type === "fgMidRangeAndOne") {
                texts = ["{0} made a mid-range shot and got fouled!"];
            } else if (type === "tp") {
                texts = ["{0} made a three pointer shot"];
            } else if (type === "tpAndOne") {
                texts = ["{0} made a three pointer and got fouled!"];
            } else if (type === "blkAtRim") {
                texts = ["{0} blocked {1}'s dunk/layup"];
            } else if (type === "blkLowPost") {
                texts = ["{0} blocked {1}'s low post shot"];
            } else if (type === "blkMidRange") {
                texts = ["{0} blocked {1}'s mid-range shot"];
            } else if (type === "blkTp") {
                texts = ["{0} blocked {1}'s three pointer"];
            } else if (type === "missAtRim") {
                texts = ["{0} missed a dunk/layup"];
            } else if (type === "missLowPost") {
                texts = ["{0} missed a low post shot"];
            } else if (type === "missMidRange") {
                texts = ["{0} missed a mid-range shot"];
            } else if (type === "missTp") {
                texts = ["{0} missed a three pointer"];
            } else if (type === "orb") {
                texts = ["{0} grabbed the offensive rebound"];
            } else if (type === "drb") {
                texts = ["{0} grabbed the defensive rebound"];
            } else if (type === "ast") {
                texts = ["(assist: {0})"];
            } else if (type === "quarter") {
                texts = [`<b>Start of ${helpers.ordinal(this.team[0].stat.ptsQtrs.length)} quarter</b>`];
            } else if (type === "overtime") {
                texts = [`<b>Start of ${helpers.ordinal(this.team[0].stat.ptsQtrs.length - 4)} overtime period</b>`];
            } else if (type === "ft") {
                texts = ["{0} made a free throw"];
            } else if (type === "missFt") {
                texts = ["{0} missed a free throw"];
            } else if (type === "pf") {
                texts = ["Foul on {0}"];
            } else if (type === "foulOut") {
                texts = ["{0} fouled out"];
            } else if (type === "sub") {
                texts = ["Substitution: {0} for {1}"];
            }

            if (texts) {
                //text = random.choice(texts);
                let text = texts[0];
                if (names) {
                    for (let i = 0; i < names.length; i++) {
                        text = text.replace(`{${i}}`, names[i]);
                    }
                }

                if (type === "ast") {
                    // Find most recent made shot, count assist for it
                    for (let i = this.playByPlay.length - 1; i >= 0; i--) {
                        if (this.playByPlay[i].type === "text") {
                            this.playByPlay[i].text += ` ${text}`;
                            break;
                        }
                    }
                } else {
                    let sec = Math.floor(this.t % 1 * 60);
                    if (sec < 10) {
                        sec = `0${sec}`;
                    }
                    this.playByPlay.push({
                        type: "text",
                        text,
                        t,
                        time: `${Math.floor(this.t)}:${sec}`,
                    });
                }
            } else {
                throw new Error(`No text for ${type}`);
            }
        }
    }
}

export default GameSim;
