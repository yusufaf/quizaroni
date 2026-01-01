import { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    IconButton,
    Rating,
    Typography,
    Stepper,
    Step,
    StepLabel,
    Fade,
    Tooltip,
} from '@mui/material';
import {
    ArrowBack,
    ArrowForward,
    Replay,
    VolumeUp,
    VolumeOff,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetStudyset } from 'state/api/studysetsAPI';
import { useStudySessionStore } from 'state/stores/studySession';
import { Card as CardType, Studyset } from 'shared/types';
import { STUDY_MODES } from 'shared/constants';
import StudyHeader from './shared/StudyHeader';
import StudyResults from './shared/StudyResults';
import SettingsDialog from './shared/SettingsDialog';
import { BasePage } from 'styles/AppStyles';

type Props = {
    studysetId: string;
};

const FlashcardsStudy = ({ studysetId }: Props) => {
    const { data: studysetResponse, isLoading } = useGetStudyset({ studysetUUID: studysetId });
    const studyset = studysetResponse?.studyset ?? ({} as Studyset);

    const {
        activeSession,
        startSession,
        endSession,
        updateCurrentCard,
        recordAnswer,
        updateCardProgress,
        incrementScore,
        updateStreak,
    } = useStudySessionStore();

    const [flipped, setFlipped] = useState(false);
    const [showRating, setShowRating] = useState(false);
    const [hasRated, setHasRated] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [sessionResult, setSessionResult] = useState(null);

    // Initialize session
    useEffect(() => {
        if (studyset?.cards?.length > 0 && !activeSession) {
            startSession({
                studysetUUID: studysetId,
                mode: STUDY_MODES.FLASHCARDS,
                cards: studyset.cards,
                settings: {
                    shuffleCards: false,
                    timedMode: false,
                    audioEnabled: false,
                    autoAdvance: true,
                    difficulty: 'medium',
                },
            });
        }
    }, [studyset?.cards, studysetId, activeSession]);

    useEffect(() => {
        if (activeSession?.settings?.audioEnabled && flipped && !hasRated) {
            const currentCard = activeSession?.cards?.[activeSession.currentCardIndex];
            if (currentCard?.definition) {
                playAudio(currentCard.definition);
            }
        }
    }, [flipped, activeSession?.settings?.audioEnabled, activeSession?.cards, activeSession?.currentCardIndex, hasRated]);

    if (isLoading || !activeSession || !activeSession.cards || activeSession.cards.length === 0) {
        return (
            <BasePage>
                <Typography>Loading...</Typography>
            </BasePage>
        );
    }

    const currentCard = activeSession.cards[activeSession.currentCardIndex];
    const isLastCard = activeSession.currentCardIndex === activeSession.cards.length - 1;
    const isFirstCard = activeSession.currentCardIndex === 0;

    const playAudio = (text: string) => {
        if (window.speechSynthesis && text) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleCardClick = () => {
        if (!hasRated) {
            setFlipped(!flipped);
            if (!flipped) {
                setShowRating(true);
            }
        }
    };

    const handleRating = (quality: number) => {
        if (quality === 0 || hasRated) return;

        setHasRated(true);

        // Map 1-5 star rating to SM-2 quality (1=Again, 2=Hard, 3=Good, 4=Easy, 5=Perfect)
        updateCardProgress(currentCard.cardUUID, quality);

        // Record answer
        const isCorrect = quality >= 3;
        const timeSpent = Math.floor((Date.now() - activeSession.startTime) / 1000);
        recordAnswer({
            cardUUID: currentCard.cardUUID,
            correct: isCorrect,
            timeSpent,
            hintsUsed: 0,
        });

        // Update score and streak
        if (isCorrect) {
            incrementScore(100);
            updateStreak(true);
        } else {
            updateStreak(false);
        }

        // Auto-advance after delay
        if (activeSession.settings.autoAdvance) {
            setTimeout(() => {
                handleNext();
            }, 500);
        }
    };

    const handleNext = () => {
        if (isLastCard) {
            // End session and show results
            const result = endSession();
            setSessionResult(result);
            setShowResults(true);
        } else {
            updateCurrentCard(activeSession.currentCardIndex + 1);
            setFlipped(false);
            setShowRating(false);
            setHasRated(false);
        }
    };

    const handlePrevious = () => {
        if (!isFirstCard) {
            updateCurrentCard(activeSession.currentCardIndex - 1);
            setFlipped(false);
            setShowRating(false);
            setHasRated(false);
        }
    };

    const handleFlip = () => {
        setFlipped(!flipped);
        if (!flipped) {
            setShowRating(true);
        }
    };

    const handleAudioToggle = () => {
        if (!activeSession) return;
        const newSettings = {
            ...activeSession.settings,
            audioEnabled: !activeSession.settings.audioEnabled,
        };
        startSession({
            studysetUUID: studysetId,
            mode: STUDY_MODES.FLASHCARDS,
            cards: studyset.cards,
            settings: newSettings,
        });
    };

    const handleSettingsSave = (newSettings) => {
        startSession({
            studysetUUID: studysetId,
            mode: STUDY_MODES.FLASHCARDS,
            cards: studyset.cards,
            settings: newSettings,
        });
    };

    const handleStudyAgain = () => {
        setShowResults(false);
        setSessionResult(null);
        startSession({
            studysetUUID: studysetId,
            mode: STUDY_MODES.FLASHCARDS,
            cards: studyset.cards,
            settings: {
                shuffleCards: false,
                timedMode: false,
                audioEnabled: false,
                autoAdvance: true,
                difficulty: 'medium',
            },
        });
        setFlipped(false);
        setShowRating(false);
        setHasRated(false);
    };

    return (
        <BasePage
            sx={{
                mt: 0,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
                backgroundColor: 'background.default',
            }}
        >
            <StudyHeader
                studysetTitle={studyset.title || ''}
                studysetUUID={studysetId}
                currentCard={activeSession.currentCardIndex + 1}
                totalCards={activeSession.cards.length}
                score={activeSession.score}
                streak={activeSession.streak}
                audioEnabled={activeSession.settings.audioEnabled}
                onToggleAudio={handleAudioToggle}
                onSettings={() => setShowSettings(true)}
            />

            {/* Stepper - at top */}
            <Box sx={{ width: '100%', maxWidth: '50rem', mx: 'auto', pt: '4rem', px: '2rem' }}>
                <Stepper activeStep={activeSession.currentCardIndex} alternativeLabel>
                    {activeSession.cards.map((card) => (
                        <Step key={card.cardUUID}>
                            <StepLabel />
                        </Step>
                    ))}
                </Stepper>
            </Box>

            {/* Main Card Area */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    px: '2rem',
                }}
            >
                {/* Card Container */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2rem',
                        width: '100%',
                    }}
                >
                {/* Previous Button */}
                <Tooltip title="Previous Card">
                    <span>
                        <IconButton
                            onClick={handlePrevious}
                            disabled={isFirstCard}
                            color="primary"
                            sx={{ fontSize: '3rem' }}
                        >
                            <ArrowBack fontSize="inherit" />
                        </IconButton>
                    </span>
                </Tooltip>

                {/* Flashcard */}
                <AnimatePresence mode="wait">
                    <Box
                        key={currentCard.cardUUID}
                        sx={{
                            perspective: '1000px',
                            width: '50rem',
                            height: '30rem',
                        }}
                    >
                        <motion.div
                            initial={{ rotateY: 0 }}
                            animate={{ rotateY: flipped ? 180 : 0 }}
                            transition={{ duration: 0.6, type: 'spring' }}
                            style={{
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                transformStyle: 'preserve-3d',
                                cursor: hasRated ? 'default' : 'pointer',
                            }}
                            onClick={handleCardClick}
                        >
                            {/* Front of card (Term) */}
                            <Card
                                elevation={8}
                                sx={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    backfaceVisibility: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '1rem',
                                }}
                            >
                                <CardContent>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {currentCard.term}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ textAlign: 'center', mt: '2rem' }}
                                    >
                                        Click to flip
                                    </Typography>
                                </CardContent>
                            </Card>

                            {/* Back of card (Definition) */}
                            <Card
                                elevation={8}
                                sx={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    backfaceVisibility: 'hidden',
                                    transform: 'rotateY(180deg)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '1rem',
                                    backgroundColor: 'primary.main',
                                    color: 'primary.contrastText',
                                }}
                            >
                                <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <Typography
                                        variant="h4"
                                        sx={{
                                            textAlign: 'center',
                                            fontWeight: 600,
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {currentCard.definition}
                                    </Typography>
                                </CardContent>

                                {/* Rating Section */}
                                <Fade in={showRating && !hasRated}>
                                    <Box
                                        sx={{
                                            p: '1.5rem',
                                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                            width: '100%',
                                            borderBottomLeftRadius: '1rem',
                                            borderBottomRightRadius: '1rem',
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ mb: '0.5rem', textAlign: 'center' }}>
                                            How well did you know this?
                                        </Typography>
                                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                            <Rating
                                                size="large"
                                                value={0}
                                                onChange={(_, value) => handleRating(value || 0)}
                                                sx={{
                                                    '& .MuiRating-iconFilled': {
                                                        color: '#FFD93D',
                                                    },
                                                    '& .MuiRating-iconHover': {
                                                        color: '#FFD93D',
                                                    },
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Fade>
                            </Card>
                        </motion.div>
                    </Box>
                </AnimatePresence>

                {/* Next Button */}
                <Tooltip title={isLastCard ? 'Finish' : 'Next Card'}>
                    <span>
                        <IconButton
                            onClick={handleNext}
                            disabled={!hasRated}
                            color="primary"
                            sx={{ fontSize: '3rem' }}
                        >
                            <ArrowForward fontSize="inherit" />
                        </IconButton>
                    </span>
                </Tooltip>
                </Box>
            </Box>

            {/* Bottom Controls */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '1rem',
                }}
            >
                <Tooltip title="Flip Card">
                    <IconButton onClick={handleFlip} color="primary" size="large">
                        <Replay fontSize="inherit" />
                    </IconButton>
                </Tooltip>
                <Tooltip title={activeSession.settings.audioEnabled ? 'Audio On' : 'Audio Off'}>
                    <IconButton onClick={handleAudioToggle} color="primary" size="large">
                        {activeSession.settings.audioEnabled ? (
                            <VolumeUp fontSize="inherit" />
                        ) : (
                            <VolumeOff fontSize="inherit" />
                        )}
                    </IconButton>
                </Tooltip>
            </Box>

            {/* Dialogs */}
            <StudyResults
                open={showResults}
                result={sessionResult}
                onClose={() => setShowResults(false)}
                onStudyAgain={handleStudyAgain}
            />

            <SettingsDialog
                open={showSettings}
                settings={activeSession.settings}
                onClose={() => setShowSettings(false)}
                onSave={handleSettingsSave}
            />
        </BasePage>
    );
};

export default FlashcardsStudy;
