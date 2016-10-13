import createDOMPurify from 'dompurify';
import React from 'react';

const DOMPurify = createDOMPurify(window);

const SafeHtml = ({dirty}) => {
    const clean = DOMPurify.sanitize(dirty);

    // eslint-disable-next-line react/no-danger
    return <span dangerouslySetInnerHTML={{__html: clean}} />;
};

SafeHtml.propTypes = {
    dirty: React.PropTypes.string.isRequired,
};

export default SafeHtml;
