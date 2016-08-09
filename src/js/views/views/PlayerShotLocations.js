const React = require('react');
const g = require('../../globals');
const bbgmViewReact = require('../../util/bbgmViewReact');
const getCols = require('../../util/getCols');
const helpers = require('../../util/helpers');
const {DataTable, Dropdown, NewWindowLink, PlayerNameLabels} = require('../components/index');

const PlayerShotLocations = ({season, players = []}) => {
    bbgmViewReact.title(`Player Shot Locations - ${season}`);

    const superCols = [{
        title: '',
        colspan: 6,
    }, {
        title: 'At Rim',
        colspan: 3,
    }, {
        title: 'Low Post',
        colspan: 3,
    }, {
        title: 'Mid-Range',
        colspan: 3,
    }, {
        title: '3PT',
        desc: 'Three-Pointers',
        colspan: 3,
    }];

    const cols = getCols('Name', 'Pos', 'Team', 'GP', 'GS', 'Min', 'M', 'A', '%', 'M', 'A', '%', 'M', 'A', '%', 'M', 'A', '%');

    const rows = players.map(p => {
        return {
            key: p.pid,
            data: [
                <PlayerNameLabels
                    injury={p.injury}
                    pid={p.pid}
                    skills={p.ratings.skills}
                    watch={p.watch}
                >{p.name}</PlayerNameLabels>,
                p.ratings.pos,
                <a href={helpers.leagueUrl(["roster", p.stats.abbrev, season])}>{p.stats.abbrev}</a>,
                p.stats.gp,
                p.stats.gs,
                helpers.round(p.stats.min, 1),
                helpers.round(p.stats.fgAtRim, 1),
                helpers.round(p.stats.fgaAtRim, 1),
                helpers.round(p.stats.fgpAtRim, 1),
                helpers.round(p.stats.fgLowPost, 1),
                helpers.round(p.stats.fgaLowPost, 1),
                helpers.round(p.stats.fgpLowPost, 1),
                helpers.round(p.stats.fgMidRange, 1),
                helpers.round(p.stats.fgaMidRange, 1),
                helpers.round(p.stats.fgpMidRange, 1),
                helpers.round(p.stats.tp, 1),
                helpers.round(p.stats.tpa, 1),
                helpers.round(p.stats.tpp, 1),
            ],
            classNames: {
                info: p.tid === g.userTid,
            },
        };
    });

    return <div>
        <Dropdown view="player_shot_locations" fields={["seasons"]} values={[season]} />
        <h1>Player Shot Locations <NewWindowLink /></h1>

        <p>More: <a href={helpers.leagueUrl(['player_stats', season])}>Main Stats</a> | <a href={helpers.leagueUrl(['player_stat_dists', season])}>Stat Distributions</a></p>

        <DataTable
            cols={cols}
            defaultSort={[5, 'desc']}
            rows={rows}
            pagination={true}
            superCols={superCols}
        />
    </div>;
};

module.exports = PlayerShotLocations;
