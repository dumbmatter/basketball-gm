import React from 'react';

const SkillsBlock = ({className = null, skills}) => {
    if (skills === undefined) {
        return null;
    }

    const tooltips = {
        3: "Three Point Shooter",
        A: "Athlete",
        B: "Ball Handler",
        Di: "Interior Defender",
        Dp: "Perimeter Defender",
        Po: "Post Scorer",
        Ps: "Passer",
        R: "Rebounder",
    };

    return <span className={className}>
        {skills.map(skill => <span key={skill} className="skill" title={tooltips[skill]}>{skill}</span>)}
    </span>;
};
SkillsBlock.propTypes = {
    className: React.PropTypes.string,
    skills: React.PropTypes.arrayOf(React.PropTypes.string),
};

export default SkillsBlock;
