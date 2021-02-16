import bySport from "./bySport";
import * as constantsBasketball from "./constants.basketball";
import * as constantsFootball from "./constants.football";
import * as constantsHockey from "./constants.hockey";

import type {
	CompositeWeights,
	Phase,
	DraftType,
	MoodTrait,
	CompositeWeight,
} from "./types";

const ACCOUNT_API_URL =
	process.env.NODE_ENV === "development"
		? "http://account.basketball-gm.test"
		: bySport({
				basketball: "https://account.basketball-gm.com",
				football: "https://account.football-gm.com",
				default: "https://account.zengm.com",
		  });

const DIFFICULTY = {
	Easy: -0.25,
	Normal: 0,
	Hard: 0.25,
	Insane: 1,
};

const MAX_SUPPORTED_LEAGUE_VERSION = 43;

const NO_LOTTERY_DRAFT_TYPES: DraftType[] = [
	"freeAgents",
	"noLottery",
	"noLotteryReverse",
	"random",
];

const PHASE: {
	EXPANSION_DRAFT: Phase;
	FANTASY_DRAFT: Phase;
	PRESEASON: Phase;
	REGULAR_SEASON: Phase;
	AFTER_TRADE_DEADLINE: Phase;
	PLAYOFFS: Phase;
	DRAFT_LOTTERY: Phase;
	DRAFT: Phase;
	AFTER_DRAFT: Phase;
	RESIGN_PLAYERS: Phase;
	FREE_AGENCY: Phase;
} = {
	EXPANSION_DRAFT: -2,
	FANTASY_DRAFT: -1,
	PRESEASON: 0,
	REGULAR_SEASON: 1,
	AFTER_TRADE_DEADLINE: 2,
	PLAYOFFS: 3,
	DRAFT_LOTTERY: 4,
	DRAFT: 5,
	AFTER_DRAFT: 6,
	RESIGN_PLAYERS: 7,
	FREE_AGENCY: 8,
};

const PLAYER = {
	FREE_AGENT: -1,
	UNDRAFTED: -2,
	RETIRED: -3,
	UNDRAFTED_FANTASY_TEMP: -6, // Store current draft class here during fantasy draft

	// THESE ARE OBSOLETE!
	UNDRAFTED_2: -4, // Next year's draft class
	UNDRAFTED_3: -5, // Next next year's draft class
};

const PHASE_TEXT = {
	"-2": "expansion draft",
	"-1": "fantasy draft",
	"0": "preseason",
	"1": "regular season",
	"2": "regular season",
	"3": "playoffs",
	"4": bySport({
		// Would be better to read from g.get("draftType")
		football: "before draft",
		default: "draft lottery",
	}),
	"5": "draft",
	"6": "after draft",
	"7": "re-sign players",
	"8": "free agency",
};

const STRIPE_PUBLISHABLE_KEY =
	process.env.NODE_ENV === "development"
		? "pk_test_Qbz0froGmHLp0dPCwHoYFY08"
		: "pk_live_Dmo7Vs6uSaoYHrFngr4lM0sa";

const COMPOSITE_WEIGHTS = bySport<CompositeWeights>({
	basketball: constantsBasketball.COMPOSITE_WEIGHTS,
	football: constantsFootball.COMPOSITE_WEIGHTS,
	hockey: constantsHockey.COMPOSITE_WEIGHTS,
});

const PLAYER_SUMMARY = bySport<{
	[key: string]: {
		name: string;
		onlyShowIf?: string[];
		stats: string[];
		superCols?: any[];
	};
}>({
	basketball: constantsBasketball.PLAYER_SUMMARY,
	football: constantsFootball.PLAYER_SUMMARY,
	hockey: constantsHockey.PLAYER_SUMMARY,
});

const PLAYER_STATS_TABLES = bySport<{
	[key: string]: {
		name: string;
		onlyShowIf?: string[];
		stats: string[];
		superCols?: any[];
	};
}>({
	basketball: constantsBasketball.PLAYER_STATS_TABLES,
	football: constantsFootball.PLAYER_STATS_TABLES,
	hockey: constantsHockey.PLAYER_STATS_TABLES,
});

const RATINGS = bySport<any[]>({
	basketball: constantsBasketball.RATINGS,
	football: constantsFootball.RATINGS,
	hockey: constantsHockey.RATINGS,
});

const POSITION_COUNTS: {
	[key: string]: number;
} = bySport({
	basketball: constantsBasketball.POSITION_COUNTS,
	football: constantsFootball.POSITION_COUNTS,
	hockey: constantsHockey.POSITION_COUNTS,
});

const POSITIONS = bySport<any[]>({
	basketball: constantsBasketball.POSITIONS,
	football: constantsFootball.POSITIONS,
	hockey: constantsHockey.POSITIONS,
});

const SKILLS: { [key: string]: string } = Object.values(
	bySport<CompositeWeights>({
		basketball: constantsBasketball.COMPOSITE_WEIGHTS,
		football: constantsFootball.COMPOSITE_WEIGHTS,
		hockey: constantsHockey.COMPOSITE_WEIGHTS,
	}),
).reduce((skills: { [key: string]: string }, item: CompositeWeight) => {
	if (item.skill) skills[item.skill.label] = item.skill.description;
	return skills;
}, {});

