import React from 'react';
import g from '../../globals';
import * as freeAgents from '../../core/freeAgents';
import {negotiate} from '../../util/actions';
import bbgmViewReact from '../../util/bbgmViewReact';
import getCols from '../../util/getCols';
import * as helpers from '../../util/helpers';
import {DataTable, HelpPopover, NewWindowLink, PlayerNameLabels} from '../components';

const FreeAgents = ({capSpace, gamesInProgress, minContract, numRosterSpots, phase, players}) => {
    bbgmViewReact.title('Free Agents');

    if (phase >= g.PHASE.AFTER_TRADE_DEADLINE && phase <= g.PHASE.RESIGN_PLAYERS) {
        return <div>
            <h1>Error</h1>
            <p>You're not allowed to sign free agents now.</p>
        </div>;
    }

    const cols = getCols('Name', 'Pos', 'Age', 'Ovr', 'Pot', 'Min', 'Pts', 'Reb', 'Ast', 'PER', 'Asking For', 'Mood', 'Negotiate');

    const rows = players.map(p => {
        let negotiateButton;
        if (freeAgents.refuseToNegotiate(p.contract.amount * 1000, p.freeAgentMood[g.userTid])) {
            negotiateButton = "Refuses!";
        } else {
            negotiateButton = <button
                className="btn btn-default btn-xs"
                disabled={gamesInProgress}
                onClick={() => negotiate(p.pid)}
            >Negotiate</button>;
        }
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
                p.age,
                p.ratings.ovr,
                p.ratings.pot,
                helpers.round(p.stats.min, 1),
                helpers.round(p.stats.pts, 1),
                helpers.round(p.stats.trb, 1),
                helpers.round(p.stats.ast, 1),
                helpers.round(p.stats.per, 1),
                <span>{helpers.formatCurrency(p.contract.amount, "M")} thru {p.contract.exp}</span>,
                <div title={p.mood.text} style={{width: '100%', height: '21px', backgroundColor: p.mood.color}}><span style={{display: 'none'}}>
                    {p.freeAgentMood[g.userTid]}
                </span></div>,
                negotiateButton,
            ],
        };
    });

    return <div>
        <h1>Free Agents <NewWindowLink /></h1>
        <p>More: <a href={helpers.leagueUrl(['upcoming_free_agents'])}>Upcoming Free Agents</a></p>

        <p>You currently have <b>{numRosterSpots}</b> open roster spots and <b>{helpers.formatCurrency(capSpace, 'M')}</b> in cap space. <HelpPopover placement="bottom" title="Cap Space">
            <p>"Cap space" is the difference between your current payroll and the salary cap. You can sign a free agent to any valid contract as long as you don't go over the cap.</p>
            <p>You can only exceed the salary cap to sign free agents to minimum contracts (${minContract}k/year).</p>
        </HelpPopover></p>
        {gamesInProgress ? <p className="text-danger">Stop game simulation to sign free agents.</p> : null}

        <DataTable
            cols={cols}
            defaultSort={[10, 'desc']}
            name="FreeAgents"
            pagination
            rows={rows}
        />
    </div>;
};

FreeAgents.propTypes = {
    capSpace: React.PropTypes.number.isRequired,
    gamesInProgress: React.PropTypes.bool.isRequired,
    minContract: React.PropTypes.number.isRequired,
    numRosterSpots: React.PropTypes.number.isRequired,
    phase: React.PropTypes.number.isRequired,
    players: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
};

export default FreeAgents;
