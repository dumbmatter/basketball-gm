import classNames from 'classnames';
import React from 'react';
import g from '../../globals';
import * as ui from '../../ui';
import * as league from '../../core/league';
import * as trade from '../../core/trade';
import bbgmViewReact from '../../util/bbgmViewReact';
import getCols from '../../util/getCols';
import * as helpers from '../../util/helpers';
import {DataTable, NewWindowLink, PlayerNameLabels} from '../components';

const genRows = (players, handleChangeAsset) => {
    return players.map(p => {
        return {
            key: p.pid,
            data: [
                <input type="checkbox" value={p.pid} title={p.untradableMsg} checked={p.selected} disabled={p.untradable} onChange={() => handleChangeAsset(p.pid)} />,
                <PlayerNameLabels injury={p.injury} pid={p.pid} skills={p.ratings.skills} watch={p.watch}>{p.name}</PlayerNameLabels>,
                p.ratings.pos,
                p.age,
                p.ratings.ovr,
                p.ratings.pot,
                <span>{helpers.formatCurrency(p.contract.amount, "M")} thru {p.contract.exp}</span>,
                helpers.round(p.stats.min, 1),
                helpers.round(p.stats.pts, 1),
                helpers.round(p.stats.trb, 1),
                helpers.round(p.stats.ast, 1),
                helpers.round(p.stats.per, 1),
            ],
        };
    });
};

