import React from 'react';
import bbgmViewReact from '../../util/bbgmViewReact';
import getCols from '../../util/getCols';
import * as helpers from '../../util/helpers';
import {DataTable, Dropdown, NewWindowLink, PlayerNameLabels} from '../components';

const UpcomingFreeAgents = ({players, season}) => {
    bbgmViewReact.title('Upcoming Free Agents');

    const cols = getCols('Name', 'Pos', 'Age', 'Ovr', 'Pot', 'Min', 'Pts', 'Reb', 'Ast', 'PER', 'Current Contract', 'Desired Contract');

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
                p.age,
                p.ratings.ovr,
                p.ratings.pot,
                helpers.round(p.stats.min, 1),
                helpers.round(p.stats.pts, 1),
                helpers.round(p.stats.trb, 1), helpers.round(p.stats.ast, 1),
                helpers.round(p.stats.per, 1),
                <span>{helpers.formatCurrency(p.contract.amount, 'M')} thru {p.contract.exp}</span>,
                <span>{helpers.formatCurrency(p.contractDesired.amount, 'M')} thru {p.contractDesired.exp}</span>,
            ],
        };
    });

    return <div>
        <Dropdown view="upcoming_free_agents" fields={["seasonsUpcoming"]} values={[season]} />
        <h1>Upcoming Free Agents <NewWindowLink /></h1>
        <p>More: <a href={helpers.leagueUrl(['free_agents'])}>Current Free Agents</a></p>

        <p>Keep in mind that many of these players will choose to re-sign with their current team rather than become free agents.</p>

        <DataTable
            cols={cols}
            defaultSort={[3, 'desc']}
            name="UpcomingFreeAgents"
            rows={rows}
            pagination
        />
    </div>;
};

UpcomingFreeAgents.propTypes = {
    players: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    season: React.PropTypes.number.isRequired,
};

export default UpcomingFreeAgents;
