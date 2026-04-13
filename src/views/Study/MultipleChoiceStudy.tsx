import { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Radio,
    RadioGroup,
    FormControlLabel,
    Button,
    Typography,
    LinearProgress,
    Alert,
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useGetStudyset } from 'state/api/studysetsAPI';
import { useStudySessionStore } from 'state/stores/studySession';
import { Card as CardType, Studyset } from 'shared/types';
import { STUDY_MODES, SCORING } from 'shared/constants';
import StudyHeader from './shared/StudyHeader';
import StudyResults from './shared/StudyResults';
import SettingsDialog from './shared/SettingsDialog';
import { BasePage } from 'styles/AppStyles';

type Props = {
    studysetId: string;
};

type QuizOption = {
    text: string;
    isCorrect: boolean;
};

const MultipleChoiceStudy = ({ studysetId }: Props) => {
    const { data: studysetResponse, isLoading } = useGetStudyset({
        studysetUUID: studysetId,
    });
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

    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(100);
    const [quizOptions, setQuizOptions] = useState<QuizOption[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [sessionResult, setSessionResult] = useState(null);
    const [answerStartTime, setAnswerStartTime] = useState(Date.now());

    // Initialize session
    useEffect(() => {
        if (studyset?.cards?.length > 0 && !activeSession) {
            startSession({
                studysetUUID: studysetId,
                mode: STUDY_MODES.MULTIPLE_CHOICE,
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

    const currentCard = activeSession?.cards[activeSession.currentCardIndex];

    // Generate quiz options when card changes
    useEffect(() => {
        if (currentCard && activeSession) {
            const options = generateOptions(currentCard, activeSession.cards);
            setQuizOptions(options);
            setSelectedOption(null);
            setShowFeedback(false);
            setTimeRemaining(100);
            setAnswerStartTime(Date.now());
        }
    }, [currentCard, activeSession?.currentCardIndex]);

    // Timer
    useEffect(() => {
        if (!activeSession?.settings?.timedMode || showFeedback || !currentCard)
            return;

        const timePerCard = activeSession.settings.timePerCard || 30;
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {
                const newTime = prev - 100 / (timePerCard * 10);
                if (newTime <= 0) {
                    handleSubmit(true);
                    return 0;
                }
                return newTime;
            });
        }, 100);

        return () => clearInterval(interval);
    }, [activeSession?.settings, showFeedback, currentCard]);

    const generateOptions = (
        correctCard: CardType,
        allCards: CardType[]
    ): QuizOption[] => {
        const options: QuizOption[] = [
            { text: correctCard.definition, isCorrect: true },
        ];

        const otherCards = allCards.filter(
            (card) => card.cardUUID !== correctCard.cardUUID
        );
        const shuffledOthers = [...otherCards].sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(3, shuffledOthers.length); i++) {
            options.push({
                text: shuffledOthers[i].definition,
                isCorrect: false,
            });
        }

        // Fill with placeholders if not enough cards
        while (options.length < 4) {
            options.push({
                text: `Option ${options.length + 1}`,
                isCorrect: false,
            });
        }

        return options.sort(() => Math.random() - 0.5);
    };

    const handleSubmit = useCallback(
        (isTimeout = false) => {
            if (showFeedback) return;

            const correctIndex = quizOptions.findIndex((opt) => opt.isCorrect);
            const answeredCorrectly =
                selectedOption === correctIndex ||
                (isTimeout && selectedOption === null);
            const actuallyCorrect =
                !isTimeout && selectedOption === correctIndex;

            setIsCorrect(actuallyCorrect);
            setShowFeedback(true);

            // Calculate time bonus
            const timeSpent = Math.floor((Date.now() - answerStartTime) / 1000);
            let scoreToAdd = 0;
            let quality = 1;

            if (actuallyCorrect) {
                scoreToAdd = SCORING.CORRECT_ANSWER;
                quality = 4;

                // Time bonus
                if (activeSession?.settings?.timedMode && timeRemaining > 50) {
                    const bonus = Math.floor(
                        SCORING.TIME_BONUS_MAX * (timeRemaining / 100)
                    );
                    scoreToAdd += bonus;
                }

                incrementScore(scoreToAdd);
                updateStreak(true);
            } else {
                quality = 1;
                updateStreak(false);
            }

            // Update card progress and record answer
            updateCardProgress(currentCard.cardUUID, quality);
            recordAnswer({
                cardUUID: currentCard.cardUUID,
                correct: actuallyCorrect,
                timeSpent,
                hintsUsed: 0,
                selectedOption,
            });

            // Auto-advance after delay
            setTimeout(() => {
                handleNext();
            }, 2000);
        },
        [
            selectedOption,
            quizOptions,
            showFeedback,
            timeRemaining,
            currentCard,
            answerStartTime,
            activeSession,
        ]
    );

    const handleNext = () => {
        if (!activeSession) return;

        const isLastCard =
            activeSession.currentCardIndex === activeSession.cards.length - 1;

        if (isLastCard) {
            const result = endSession();
            setSessionResult(result);
            setShowResults(true);
        } else {
            updateCurrentCard(activeSession.currentCardIndex + 1);
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
            mode: STUDY_MODES.MULTIPLE_CHOICE,
            cards: studyset.cards,
            settings: newSettings,
        });
    };

    const handleSettingsSave = (newSettings) => {
        startSession({
            studysetUUID: studysetId,
            mode: STUDY_MODES.MULTIPLE_CHOICE,
            cards: studyset.cards,
            settings: newSettings,
        });
    };

    const handleStudyAgain = () => {
        setShowResults(false);
        setSessionResult(null);
        startSession({
            studysetUUID: studysetId,
            mode: STUDY_MODES.MULTIPLE_CHOICE,
            cards: studyset.cards,
            settings: {
                shuffleCards: false,
                timedMode: false,
                audioEnabled: false,
                autoAdvance: true,
                difficulty: 'medium',
            },
        });
    };

    const getTimerColor = () => {
        if (timeRemaining > 60) return 'success';
        if (timeRemaining > 30) return 'warning';
        return 'error';
    };

    if (
        isLoading ||
        !activeSession ||
        !activeSession.cards ||
        activeSession.cards.length === 0
    ) {
        return (
            <BasePage>
                <Typography>Loading...</Typography>
            </BasePage>
        );
    }

    const correctIndex = quizOptions.findIndex((opt) => opt.isCorrect);

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

            {/* Top Spacer */}
            <Box sx={{ pt: '4rem' }} />

            {/* Main Quiz Area */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    px: '2rem',
                }}
            >
                <Card
                    elevation={6}
                    sx={{
                        maxWidth: '50rem',
                        width: '100%',
                        borderRadius: '1rem',
                        overflow: 'visible',
                    }}
                >
                    <CardContent sx={{ p: '2.5rem' }}>
                        {/* Timer */}
                        {activeSession.settings.timedMode && (
                            <Box sx={{ mb: '2rem' }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={timeRemaining}
                                    color={getTimerColor()}
                                    sx={{
                                        height: '0.5rem',
                                        borderRadius: '0.25rem',
                                    }}
                                />
                            </Box>
                        )}

                        {/* Question */}
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 600,
                                mb: '2rem',
                                textAlign: 'center',
                            }}
                        >
                            {currentCard.term}
                        </Typography>

                        {/* Feedback Alert */}
                        <AnimatePresence>
                            {showFeedback && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                >
                                    <Alert
                                        severity={
                                            isCorrect ? 'success' : 'error'
                                        }
                                        icon={
                                            isCorrect ? (
                                                <CheckCircle />
                                            ) : (
                                                <Cancel />
                                            )
                                        }
                                        sx={{ mb: '2rem' }}
                                    >
                                        {isCorrect
                                            ? '✓ Correct! Great job!'
                                            : `✗ Incorrect. The correct answer was: "${quizOptions[correctIndex]?.text}"`}
                                    </Alert>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Options */}
                        <RadioGroup
                            value={
                                selectedOption !== null ? selectedOption : ''
                            }
                            onChange={(e) =>
                                !showFeedback &&
                                setSelectedOption(Number(e.target.value))
                            }
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                }}
                            >
                                {quizOptions.map((option, index) => {
                                    const isThisCorrect =
                                        index === correctIndex;
                                    const isThisSelected =
                                        selectedOption === index;
                                    const showCorrectHighlight =
                                        showFeedback && isThisCorrect;
                                    const showWrongHighlight =
                                        showFeedback &&
                                        isThisSelected &&
                                        !isCorrect;

                                    return (
                                        <Card
                                            key={index}
                                            variant="outlined"
                                            sx={{
                                                p: '1rem',
                                                cursor: showFeedback
                                                    ? 'default'
                                                    : 'pointer',
                                                transition: 'all 0.2s ease',
                                                backgroundColor:
                                                    showCorrectHighlight
                                                        ? 'rgba(76, 175, 80, 0.1)'
                                                        : showWrongHighlight
                                                          ? 'rgba(244, 67, 54, 0.1)'
                                                          : 'background.paper',
                                                borderColor:
                                                    showCorrectHighlight
                                                        ? 'success.main'
                                                        : showWrongHighlight
                                                          ? 'error.main'
                                                          : 'divider',
                                                borderWidth:
                                                    showCorrectHighlight ||
                                                    showWrongHighlight
                                                        ? 2
                                                        : 1,
                                                '&:hover': {
                                                    backgroundColor:
                                                        showFeedback
                                                            ? undefined
                                                            : 'action.hover',
                                                },
                                            }}
                                            onClick={() =>
                                                !showFeedback &&
                                                setSelectedOption(index)
                                            }
                                        >
                                            <FormControlLabel
                                                value={index}
                                                control={
                                                    <Radio
                                                        disabled={showFeedback}
                                                        icon={
                                                            showWrongHighlight ? (
                                                                <Cancel color="error" />
                                                            ) : undefined
                                                        }
                                                        checkedIcon={
                                                            showCorrectHighlight ? (
                                                                <CheckCircle color="success" />
                                                            ) : showWrongHighlight ? (
                                                                <Cancel color="error" />
                                                            ) : undefined
                                                        }
                                                    />
                                                }
                                                label={
                                                    <Typography
                                                        sx={{
                                                            wordBreak:
                                                                'break-word',
                                                            fontWeight:
                                                                isThisSelected
                                                                    ? 600
                                                                    : 400,
                                                        }}
                                                    >
                                                        {option.text}
                                                    </Typography>
                                                }
                                                sx={{ width: '100%', m: 0 }}
                                            />
                                        </Card>
                                    );
                                })}
                            </Box>
                        </RadioGroup>

                        {/* Submit Button */}
                        {!showFeedback && (
                            <Box
                                sx={{
                                    mt: '2rem',
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={() => handleSubmit()}
                                    disabled={selectedOption === null}
                                    sx={{ minWidth: '10rem' }}
                                >
                                    Submit Answer
                                </Button>
                            </Box>
                        )}
                    </CardContent>
                </Card>
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

export default MultipleChoiceStudy;
