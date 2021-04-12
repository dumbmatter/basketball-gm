import { helpers } from "../../../worker/util";
import { sortFunction } from "./rosterAutoSort.hockey";
import {
	NUM_LINES,
	NUM_PLAYERS_PER_LINE,
} from "../../../common/constants.hockey";

export const getPlayersInLines = <
	T extends {
		ratings: {
			ovrs: Record<string, number>;
			pos: string;
		};
	}
>(
	players: T[],
) => {
	const info = {
		C: {
			selected: [] as T[],
			minLength: NUM_LINES.F * 1,
			sorted: [...players].sort(sortFunction("C")),
		},
		W: {
			selected: [] as T[],
			minLength: NUM_LINES.F * 2,
			sorted: [...players].sort(sortFunction("W")),
		},
		D: {
			selected: [] as T[],
			minLength: NUM_LINES.D * NUM_PLAYERS_PER_LINE.D,
			sorted: [...players].sort(sortFunction("D")),
		},
		G: {
			selected: [] as T[],
			minLength: NUM_LINES.G * NUM_PLAYERS_PER_LINE.G,
			sorted: [...players].sort(sortFunction("G")),
		},
	};

	const maxLength = Math.max(...Object.values(info).map(x => x.minLength));

	// Set starters (in lines)
	const playersUsed = new Set<typeof players[number]>();
	for (let i = 0; i < maxLength; i++) {
		for (const pos of ["G", "C", "D", "W"] as const) {
			const { selected, minLength, sorted } = info[pos];
			if (selected.length >= minLength) {
				continue;
			}

			for (const p of sorted) {
				if (!playersUsed.has(p)) {
					selected.push(p);
					playersUsed.add(p);
					break;
				}
			}
		}
	}

	return info;
};

const ovr = (
	players: {
		ratings: {
			ovrs: Record<string, number>;
			pos: string;
		};
	}[],
	onlyPos?: string,
) => {
	const info = getPlayersInLines(players);

	const ovrs = {
		C: [] as number[],
		W: [] as number[],
		D: [] as number[],
		G: [] as number[],
	};

	for (const pos of helpers.keys(info)) {
		const { selected, minLength } = info[pos];
		ovrs[pos] = selected.map(p => p.ratings.ovrs[pos]);

		// Pad to minimum lengths
		while (ovrs[pos].length < minLength) {
			ovrs[pos].push(20);
		}
	}

	const aggregated = {
		C: (ovrs.C[0] + ovrs.C[1] + ovrs.C[2] + 0.5 * ovrs.C[3]) / 3.5,
		W:
			(ovrs.W[0] +
				ovrs.W[1] +
				ovrs.W[2] +
				ovrs.W[3] +
				ovrs.W[4] +
				ovrs.W[5] +
				0.5 * ovrs.W[6] +
				0.5 * ovrs.W[7]) /
			7,
		D:
			(ovrs.D[0] + ovrs.D[1] + ovrs.D[2] + ovrs.D[3] + ovrs.D[4] + ovrs.D[5]) /
			6,
		G: ovrs.G[0],
	};

	for (const pos of helpers.keys(aggregated)) {
		if (onlyPos !== pos && onlyPos !== undefined) {
			aggregated[pos] = 0;
		}
	}

	// See analysis/team-ovr-hockey - divide by 10 due to quarter length in that data
	const predictedMOV =
		-6.786793385826883 +
		0.033908896 * aggregated.C +
		0.032181329 * aggregated.W +
		0.032837313 * aggregated.D +
		0.022552802 * aggregated.G;

	if (onlyPos) {
		// In this case, we're ultimately using the value to compute a rank, so we don't care about the scale. And bounding the scale to be positive below makes it always 0.
		return predictedMOV;
	}

	// Translate from -0.9/0.9 to 0/100 scale
	const rawOVR = (predictedMOV * 100) / 1.8 + 50;
	return helpers.bound(Math.round(rawOVR), 0, Infinity);
};

export default ovr;
