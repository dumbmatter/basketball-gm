const React = require('react');
const g = require('../../globals');
const helpers = require('../../util/helpers');

const PlayoffMatchup = ({season, series}) => {
    if (!series || !series.home || !series.home.tid) {
        return null;
    }

    const homeWon = series.home.hasOwnProperty("won") && series.home.won === 4;
    const awayWon = series.away.hasOwnProperty("won") && series.away.won === 4;

    return <div>
        <span className={series.home.tid === g.userTid ? 'bg-info' : ''} style={{fontWeight: homeWon ? 'bold' : 'normal'}}>
            {series.home.seed}. <a href={helpers.leagueUrl(["roster", g.teamAbbrevsCache[series.home.tid], season])}>{g.teamRegionsCache[series.home.tid]}</a>
            {series.home.hasOwnProperty("won") ? <span> {series.home.won}</span> : null }
        </span>
        <br />

        <span className={series.away.tid === g.userTid ? 'bg-info' : ''} style={{fontWeight: awayWon ? 'bold' : 'normal'}}>
            {series.away.seed}. <a href={helpers.leagueUrl(["roster", g.teamAbbrevsCache[series.away.tid], season])}>{g.teamRegionsCache[series.away.tid]}</a>
            {series.away.hasOwnProperty("won") ? <span> {series.away.won}</span> : null }
        </span>
    </div>;
};

module.exports = PlayoffMatchup;
