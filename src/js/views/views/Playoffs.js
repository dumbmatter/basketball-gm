import React from 'react';
import bbgmViewReact from '../../util/bbgmViewReact';
import {Dropdown, JumpTo, NewWindowLink, PlayoffMatchup} from '../components';

const Playoffs = ({confNames, finalMatchups, matchups, numPlayoffRounds, season, series}) => {
    bbgmViewReact.title(`Playoffs - ${season}`);

    return <div>
        <Dropdown view="playoffs" fields={["seasons"]} values={[season]} />
        <JumpTo season={season} />
        <h1>Playoffs <NewWindowLink /></h1>

        {!finalMatchups ? <p>This is what the playoff matchups would be if the season ended right now.</p> : null}

        {confNames.length === 2 ? <h3 className="hidden-xs">{confNames[1]} <span className="pull-right">{confNames[0]}</span></h3> : null}

        <div className="table-responsive">
            <table className="table-condensed" width="100%">
                <tbody>
                    {matchups.map((row, i) => <tr key={i}>
                        {row.map((m, j) => {
                            return <td key={j} rowSpan={m.rowspan} width={`${100 / (numPlayoffRounds * 2 - 1)}%`}>
                                <PlayoffMatchup
                                    season={season}
                                    series={series[m.matchup[0]][m.matchup[1]]}
                                />
                            </td>;
                        })}
                    </tr>)}
                </tbody>
            </table>
        </div>
    </div>;
};

Playoffs.propTypes = {
    confNames: React.PropTypes.arrayOf(React.PropTypes.string).isRequired,
    finalMatchups: React.PropTypes.bool.isRequired,
    matchups: React.PropTypes.arrayOf(React.PropTypes.arrayOf(React.PropTypes.object)).isRequired,
    numPlayoffRounds: React.PropTypes.number.isRequired,
    season: React.PropTypes.number.isRequired,
    series: React.PropTypes.arrayOf(React.PropTypes.arrayOf(React.PropTypes.object)).isRequired,
};

export default Playoffs;
