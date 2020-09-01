import { PHASE, NO_LOTTERY_DRAFT_TYPES } from "../../common";
import { allStar, draft } from "../core";
import g from "./g";
import helpers from "./helpers";
import local from "./local";
import lock from "./lock";
import toUI from "./toUI";
import type { Option } from "../../common/types";

const updatePlayMenu = async () => {
	if (typeof it === "function") {
		return;
	}

	const autoPlaySeasonsLeft = local.autoPlayUntil
		? local.autoPlayUntil.season - g.get("season")
		: 0;

	const allOptions: {
		[key: string]: {
			id?: string;
			label: string;
			url?: string;
			key?: string;
		};
	} = {
		stop: {
			label: "Stop",
			key: "s",
		},
		day: {
			label: "One day",
			key: "y",
		},
		week: {
			label: "One week",
			key: "w",
		},
		month: {
			label: "One month",
			key: "m",
		},
		untilAllStarGame: {
			label: "Until All-Star Game",
			key: "a",
		},
		viewAllStarSelections: {
			url: helpers.leagueUrl(["all_star_draft"]),
			label: "View All-Star draft",
		},
		untilPlayoffs: {
			label: "Until playoffs",
			key: "y",
		},
		untilEndOfRound: {
			label: "Until end of round",
			key: "w",
		},
		throughPlayoffs: {
			label: "Through playoffs",
			key: "y",
		},
		dayLive: {
			url: helpers.leagueUrl(["live"]),
			label: "One day (live)",
			key: "l",
		},
		weekLive: {
			url: helpers.leagueUrl(["live"]),
			label: "One week (live)",
			key: "l",
		},
		viewDraftLottery: {
			url: helpers.leagueUrl(["draft_lottery"]),
			label: "View draft lottery",
		},
		untilDraft: {
			label: "Until draft",
			key: "y",
		},
		onePick: {
			label: "One pick",
		},
		untilYourNextPick: {
			label: "Until your next pick",
		},
		untilEnd: {
			label: "Until end of draft",
		},
		viewDraft: {
			url: helpers.leagueUrl(["draft"]),
			label: "View draft",
		},
		untilResignPlayers: {
			label: g.get("hardCap")
				? "Re-sign players and sign rookies"
				: "Re-sign players with expiring contracts",
		},
		untilFreeAgency: {
			label: "Until free agency",
			key: "y",
		},
		untilPreseason: {
			label: "Until preseason",
			key: "y",
		},
		untilRegularSeason: {
			label: "Until regular season",
		},
		contractNegotiation: {
			url: helpers.leagueUrl(["negotiation"]),
			label: "Continue contract negotiation",
		},
		contractNegotiationList: {
			url: helpers.leagueUrl(["negotiation"]),
			label: "Continue re-signing players",
		},
		message: {
			url: helpers.leagueUrl(["message"]),
			label: "Read new message",
		},
		newLeague: {
			url: "/new_league",
			label: "Try again in a new league",
		},
		newTeam: {
			url: helpers.leagueUrl(["new_team"]),
			label: "Try again with a new team",
		},
		newTeamGood: {
			url: helpers.leagueUrl(["new_team"]),
			label: "Other teams want to hire you!",
		},
		seasonSummary: {
			url: helpers.leagueUrl(["history"]),
			label: "View season summary",
		},
		stopAuto: {
			label: `Stop auto play (${autoPlaySeasonsLeft} season${
				autoPlaySeasonsLeft === 1 ? "" : "s"
			} left)`,
		},
		expansionDraft: {
			url: helpers.leagueUrl(["expansion_draft"]),
			label: "Continue expansion draft setup",
		},
	};

	let keys: string[] = [];

	if (
		g.get("phase") === PHASE.DRAFT ||
		g.get("phase") === PHASE.FANTASY_DRAFT ||
		g.get("phase") === PHASE.EXPANSION_DRAFT
	) {
		const draftPicks = await draft.getOrder();
		const nextPick = draftPicks[0];

		// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
		if (nextPick && g.get("userTids").includes(nextPick.tid)) {
			keys = ["viewDraft"];
		} else if (draftPicks.some(dp => g.get("userTids").includes(dp.tid))) {
			keys = ["onePick", "untilYourNextPick", "viewDraft"];
		} else {
			keys = ["onePick", "untilEnd", "viewDraft"];
		}
	} else if (g.get("phase") === PHASE.PRESEASON) {
		// Preseason
		keys = ["untilRegularSeason"];
	} else if (
		g.get("phase") === PHASE.REGULAR_SEASON ||
		g.get("phase") === PHASE.AFTER_TRADE_DEADLINE
	) {
		const allStarScheduled = await allStar.futureGameIsAllStar();
		const allStarNext = await allStar.nextGameIsAllStar();
		const untilAllStarGame: string[] = [];

		if (allStarScheduled && !allStarNext) {
			untilAllStarGame.push("untilAllStarGame");
		}

		// Regular season - pre trading deadline
		if (process.env.SPORT === "basketball") {
			keys = [
				"day",
				"dayLive",
				"week",
				"month",
				...untilAllStarGame,
				"untilPlayoffs",
			];
		} else {
			keys = [
				"week",
				"weekLive",
				"month",
				...untilAllStarGame,
				"untilPlayoffs",
			];
		}

		if (allStarNext) {
			keys.unshift("viewAllStarSelections");
		}
	} else if (g.get("phase") === PHASE.PLAYOFFS) {
		// Playoffs
		if (process.env.SPORT === "basketball") {
			keys = ["day", "dayLive", "untilEndOfRound", "throughPlayoffs"];
		} else {
			keys = ["week", "weekLive", "untilEndOfRound", "throughPlayoffs"];
		}

		// If playoff contains no rounds with more than one game, then untilEndOfRound is not needed
		const maxGames = Math.max(...g.get("numGamesPlayoffSeries", "current"));
		if (maxGames <= 1) {
			keys = keys.filter(key => key !== "untilEndOfRound");
		}
	} else if (g.get("phase") === PHASE.DRAFT_LOTTERY) {
		if (g.get("repeatSeason")) {
			keys = ["untilPreseason"];
		}
		if (g.get("draftType") === "freeAgents") {
			// Special case in actions.ts will call the draft phases before this automatically
			keys = ["untilResignPlayers"];
		} else {
			// Offseason - pre draft
			keys = !NO_LOTTERY_DRAFT_TYPES.includes(g.get("draftType"))
				? ["viewDraftLottery", "untilDraft"]
				: ["untilDraft"];
		}

		if (g.get("otherTeamsWantToHire")) {
			keys.push("newTeamGood");
		}
	} else if (g.get("phase") === PHASE.AFTER_DRAFT) {
		// Offseason - post draft
		keys = ["untilResignPlayers"];
	} else if (g.get("phase") === PHASE.RESIGN_PLAYERS) {
		// Offseason - re-sign players
		keys = ["contractNegotiationList", "untilFreeAgency"];
	} else if (g.get("phase") === PHASE.FREE_AGENCY) {
		// Offseason - free agency
		keys = ["day", "week", "untilPreseason"];
	}

	const unreadMessage = await lock.unreadMessage();
	const negotiationInProgress = await lock.negotiationInProgress();

	if (unreadMessage) {
		keys = ["message"];
	}

	if (local.unviewedSeasonSummary) {
		keys = ["seasonSummary"];
	}

	if (lock.get("gameSim")) {
		keys = ["stop"];
	}

	if (negotiationInProgress && g.get("phase") !== PHASE.RESIGN_PLAYERS) {
		keys = ["contractNegotiation"];
	}

	if (g.get("expansionDraft").phase === "protection") {
		keys = ["expansionDraft"];
	}

	if (lock.get("newPhase")) {
		keys = [];
	}

	// If there is an unread message, it's from the owner saying the player is fired, so let the user see that first.
	if (g.get("gameOver") && !unreadMessage) {
		keys = ["newTeam", "newLeague"];
	}

	if (local.autoPlayUntil) {
		keys = ["stopAuto"];
	}

	const someOptions: Option[] = keys.map(id => {
		let code;
		if (allOptions[id].key) {
			// @ts-ignore
			code = `Key${allOptions[id].key.toUpperCase()}`;
		}

		return {
			...allOptions[id],
			code,
			id,
		};
	});

	// Set first key to always be p
	if (someOptions.length > 0) {
		someOptions[0].key = "p";
		someOptions[0].code = "KeyP";
	}

	toUI("updateLocal", [
		{
			playMenuOptions: someOptions,
		},
	]);
};

export default updatePlayMenu;
