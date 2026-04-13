import { useState } from 'react';
import { Grow, Tooltip, Typography, Box } from '@mui/material';
import { ViewCarousel, Quiz, Extension, Keyboard } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
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

// Map mode IDs to translation keys
const MODE_TRANSLATION_KEYS: Record<string, string> = {
    flashcards: 'flashcards',
    'multiple-choice': 'multipleChoice',
    matching: 'matching',
    'type-write': 'typeWrite',
};

const StudyModesGrid = ({ studysetUUID, cardCount }: Props) => {
    const { t } = useTranslation('study');
    const navigate = useNavigate();
    const [hoveredMode, setHoveredMode] = useState<string | null>(null);

    const handleModeClick = (modeId: string) => {
        if (cardCount === 0) return;
        navigate(`/study/${studysetUUID}/${modeId}`);
    };

    const modes = Object.values(STUDY_MODES).map(
        (mode) => STUDY_MODE_CONFIG[mode]
    );

    return (
        <StudyModeGrid>
            {modes.map((mode, index) => {
                const IconComponent =
                    ICON_MAP[mode.icon as keyof typeof ICON_MAP];
                const isDisabled = cardCount === 0;
                const isHovered = hoveredMode === mode.id;
                const translationKey =
                    MODE_TRANSLATION_KEYS[mode.id] || mode.id;

                return (
                    <Grow in key={mode.id} timeout={300 + index * 100}>
                        <Tooltip
                            title={
                                isDisabled
                                    ? t('addCardsToUnlock')
                                    : t(`modes.${translationKey}.description`)
                            }
                            placement="top"
                        >
                            <StudyModePaper
                                onClick={() => handleModeClick(mode.id)}
                                onMouseEnter={() => setHoveredMode(mode.id)}
                                onMouseLeave={() => setHoveredMode(null)}
                                elevation={isHovered && !isDisabled ? 8 : 2}
                                sx={{
                                    opacity: isDisabled ? 0.4 : 1,
                                    cursor: isDisabled
                                        ? 'not-allowed'
                                        : 'pointer',
                                    transition: 'all 0.3s ease',
                                    borderLeft: `0.25rem solid ${mode.color}`,
                                    '&:hover': {
                                        backgroundColor: isDisabled
                                            ? undefined
                                            : 'action.hover',
                                    },
                                }}
                            >
                                <Box
                                    component={motion.div}
                                    whileHover={{
                                        scale: isDisabled ? 1 : 1.05,
                                    }}
                                    whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                        gap: '0.25rem',
                                    }}
                                >
                                    <IconComponent
                                        sx={{
                                            fontSize: '2.5rem',
                                            color:
                                                isHovered && !isDisabled
                                                    ? mode.color
                                                    : 'text.primary',
                                            transition: 'color 0.3s ease',
                                        }}
                                    />
                                    <StudyModeTitle variant="subtitle1">
                                        {t(`modes.${translationKey}.title`)}
                                    </StudyModeTitle>
                                </Box>
                            </StudyModePaper>
                        </Tooltip>
                    </Grow>
                );
            })}
        </StudyModeGrid>
    );
};

export default StudyModesGrid;
