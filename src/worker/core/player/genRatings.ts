import { bySport } from "../../../common";
import type { MinimalPlayerRatings } from "../../../common/types";
import genRatingsBasketball from "./genRatings.basketball";
import genRatingsFootball from "./genRatings.football";
import genRatingsHockey from "./genRatings.hockey";

const genRatings = (season: number, scoutingRank: number) => {
	return bySport<{
		heightInInches: number;
		ratings: MinimalPlayerRatings;
	}>({
		basketball: genRatingsBasketball(season, scoutingRank),
		football: genRatingsFootball(season, scoutingRank),
		hockey: genRatingsHockey(season, scoutingRank),
	});
};

export default genRatings;
