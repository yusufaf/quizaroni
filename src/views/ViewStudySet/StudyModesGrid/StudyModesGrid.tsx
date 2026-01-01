import { useState } from 'react';
import { Grow, Tooltip, Typography, Box } from '@mui/material';
import { ViewCarousel, Quiz, Extension, Keyboard } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { STUDY_MODES, STUDY_MODE_CONFIG } from 'shared/constants';
import { StudyModeGrid, StudyModePaper, StudyModeTitle } from '../styles';

const ICON_MAP = {
    ViewCarousel,
    Quiz,
    Extension,
    Keyboard,
};

type Props = {
    studysetUUID: string;
    cardCount: number;
};

const StudyModesGrid = ({ studysetUUID, cardCount }: Props) => {
    const navigate = useNavigate();
    const [hoveredMode, setHoveredMode] = useState<string | null>(null);

    const handleModeClick = (modeId: string) => {
        if (cardCount === 0) return;
        navigate(`/study/${studysetUUID}/${modeId}`);
    };

    const modes = Object.values(STUDY_MODES).map((mode) => STUDY_MODE_CONFIG[mode]);

    return (
        <StudyModeGrid>
            {modes.map((mode, index) => {
                const IconComponent = ICON_MAP[mode.icon as keyof typeof ICON_MAP];
                const isDisabled = cardCount === 0;
                const isHovered = hoveredMode === mode.id;

                return (
                    <Grow in key={mode.id} timeout={300 + index * 100}>
                        <Tooltip
                            title={isDisabled ? 'Add cards to unlock this mode' : mode.description}
                            placement="top"
                        >
                            <StudyModePaper
                                component={motion.div}
                                // @ts-ignore
                                whileHover={{ scale: isDisabled ? 1 : 1.05 }}
                                whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                                onClick={() => handleModeClick(mode.id)}
                                onMouseEnter={() => setHoveredMode(mode.id)}
                                onMouseLeave={() => setHoveredMode(null)}
                                elevation={isHovered && !isDisabled ? 8 : 2}
                                sx={{
                                    opacity: isDisabled ? 0.4 : 1,
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.3s ease',
                                    borderLeft: `0.25rem solid ${mode.color}`,
                                    '&:hover': {
                                        backgroundColor: isDisabled ? undefined : 'action.hover',
                                    },
                                }}
                            >
                                <IconComponent
                                    sx={{
                                        fontSize: '2.5rem',
                                        color: isHovered && !isDisabled ? mode.color : 'text.primary',
                                        transition: 'color 0.3s ease',
                                    }}
                                />
                                <StudyModeTitle variant="subtitle1">{mode.title}</StudyModeTitle>
                            </StudyModePaper>
                        </Tooltip>
                    </Grow>
                );
            })}
        </StudyModeGrid>
    );
};

export default StudyModesGrid;
