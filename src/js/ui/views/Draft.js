import classNames from 'classnames';
import React from 'react';
import {g, helpers} from '../../common';
import {getCols, realtimeUpdate, setTitle, toWorker} from '../util';
import {DataTable, DraftAbbrev, NewWindowLink, PlayerNameLabels} from '../components';

function scrollLeft(pos: number) {
    // https://blog.hospodarets.com/native_smooth_scrolling
    if ('scrollBehavior' in document.documentElement.style) {
        window.scrollTo({
            left: pos,
            top: document.body.scrollTop,
            behavior: 'smooth',
        });
    } else {
        window.scrollTo(pos, document.body.scrollTop);
    }
}

const viewDrafted = () => {
    scrollLeft(document.body.scrollWidth - document.body.clientWidth);
};
const viewUndrafted = () => {
    scrollLeft(0);
};

class Draft extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            fantasyDrafted: [],
            fantasyDraftedNewPids: [],
        };
    }

    componentWillReceiveProps() {
        if (this.props.fantasyDraft) {
            const newDrafted = this.state.fantasyDraftedNewPids.map((pid, i) => {
                const p = this.props.undrafted.find(p2 => p2.pid === pid);
                p.draft = this.props.drafted[i].draft;
                return p;
            });

            this.setState({
                fantasyDrafted: this.state.fantasyDrafted.concat(newDrafted),
                fantasyDraftedNewPids: [],
            });
        }
    }

    savePids(pids) {
        if (this.props.fantasyDraft) {
            this.setState({
                fantasyDraftedNewPids: this.state.fantasyDraftedNewPids.concat(pids),
            });
        }
    }

    async draftUntilUserOrEnd() {
        const pids = await toWorker('draftUntilUserOrEnd');
        this.savePids(pids);
        await realtimeUpdate(["playerMovement"]);
    }

    async draftUser(pid) {
        await toWorker('draftUser', pid);
        this.savePids([pid]);
        await realtimeUpdate(["playerMovement"]);
        await this.draftUntilUserOrEnd(); // Needed for when user has #1 pick in fantasy draft, otherwise no
    }

    render() {
        const {drafted, fantasyDraft, started, undrafted, userTids} = this.props;

        setTitle('Draft');

        const nextPick = drafted.find(p => p.pid < 0);
        const usersTurn = nextPick && userTids.includes(nextPick.draft.tid);

        const colsUndrafted = getCols('Name', 'Pos', 'Age', 'Ovr', 'Pot', 'Draft');
        colsUndrafted[0].width = '100%';

        if (fantasyDraft) {
            colsUndrafted.splice(5, 0, ...getCols('Contract', 'PER', 'EWA'));
        }

        const rowsUndrafted = undrafted.map(p => {
            const data = [
                <PlayerNameLabels pid={p.pid} injury={p.injury} skills={p.ratings.skills} watch={p.watch} ratings={p.ratings}>{p.name}</PlayerNameLabels>,
                p.ratings.pos,
                p.age,
                p.ratings.ovr,
                p.ratings.pot,
                <button className="btn btn-xs btn-primary" disabled={!usersTurn} onClick={() => this.draftUser(p.pid)}>Draft</button>,
            ];

            if (fantasyDraft) {
                data.splice(5, 0,
                    `${helpers.formatCurrency(p.contract.amount, 'M')} thru ${p.contract.exp}`,
                    p.stats.per.toFixed(1),
                    p.stats.ewa.toFixed(1),
                );
            }

            return {
                key: p.pid,
                data,
            };
        });

        const colsDrafted = getCols('Pick', 'Team').concat(colsUndrafted.slice(0, -1));

        const draftedMerged = fantasyDraft ? this.state.fantasyDrafted.concat(drafted) : drafted;
        const rowsDrafted = draftedMerged.map((p, i) => {
            const data = [
                `${p.draft.round}-${p.draft.pick}`,
                <DraftAbbrev originalTid={p.draft.originalTid} season={g.season} tid={p.draft.tid}>{p.draft.tid} {p.draft.originalTid}</DraftAbbrev>,
                p.pid >= 0 ? <PlayerNameLabels pid={p.pid} injury={p.injury} skills={p.ratings.skills} watch={p.watch} ratings={p.ratings}>{p.name}</PlayerNameLabels> : null,
                p.pid >= 0 ? p.ratings.pos : null,
                p.pid >= 0 ? p.age : null,
                p.pid >= 0 ? p.ratings.ovr : null,
                p.pid >= 0 ? p.ratings.pot : null,
            ];

            if (fantasyDraft) {
                data.splice(7, 0,
                    p.pid >= 0 ? `${helpers.formatCurrency(p.contract.amount, 'M')} thru ${p.contract.exp}` : null,
                    p.pid >= 0 ? p.stats.per.toFixed(1) : null,
                    p.pid >= 0 ? p.stats.ewa.toFixed(1) : null,
                );
            }

            return {
                key: i,
                data,
                classNames: {info: userTids.includes(p.draft.tid)},
            };
        });

        const buttonClasses = classNames('btn', 'btn-info', 'btn-xs', {'visible-xs': !fantasyDraft});

        const wrapperClasses = classNames('row', 'row-offcanvas', 'row-offcanvas-right', {
            'row-offcanvas-force': fantasyDraft,
            'row-offcanvas-right-force': fantasyDraft,
        });

        const colClass = fantasyDraft ? 'col-xs-12' : 'col-sm-6';
        const undraftedColClasses = classNames(colClass);
        const draftedColClasses = classNames('sidebar-offcanvas', colClass, {'sidebar-offcanvas-force': fantasyDraft});

        return <div>
            <h1>Draft <NewWindowLink /></h1>

            <p>When your turn in the draft comes up, select from the list of available players on the left.</p>

            {started ? null : <p><button className="btn btn-large btn-success" onClick={() => this.draftUntilUserOrEnd()}>Start Draft</button></p>}

            <div className={wrapperClasses}>
                <div className={undraftedColClasses}>
                    <h2>
                        Undrafted Players
                        <span className="pull-right"><button type="button" className={buttonClasses} onClick={viewDrafted}>View Drafted</button></span>
                    </h2>

                    <DataTable
                        cols={colsUndrafted}
                        defaultSort={[4, 'desc']}
                        name="Draft:Undrafted"
                        rows={rowsUndrafted}
                    />
                </div>
                <div className={draftedColClasses}>
                    <h2>
                        Draft Results
                        <span className="pull-right"><button type="button" className={buttonClasses} onClick={viewUndrafted}>View Undrafted</button></span>
                    </h2>

                    <DataTable
                        cols={colsDrafted}
                        defaultSort={[0, 'asc']}
                        name="Draft:Drafted"
                        rows={rowsDrafted}
                    />
                </div>
            </div>
        </div>;
    }
}

Draft.propTypes = {
    drafted: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    fantasyDraft: React.PropTypes.bool.isRequired,
    started: React.PropTypes.bool.isRequired,
    undrafted: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    userTids: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
};

export default Draft;
