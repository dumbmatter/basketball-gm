import { g, helpers } from "../util";
import getTeamInfos from "../../common/getTeamInfos";
import type { ExpansionDraftSetupTeam } from "../../common/types";
import { idb } from "../db";
import orderBy from "lodash/orderBy";
import getUnusedAbbrevs from "../../common/getUnusedAbbrevs";

const updateExpansionDraft = async () => {
	const expansionDraft = g.get("expansionDraft");
	if (expansionDraft.phase === "protection") {
		// https://stackoverflow.com/a/59923262/786644
		const returnValue = {
			redirectUrl: helpers.leagueUrl(["protect_players"]),
		};
		return returnValue;
	} else if (expansionDraft.phase === "draft") {
		// https://stackoverflow.com/a/59923262/786644
		const returnValue = {
			redirectUrl: helpers.leagueUrl(["draft"]),
		};
		return returnValue;
	}

	const currentTeams = g.get("teamInfoCache");
	const allAbbrevs = getUnusedAbbrevs(currentTeams);

	const divs = g.get("divs", "current");
	const div = divs[divs.length - 1];
	const param = allAbbrevs.map(abbrev => ({
		tid: -1,
		cid: div.cid,
		did: div.did,
		abbrev,
	}));

	const builtInTeams: ExpansionDraftSetupTeam[] = getTeamInfos(param).map(
		t => ({
			abbrev: t.abbrev,
			region: t.region,
			name: t.name,
			imgURL: t.imgURL,
			colors: t.colors,
			pop: String(t.pop),
			stadiumCapacity: String(g.get("defaultStadiumCapacity")),
			did: String(t.did),
			takeControl: false,
		}),
	);

	const disabledTeams = (await idb.cache.teams.getAll()).filter(
		t => t.disabled,
	);
	for (const t of disabledTeams) {
		builtInTeams.push({
			abbrev: t.abbrev,
			region: t.region,
			name: t.name,
			imgURL: t.imgURL,
			colors: t.colors,
			pop: String(t.pop ?? 1),
			stadiumCapacity: String(
				t.stadiumCapacity !== undefined
					? t.stadiumCapacity
					: g.get("defaultStadiumCapacity"),
			),
			did: String(t.did),
			takeControl: false,
			tid: t.tid,
		});
	}

	const initialTeams = expansionDraft.teams ?? [];
	const initialNumPerTeam =
		expansionDraft.numPerTeam ??
		String(
			helpers.getExpansionDraftMinimumPlayersPerActiveTeam(
				initialTeams.length,
				g.get("minRosterSize"),
				g.get("numActiveTeams"),
			),
		);

	return {
		builtInTeams: orderBy(builtInTeams, ["region", "name", "tid"]),
		confs: g.get("confs"),
		divs: g.get("divs"),
		godMode: g.get("godMode"),
		initialTeams,
		initialNumPerTeam,
		initialNumProtectedPlayers:
			expansionDraft.numProtectedPlayers ?? String(g.get("minRosterSize")),
		minRosterSize: g.get("minRosterSize"),
		multiTeamMode: g.get("userTids").length > 1,
		numActiveTeams: g.get("numActiveTeams"),
		phase: g.get("phase"),
	};
};

export default updateExpansionDraft;