class Trade extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            accepted: false,
            asking: false,
            askMessage: null,
            forceTrade: false,
            message: null,
        };
        this.handleChangeTeam = this.handleChangeTeam.bind(this);
        this.handleClickAsk = this.handleClickAsk.bind(this);
        this.handleClickClear = this.handleClickClear.bind(this);
        this.handleClickForceTrade = this.handleClickForceTrade.bind(this);
        this.handleClickPropose = this.handleClickPropose.bind(this);
    }

    async handleChangeAsset(type, id) {
        this.setState({
            message: null,
        });

        const ids = {
            'user-pids': this.props.userPids,
            'user-dpids': this.props.userDpids,
            'other-pids': this.props.otherPids,
            'other-dpids': this.props.otherDpids,
        };

        if (ids[type].includes(id)) {
            ids[type] = ids[type].filter(currId => currId !== id);
        } else {
            ids[type].push(id);
        }

        const teams = [{
            tid: g.userTid,
            pids: ids['user-pids'],
            dpids: ids['user-dpids'],
        }, {
            tid: this.props.otherTid,
            pids: ids['other-pids'],
            dpids: ids['other-dpids'],
        }];
        await trade.updatePlayers(teams);

        ui.realtimeUpdate();
        league.updateLastDbChange();
    }

    async handleChangeTeam(event) {
        this.setState({
            message: null,
        });

        const otherTid = g.teamAbbrevsCache.indexOf(event.target.value);
        console.log(event.target.value, otherTid);

        const teams = [{
            tid: g.userTid,
            pids: this.props.userPids,
            dpids: this.props.userDpids,
        }, {
            tid: otherTid,
            pids: [],
            dpids: [],
        }];
        await trade.create(teams);

        ui.realtimeUpdate();
        league.updateLastDbChange();
    }

    async handleClickAsk() {
        this.setState({
            asking: true,
            message: null,
        });

        const message = await trade.makeItWorkTrade();

        this.setState({
            asking: false,
            message,
        });

        ui.realtimeUpdate();
        league.updateLastDbChange();
    }

    async handleClickClear() {
        this.setState({
            message: null,
        });

        await trade.clear();

        ui.realtimeUpdate();
        league.updateLastDbChange();
    }

    handleClickForceTrade() {
        this.setState({
            forceTrade: !this.state.forceTrade,
        });
    }

    async handleClickPropose() {
        const [accepted, message] = await trade.propose(this.state.forceTrade);

        this.setState({
            accepted,
            message,
        });

        ui.realtimeUpdate();
        league.updateLastDbChange();
    }

    render() {
        const {gameOver, godMode, lost, otherDpids, otherPicks, otherRoster, otherTid, phase, salaryCap, summary, showResigningMsg, strategy, teams, userDpids, userPicks, userRoster, userTeamName, won} = this.props;

        bbgmViewReact.title('Trade');

        if ((phase >= g.PHASE.AFTER_TRADE_DEADLINE && phase <= g.PHASE.PLAYOFFS) || phase === g.PHASE.FANTASY_DRAFT || gameOver) {
            return <div>
                <h1>Error</h1>
                <p>You're not allowed to make trades now.</p>
            </div>;
        }

        const cols = getCols('', 'Name', 'Pos', 'Age', 'Ovr', 'Pot', 'Contract', 'Min', 'Pts', 'Reb', 'Ast', 'PER');
        cols[0].sortSequence = [];
        const otherRows = genRows(otherRoster, pid => this.handleChangeAsset('other-pids', pid));
        const userRows = genRows(userRoster, pid => this.handleChangeAsset('user-pids', pid));

        return <div>
            <h1>Trade <NewWindowLink /></h1>

            {showResigningMsg ? <p>You can't trade players whose contracts expired this season, but their old contracts still count against team salary caps until they are either re-signed or become free agents.</p> : null}

            <p>If a player has been signed within the past 15 games, he is not allowed to be traded.</p>

            <div className="row">
                <div className="col-md-9">
                    <form id="rosters" className="form-inline">
                        <select className="form-control select-team" style={{marginBottom: '6px'}} value={g.teamAbbrevsCache[otherTid]} onChange={this.handleChangeTeam}>
                            {teams.map(t => <option key={t.abbrev} value={t.abbrev}>
                                {t.region} {t.name}
                            </option>)}
                        </select>
                        <p>{won}-{lost}, {strategy}</p>
                        <DataTable
                            cols={cols}
                            defaultSort={[5, 'desc']}
                            name="Trade:Other"
                            rows={otherRows}
                        />
                        <div className="table-responsive">
                            <table className="table table-striped table-bordered table-condensed">
                                <thead>
                                    <tr><th /><th width="100%">Draft Picks</th></tr>
                                </thead>
                                <tbody>
                                    {otherPicks.map(pick => <tr key={pick.dpid}>
                                        <td>
                                            <input name="other-dpids" type="checkbox" value={pick.dpid} checked={otherDpids.includes(pick.dpid)} onChange={() => this.handleChangeAsset('other-dpids', pick.dpid)} />
                                        </td>
                                        <td>{pick.desc}</td>
                                    </tr>)}
                                </tbody>
                            </table>
                        </div>

                        <h2>{userTeamName}</h2>
                        <DataTable
                            cols={cols}
                            defaultSort={[5, 'desc']}
                            name="Trade:User"
                            rows={userRows}
                        />
                        <div className="table-responsive">
                            <table className="table table-striped table-bordered table-condensed">
                                <thead>
                                    <tr><th /><th width="100%">Draft Picks</th></tr>
                                </thead>
                                <tbody>
                                    {userPicks.map(pick => <tr key={pick.dpid}>
                                        <td>
                                            <input name="user-dpids" type="checkbox" value={pick.dpid} checked={userDpids.includes(pick.dpid)} onChange={() => this.handleChangeAsset('user-dpids', pick.dpid)} />
                                        </td>
                                        <td>{pick.desc}</td>
                                    </tr>)}
                                </tbody>
                            </table>
                        </div>
                    </form>
                </div>
                <div className="col-md-3 trade-summary">
                    <h3>Trade Summary</h3>
                    <div className="row">
                        {summary.teams.map((t, i) => <div key={i} className="col-md-12 col-xs-6">
                            <h4>{t.name}</h4>
                            <h5>Trade Away:</h5>
                            <ul className="list-unstyled">
                                {t.trade.map(p => <li key={`p${p.pid}`}>
                                    <a href={helpers.leagueUrl(['player', p.pid])}>{p.name}</a> ({helpers.formatCurrency(p.contract.amount, 'M')})
                                </li>)}
                                {t.picks.map(pick => <li key={pick.dpid}>{pick.desc}</li>)}
                                <li>{helpers.formatCurrency(t.total, 'M')} Total</li>
                            </ul>
                            <h5>Receive:</h5>
                            <ul className="list-unstyled">
                                {summary.teams[t.other].trade.map(p => <li key={`p${p.pid}`}>
                                    <a href={helpers.leagueUrl(['player', p.pid])}>{p.name}</a> ({helpers.formatCurrency(p.contract.amount, 'M')})
                                </li>)}
                                {summary.teams[t.other].picks.map(pick => <li key={pick.dpid}>{pick.desc}</li>)}
                                <li>{helpers.formatCurrency(summary.teams[t.other].total, 'M')} Total</li>
                            </ul>
                            <h5>Payroll after trade: {helpers.formatCurrency(t.payrollAfterTrade, 'M')}</h5>
                            <h5>Salary cap: {helpers.formatCurrency(salaryCap, 'M')}</h5>
                        </div>)}
                    </div>

                    <br />

                    {summary.warning ? <p className="alert alert-danger"><strong>Warning!</strong> {summary.warning}</p> : null}
                    {this.state.message ? <p className={classNames('alert', this.state.accepted ? 'alert-success' : 'alert-info')}>{this.state.message}</p> : null}

                    <center>
                        {godMode ? <label className="god-mode god-mode-text"><input type="checkbox" onClick={this.handleClickForceTrade} value={this.state.forceTrade} />Force Trade</label> : null}<br />
                        <button type="submit" className="btn btn-large btn-primary" disabled={!summary.enablePropose && !this.state.forceTrade} onClick={this.handleClickPropose} style={{margin: '5px 5px 5px 0'}}>Propose Trade</button>
                        <button type="submit" className="btn" disabled={this.state.asking} onClick={this.handleClickAsk} style={{margin: '5px 5px 5px 0'}}>
                            {this.state.asking ? 'Waiting for answer...' : 'What would make this deal work?'}
                        </button>
                        <button type="submit" className="btn" onClick={this.handleClickClear} style={{margin: '5px 5px 5px 0'}}>Clear Trade</button>
                    </center>
                </div>
            </div>
        </div>;
    }
}

Trade.propTypes = {
    gameOver: React.PropTypes.bool.isRequired,
    godMode: React.PropTypes.bool.isRequired,
    lost: React.PropTypes.number.isRequired,
    otherDpids: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
    otherPicks: React.PropTypes.array.isRequired,
    otherPids: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
    otherRoster: React.PropTypes.array.isRequired,
    otherTid: React.PropTypes.number.isRequired,
    phase: React.PropTypes.number.isRequired,
    salaryCap: React.PropTypes.number.isRequired,
    summary: React.PropTypes.object.isRequired,
    showResigningMsg: React.PropTypes.bool.isRequired,
    strategy: React.PropTypes.string.isRequired,
    teams: React.PropTypes.array.isRequired,
    userDpids: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
    userPicks: React.PropTypes.array.isRequired,
    userPids: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
    userRoster: React.PropTypes.array.isRequired,
    userTeamName: React.PropTypes.string.isRequired,
    won: React.PropTypes.number.isRequired,
};

export default Trade;
