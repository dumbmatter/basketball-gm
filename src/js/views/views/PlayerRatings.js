const React = require('react');
const g = require('../../globals');
const bbgmViewReact = require('../../util/bbgmViewReact');
const getCols = require('../../util/getCols');
const helpers = require('../../util/helpers');
const {DataTable, Dropdown, JumpTo, NewWindowLink, PlayerNameLabels} = require('../components/index');

const PlayerRatings = ({abbrev, players = [], season}) => {
    bbgmViewReact.title(`Player Ratings - ${season}`);

    const cols = getCols('Name', 'Pos', 'Team', 'Age', 'Country', 'Ovr', 'Pot', 'rating:Hgt', 'rating:Str', 'rating:Spd', 'rating:Jmp', 'rating:End', 'rating:Ins', 'rating:Dnk', 'rating:FT', 'rating:2Pt', 'rating:3Pt', 'rating:Blk', 'rating:Stl', 'rating:Drb', 'rating:Pss', 'rating:Reb');

    const rows = players.map(p => {
        return {
            key: p.pid,
            data: [
                <PlayerNameLabels
                    pid={p.pid}
                    injury={p.injury}
                    skills={p.ratings.skills}
                    watch={p.watch}
                >{p.name}</PlayerNameLabels>,
                p.ratings.pos,
                <a href={helpers.leagueUrl(["roster", p.stats.abbrev, season])}>{p.stats.abbrev}</a>,
                p.age - (g.season - season),
                p.born.loc,
                p.ratings.ovr,
                p.ratings.pot,
                p.ratings.hgt,
                p.ratings.stre,
                p.ratings.spd,
                p.ratings.jmp,
                p.ratings.endu,
                p.ratings.ins,
                p.ratings.dnk,
                p.ratings.ft,
                p.ratings.fg,
                p.ratings.tp,
                p.ratings.blk,
                p.ratings.stl,
                p.ratings.drb,
                p.ratings.pss,
                p.ratings.reb,
            ],
            classNames: {
                danger: p.hof,
                info: p.stats.tid === g.userTid,
            },
        };
    });

    return <div>
        <Dropdown view="player_ratings" fields={["teamsAndAllWatch", "seasons"]} values={[abbrev, season]} />
        <JumpTo season={season} />
        <h1>Player Ratings <NewWindowLink /></h1>

        <p>More: <a href={helpers.leagueUrl(['player_rating_dists', season])}>Rating Distributions</a></p>

        <p>Players on your team are <span className="text-info">highlighted in blue</span>. Players in the Hall of Fame are <span className="text-danger">highlighted in red</span>.</p>

        <DataTable
            cols={cols}
            defaultSort={[5, 'desc']}
            pagination={true}
            rows={rows}
        />
    </div>;
};

module.exports = PlayerRatings;