const TEAM_STATS_TABLES: {
	[key: string]: {
		name: string;
		stats: string[];
		superCols?: any[];
	};
} = bySport({
	basketball: constantsBasketball.TEAM_STATS_TABLES,
	football: constantsFootball.TEAM_STATS_TABLES,
	hockey: constantsHockey.TEAM_STATS_TABLES,
});

const TIME_BETWEEN_GAMES: string = bySport({
	football: "week",
	default: "day",
});

const MOOD_TRAITS: Record<MoodTrait, string> = {
	F: "Fame",
	L: "Loyalty",
	$: "Money",
	W: "Winning",
};

const SIMPLE_AWARDS = bySport<Readonly<string[]>>({
	basketball: constantsBasketball.SIMPLE_AWARDS,
	football: constantsFootball.SIMPLE_AWARDS,
	hockey: constantsHockey.SIMPLE_AWARDS,
});

const AWARD_NAMES = bySport<Record<string, string>>({
	basketball: constantsBasketball.AWARD_NAMES,
	football: constantsFootball.AWARD_NAMES,
	hockey: constantsHockey.AWARD_NAMES,
});

const DEFAULT_CONFS = bySport({
	basketball: constantsBasketball.DEFAULT_CONFS,
	football: constantsFootball.DEFAULT_CONFS,
	hockey: constantsHockey.DEFAULT_CONFS,
});

const DEFAULT_DIVS = bySport({
	basketball: constantsBasketball.DEFAULT_DIVS,
	football: constantsFootball.DEFAULT_DIVS,
	hockey: constantsHockey.DEFAULT_DIVS,
});

const DEFAULT_STADIUM_CAPACITY = bySport({
	basketball: constantsBasketball.DEFAULT_STADIUM_CAPACITY,
	football: constantsFootball.DEFAULT_STADIUM_CAPACITY,
	hockey: constantsHockey.DEFAULT_STADIUM_CAPACITY,
});

const COURT = bySport({
	basketball: "court",
	football: "field",
	hockey: "ice",
});

const EMAIL_ADDRESS = bySport({
	basketball: "commissioner@basketball-gm.com",
	football: "commissioner@football-gm.com",
	hockey: "commissioner@zengm.com",
});

const GAME_ACRONYM = bySport({
	basketball: "BBGM",
	football: "FBGM",
	hockey: "ZGMH",
});

const GAME_NAME = bySport({
	basketball: "Basketball GM",
	football: "Football GM",
	hockey: "ZenGM Hockey",
});

const SUBREDDIT_NAME = bySport({
	basketball: "BasketballGM",
	football: "Football_GM",
	hockey: "ZenGMHockey",
});

const TWITTER_HANDLE = bySport({
	basketball: "basketball_gm",
	football: "FootballGM_Game",
	hockey: "ZenGMGames",
});

const FACEBOOK_USERNAME = bySport({
	basketball: "basketball.general.manager",
	football: "football.general.manager",
	hockey: "ZenGMGames",
});

const SPORT_HAS_REAL_PLAYERS = bySport({
	basketball: true,
	football: false,
	hockey: false,
});

const SPORT_HAS_LEGENDS = bySport({
	basketball: true,
	football: false,
	hockey: false,
});

// For subscribers who have not renewed yet, give them a 3 day grace period before showing ads again, because sometimes it takes a little extra tim for the payment to process
const GRACE_PERIOD = 60 * 60 * 24 * 3;

const TIEBREAKERS = {
	commonOpponentsRecord: "Common opponents record",
	confRecordIfSame: "Conference record (same conf)",
	divRecordIfSame: "Division record (same div)",
	divWinner: "Division winner",
	headToHeadRecord: "Head-to-head record",
	marginOfVictory: "Margin of victory",
	strengthOfVictory: "Strength of victory",
	strengthOfSchedule: "Strength of schedule",
	coinFlip: "Coin flip",
};

export {
	AWARD_NAMES,
	COURT,
	DEFAULT_CONFS,
	DEFAULT_DIVS,
	DEFAULT_STADIUM_CAPACITY,
	ACCOUNT_API_URL,
	DIFFICULTY,
	EMAIL_ADDRESS,
	FACEBOOK_USERNAME,
	GAME_ACRONYM,
	GAME_NAME,
	GRACE_PERIOD,
	MAX_SUPPORTED_LEAGUE_VERSION,
	MOOD_TRAITS,
	NO_LOTTERY_DRAFT_TYPES,
	PHASE,
	PLAYER,
	PHASE_TEXT,
	SPORT_HAS_LEGENDS,
	SPORT_HAS_REAL_PLAYERS,
	STRIPE_PUBLISHABLE_KEY,
	COMPOSITE_WEIGHTS,
	PLAYER_SUMMARY,
	PLAYER_STATS_TABLES,
	RATINGS,
	SIMPLE_AWARDS,
	POSITION_COUNTS,
	POSITIONS,
	SUBREDDIT_NAME,
	TEAM_STATS_TABLES,
	TIEBREAKERS,
	TIME_BETWEEN_GAMES,
	SKILLS,
	TWITTER_HANDLE,
};
