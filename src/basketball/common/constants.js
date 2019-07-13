// @flow

import type { CompositeWeights } from "../../deion/common/types";
import type { RatingKey } from "./types";

const COMPOSITE_WEIGHTS: CompositeWeights<RatingKey> = {
    pace: {
        ratings: ["spd", "jmp", "dnk", "tp", "drb", "pss"],
    },
    usage: {
        ratings: ["ins", "spd", "pss", "fg", "dnk", "oiq", "tp", "hgt"],
        weights: [1.5, 0.4, 0.1, 0.6, 0.3, 0.5, 0.6, 0.3],
    },
    dribbling: {
        ratings: ["drb", "spd"],
        weights: [1, 1],
        skill: {
            label: "B",
            cutoff: 0.68,
        },
    },
    passing: {
        ratings: ["spd", "pss", "ins", "oiq", "drb"],
        weights: [0.1, 1, 0.75, 0.3, 0.1],
        skill: {
            label: "Ps",
            cutoff: 0.63,
        },
    },
    turnovers: {
        ratings: [50, "ins", "pss", "hgt", "oiq"],
        weights: [0.5, 0.3, 0.5, 0.1, -1],
    },
    shootingAtRim: {
        ratings: ["hgt", "spd", "dnk", "stre", "fg", "jmp"],
        weights: [0.75, 0.2, 0.3, 0.3, 0.2, 0.5],
    },
    shootingLowPost: {
        ratings: ["hgt", "stre", "spd", "ins", "oiq", "fg"],
        weights: [2, 1, 0.2, 1, 0.3, 0.4],
        skill: {
            label: "Po",
            cutoff: 0.61,
        },
    },
    shootingMidRange: {
        ratings: [
            "oiq",
            "fg",
            "drb",
            "hgt",
            "stre",
            "reb",
            "tp",
            "ft",
            "pss",
            "ins",
            "dnk",
        ],
        weights: [-0.5, 1, 0.6, 0.5, 0.3, 0.15, -0.1, -0.1, -0.2, -0.1, -0.1],
    },
    shootingThreePointer: {
        ratings: ["oiq", "tp", "spd", "ft"],
        weights: [0.2, 1, 0.05, 0.2],
        skill: {
            label: "3",
            cutoff: 0.59,
        },
    },
    shootingFT: {
        ratings: ["ft"],
    },
    rebounding: {
        ratings: [
            "ins",
            "hgt",
            "stre",
            "tp",
            "reb",
            "oiq",
            "diq",
            "jmp",
            "dnk",
        ],
        weights: [0.6, 1.5, 0.3, -0.1, 2, 0.3, 0.3, 0.2, -0.2],
        skill: {
            label: "R",
            cutoff: 0.61,
        },
    },
    stealing: {
        ratings: [50, "spd", "diq", "stre", "dnk"],
        weights: [1, 0.8, 2, 0.2, -0.1],
    },
    blocking: {
        ratings: ["hgt", "jmp", "diq", "stre"],
        weights: [2.5, 1.5, 0.5, 0.5],
    },
    fouling: {
        ratings: [50, "hgt", "diq", "spd", "reb"],
        weights: [3, 1, -0.3, -1, -0.6],
    },
    drawingFouls: {
        ratings: ["ins", "ft", "drb", "dnk", "oiq", "hgt"],
        weights: [0.5, -0.5, 0.6, 1, 0.3, 0.5],
    },
    defense: {
        ratings: ["hgt", "stre", "spd", "jmp", "diq"],
        weights: [1, 1, 1, 0.5, 2],
    },
    defenseInterior: {
        ratings: ["hgt", "stre", "spd", "jmp", "diq"],
        weights: [2.5, 1, 0.5, 0.5, 2],
        skill: {
            label: "Di",
            cutoff: 0.57,
        },
    },
    defensePerimeter: {
        ratings: ["hgt", "stre", "spd", "jmp", "diq"],
        weights: [0.5, 0.5, 2, 0.5, 1],
        skill: {
            label: "Dp",
            cutoff: 0.61,
        },
    },
    endurance: {
        ratings: [50, "endu"],
        weights: [1, 1],
    },
    athleticism: {
        ratings: ["stre", "spd", "jmp", "hgt"],
        weights: [1, 1, 1, 0.75],
        skill: {
            label: "A",
            cutoff: 0.63,
        },
    },
};

const PLAYER_STATS_TABLES = {
    regular: {
        name: "Stats",
        stats: [
            "gp",
            "gs",
            "min",
            "fg",
            "fga",
            "fgp",
            "tp",
            "tpa",
            "tpp",
            "ft",
            "fta",
            "ftp",
            "orb",
            "drb",
            "trb",
            "ast",
            "tov",
            "stl",
            "blk",
            "ba",
            "pf",
            "pts",
        ],
    },
    advanced: {
        name: "Advanced",
        stats: [
            "gp",
            "gs",
            "min",
            "per",
            "ewa",
            "ortg",
            "drtg",
            "ows",
            "dws",
            "ws",
            "ws48",
            "tsp",
            "tpar",
            "ftr",
            "orbp",
            "drbp",
            "trbp",
            "astp",
            "stlp",
            "blkp",
            "tovp",
            "usgp",
            "pm",
        ],
    },
};

const TEAM_STATS_TABLES = {
    team: {
        name: "Team",
        stats: [
            "fg",
            "fga",
            "fgp",
            "tp",
            "tpa",
            "tpp",
            "ft",
            "fta",
            "ftp",
            "orb",
            "drb",
            "trb",
            "ast",
            "tov",
            "stl",
            "blk",
            "pf",
            "pts",
            "mov",
        ],
    },
    opponent: {
        name: "Opponent",
        stats: [
            "oppFg",
            "oppFga",
            "oppFgp",
            "oppTp",
            "oppTpa",
            "oppTpp",
            "oppFt",
            "oppFta",
            "oppFtp",
            "oppOrb",
            "oppDrb",
            "oppTrb",
            "oppAst",
            "oppTov",
            "oppStl",
            "oppBlk",
            "oppPf",
            "oppPts",
            "oppMov",
        ],
    },
    advanced: {
        name: "Advanced",
        stats: ["pw", "pl", "ortg", "drtg", "nrtg", "pace", "tpar", "ftr"],
    },
};

const POSITIONS = ["PG", "G", "SG", "GF", "SF", "F", "PF", "FC", "C"];

const POSITION_COUNTS = {};

const RATINGS: RatingKey[] = [
    "hgt",
    "stre",
    "spd",
    "jmp",
    "endu",
    "ins",
    "dnk",
    "ft",
    "fg",
    "tp",
    "oiq",
    "diq",
    "drb",
    "pss",
    "reb",
];

const TIME_BETWEEN_GAMES = "day";

export {
    COMPOSITE_WEIGHTS,
    PLAYER_STATS_TABLES,
    POSITION_COUNTS,
    POSITIONS,
    RATINGS,
    TEAM_STATS_TABLES,
    TIME_BETWEEN_GAMES,
};
