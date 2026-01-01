import { useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    LinearProgress,
    Chip,
} from '@mui/material';
import { EmojiEvents, CheckCircle, Timer, Whatshot } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { StudySessionResult } from 'shared/types';

type Props = {
    open: boolean;
    result: StudySessionResult | null;
    onClose: () => void;
    onStudyAgain: () => void;
};

const StudyResults = ({ open, result, onClose, onStudyAgain }: Props) => {
    useEffect(() => {
        if (open && result && result.accuracy >= 80) {
            // Trigger confetti for high scores
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#FFA000', '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3'],
            });
        }
    }, [open, result]);

    if (!result) return null;

    const { totalCards, correctAnswers, score, timeSpent, accuracy, streak, achievements } = result;

    const getPerformanceMessage = () => {
        if (accuracy >= 95) return 'Outstanding! 🌟';
        if (accuracy >= 80) return 'Great Job! 🎉';
        if (accuracy >= 60) return 'Good Work! 👍';
        return 'Keep Practicing! 💪';
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{
                sx: {
                    borderRadius: '1rem',
                    padding: '1rem',
                },
            }}
        >
            <DialogTitle>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                    }}
                >
                    <EmojiEvents sx={{ fontSize: '2rem', color: 'primary.main' }} />
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                        {getPerformanceMessage()}
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2rem',
                        py: '1rem',
                    }}
                >
                    {/* Score Display */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            Total Score
                        </Typography>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                color: 'primary.main',
                            }}
                        >
                            {score}
                        </Typography>
                    </Box>

                    {/* Statistics Grid */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1.5rem',
                        }}
                    >
                        {/* Correct Answers */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                p: '1rem',
                                borderRadius: '0.75rem',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                            }}
                        >
                            <CheckCircle sx={{ fontSize: '2rem', color: 'success.main' }} />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {correctAnswers}/{totalCards}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Correct
                            </Typography>
                        </Box>

                        {/* Accuracy */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                p: '1rem',
                                borderRadius: '0.75rem',
                                backgroundColor: 'rgba(255, 160, 0, 0.1)',
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {accuracy}%
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={accuracy}
                                sx={{
                                    width: '100%',
                                    height: '0.5rem',
                                    borderRadius: '0.25rem',
                                }}
                            />
                            <Typography variant="body2" color="text.secondary">
                                Accuracy
                            </Typography>
                        </Box>

                        {/* Time Spent */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                p: '1rem',
                                borderRadius: '0.75rem',
                                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                            }}
                        >
                            <Timer sx={{ fontSize: '2rem', color: '#4ECDC4' }} />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {formatTime(timeSpent)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Time
                            </Typography>
                        </Box>

                        {/* Streak */}
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                p: '1rem',
                                borderRadius: '0.75rem',
                                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            }}
                        >
                            <Whatshot sx={{ fontSize: '2rem', color: '#FF6B6B' }} />
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {streak}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Best Streak
                            </Typography>
                        </Box>
                    </Box>

                    {/* New Achievements */}
                    <AnimatePresence>
                        {achievements.length > 0 && (
                            <Box
                                component={motion.div}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                }}
                            >
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                    🎉 New Achievements Unlocked!
                                </Typography>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '0.5rem',
                                    }}
                                >
                                    {achievements.map((achievementId, index) => (
                                        <Chip
                                            key={achievementId}
                                            label={achievementId.replace(/-/g, ' ').toUpperCase()}
                                            color="primary"
                                            component={motion.div}
                                            // @ts-ignore
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: index * 0.1 }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </AnimatePresence>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: '1.5rem', pb: '1rem' }}>
                <Button onClick={onClose} variant="outlined" size="large">
                    Back to Set
                </Button>
                <Button onClick={onStudyAgain} variant="contained" size="large">
                    Study Again
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default StudyResults;
