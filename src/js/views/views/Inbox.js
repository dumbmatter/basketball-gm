import classNames from 'classnames';
import React from 'react';
import bbgmViewReact from '../../util/bbgmViewReact';
import * as helpers from '../../util/helpers';
import {NewWindowLink} from '../components';

const Inbox = ({anyUnread, messages}) => {
    bbgmViewReact.title('Inbox');

    return <div>
        <h1>Inbox <NewWindowLink /></h1>

        {anyUnread ? <p className="text-danger">You have a new message. Read it before continuing.</p> : null}

        <table className="table table-striped table-bordered table-condensed" id="messages-table">
            <tbody>
                {messages.map(({from, mid, read, text, year}) => {
                    return <tr key={mid} className={classNames({unread: !read})}>
                        <td className="year"><a href={helpers.leagueUrl(['message', mid])}>{year}</a></td>
                        <td className="from"><a href={helpers.leagueUrl(['message', mid])}>{from}</a></td>
                        <td className="text"><a href={helpers.leagueUrl(['message', mid])}>{text}</a></td>
                    </tr>;
                })}
            </tbody>
        </table>
    </div>;
};

Inbox.propTypes = {
    anyUnread: React.PropTypes.bool.isRequired,
    messages: React.PropTypes.arrayOf(React.PropTypes.shape({
        from: React.PropTypes.string.isRequired,
        mid: React.PropTypes.number.isRequired,
        read: React.PropTypes.bool.isRequired,
        text: React.PropTypes.string.isRequired,
        year: React.PropTypes.number.isRequired,
    })).isRequired,
};

export default Inbox;
