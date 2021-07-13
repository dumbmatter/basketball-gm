import { toUI } from "../../util";
import type {
	GameAttributesLeagueWithHistory,
	GameAttributesLeague,
} from "../../../common/types";
import { unwrapGameAttribute } from "../../../common";

const gameAttributesToUI = async (
	gameAttributes: GameAttributesLeagueWithHistory,
) => {
	// Keep in sync with ui/util/local.ts
	const keys = [
		"challengeNoRatings",
		"godMode",
		"hideDisabledTeams",
		"homeCourtAdvantage",
		"lid",
		"spectator",
		"phase",
		"season",
		"startingSeason",
		"teamInfoCache",
		"userTid",
		"userTids",
	] as const;

	const update: Partial<GameAttributesLeague> = {};
	let updated = false;
	for (const key of keys) {
		if (gameAttributes.hasOwnProperty(key)) {
			(update as any)[key] = unwrapGameAttribute(gameAttributes, key);
			updated = true;
		}
	}

	if (updated) {
		await toUI("setGameAttributes", [update]);
	}
};

export default gameAttributesToUI;
