const React = require('react');
const g = require('../../globals');
const bbgmViewReact = require('../../util/bbgmViewReact');
const getCols = require('../../util/getCols');
const helpers = require('../../util/helpers');
const {DataTable, Dropdown, NewWindowLink, PlayerNameLabels} = require('../components/index');

const PlayerFeats = ({abbrev, feats = [], playoffs, season}) => {
    bbgmViewReact.title('Statistical Feats');

    const superCols = [{
        title: '',
        colspan: 5,
    }, {
        title: 'FG',
        desc: 'Field Goals',
        colspan: 3,
    }, {
        title: '3PT',
        desc: 'Three-Pointers',
        colspan: 3,
    }, {
        title: 'FT',
        desc: 'Free Throws',
        colspan: 3,
    }, {
        title: 'Reb',
        desc: 'Rebounds',
        colspan: 3,
    }, {
        title: '',
        colspan: 11,
    }];

    const cols = getCols('Name', 'Pos', 'Team', 'GS', 'Min', 'M', 'A', '%', 'M', 'A', '%', 'M', 'A', '%', 'Off', 'Def', 'Tot', 'Ast', 'TO', 'Stl', 'Blk', 'PF', 'Pts', 'GmSc', 'Opp', 'Result', 'Season');

    const rows = feats.map(p => {
        const abbrev = g.teamAbbrevsCache[p.tid];
        const oppAbbrev = g.teamAbbrevsCache[p.oppTid];

        return {
            key: p.fid,
            data: [
                <PlayerNameLabels
                    injury={p.injury}
                    pid={p.pid}
                    watch={p.watch}
                >{p.name}</PlayerNameLabels>,
                p.pos,
                <a href={helpers.leagueUrl(["roster", abbrev, p.season])}>{abbrev}</a>,
                p.stats.gs,
                helpers.round(p.stats.min, 1),
                p.stats.fg,
                p.stats.fga,
                helpers.round(p.stats.fgp, 1),
                p.stats.tp,
                p.stats.tpa,
                helpers.round(p.stats.tpp, 1),
                p.stats.ft,
                p.stats.fta,
                helpers.round(p.stats.ftp, 1),
                p.stats.orb,
                p.stats.drb,
                p.stats.trb,
                p.stats.ast,
                p.stats.tov,
                p.stats.stl,
                p.stats.blk,
                p.stats.pf,
                p.stats.pts,
                helpers.gameScore(p.stats),
                <a href={helpers.leagueUrl(["roster", oppAbbrev, p.season])}>{oppAbbrev}</a>,
                <a href={helpers.leagueUrl(["game_log", abbrev, p.season, p.gid])}>{p.won ? 'W' : 'L'} {p.score}</a>,
                p.season,
            ],
            classNames: {
                info: p.pid === g.userTid,
            },
        };
    });

    return <div>
        <Dropdown view="player_feats" fields={["teamsAndAll", "seasonsAndAll", "playoffs"]} values={[abbrev, season, playoffs]} />
        <h1>Statistical Feats <NewWindowLink /></h1>

        <p>All games where a player got a triple double, a 5x5, 50 points, 25 rebounds, 20 assists, 10 steals, 10 blocks, or 10 threes are listed here (if you change game length in God Mode, the cuttoffs are scaled). Statistical feats from your players are <span className="text-info">highlighted in blue</span>.</p>

        <DataTable
            cols={cols}
            defaultSort={[23, 'desc']}
            rows={rows}
            pagination={true}
            superCols={superCols}
        />
    </div>;
};

module.exports = PlayerFeats;
