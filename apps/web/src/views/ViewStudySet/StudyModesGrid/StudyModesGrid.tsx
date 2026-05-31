import { useState } from 'react';
import { Grow, Tooltip, Box } from '@mui/material';
import {
    ViewCarousel,
    Quiz,
    Extension,
    Keyboard,
    Schedule,
    LockOutlined,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { STUDY_MODES, STUDY_MODE_CONFIG } from 'shared/constants';
import { useDueCount } from 'shared/hooks/useDueCount';
import { StudyModeGrid, StudyModePaper, StudyModeTitle } from '../styles';

const ICON_MAP = {
    ViewCarousel,
    Quiz,
    Extension,
    Keyboard,
    Schedule,
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
    review: 'review',
};

const StudyModesGrid = ({ studysetUUID, cardCount }: Props) => {
    const { t } = useTranslation('study');
    const navigate = useNavigate();
    const [hoveredMode, setHoveredMode] = useState<string | null>(null);
    const { count: dueCount } = useDueCount(studysetUUID);

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
                                    cursor: isDisabled
                                        ? 'not-allowed'
                                        : 'pointer',
                                    transition: 'all 0.3s ease',
                                    borderLeft: isDisabled
                                        ? '0.25rem dashed'
                                        : `0.25rem solid ${mode.color}`,
                                    borderLeftColor: isDisabled
                                        ? 'divider'
                                        : undefined,
                                    filter: isDisabled
                                        ? 'grayscale(1)'
                                        : 'none',
                                    opacity: isDisabled ? 0.55 : 1,
                                    '&:hover': {
                                        backgroundColor: isDisabled
                                            ? undefined
                                            : 'action.hover',
                                        transform: isDisabled
                                            ? 'none'
                                            : undefined,
                                    },
                                }}
                            >
                                {isDisabled && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: '0.5rem',
                                            right: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '1.5rem',
                                            height: '1.5rem',
                                            borderRadius: '50%',
                                            backgroundColor:
                                                'background.default',
                                            color: 'text.secondary',
                                        }}
                                    >
                                        <LockOutlined
                                            sx={{ fontSize: '1rem' }}
                                        />
                                    </Box>
                                )}
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
                                        {mode.id === 'review'
                                            ? t('review.dueCount', {
                                                  count: dueCount,
                                              })
                                            : t(
                                                  `modes.${translationKey}.title`
                                              )}
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
