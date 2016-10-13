import g from '../globals';
import * as team from '../core/team';
import bbgmViewReact from '../util/bbgmViewReact';
import * as helpers from '../util/helpers';
import TeamShotLocations from './views/TeamShotLocations';

function get(ctx) {
    return {
        season: helpers.validateSeason(ctx.params.season),
    };
}

async function updateTeams(inputs, updateEvents, state) {
    if (updateEvents.indexOf("dbChange") >= 0 || (inputs.season === g.season && (updateEvents.indexOf("gameSim") >= 0 || updateEvents.indexOf("playerMovement") >= 0)) || inputs.season !== state.season) {
        const teams = await team.filter({
            attrs: ["abbrev", "tid"],
            seasonAttrs: ["won", "lost"],
            stats: ["gp", "fgAtRim", "fgaAtRim", "fgpAtRim", "fgLowPost", "fgaLowPost", "fgpLowPost", "fgMidRange", "fgaMidRange", "fgpMidRange", "tp", "tpa", "tpp"],
            season: inputs.season,
        });

        return {
            season: inputs.season,
            teams,
        };
    }
}

export default bbgmViewReact.init({
    id: "teamShotLocations",
    get,
    runBefore: [updateTeams],
    Component: TeamShotLocations,
});
