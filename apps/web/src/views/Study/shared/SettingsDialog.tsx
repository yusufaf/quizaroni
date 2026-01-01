import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControlLabel,
    Switch,
    Slider,
    Typography,
    Box,
    Divider,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { StudySessionSettings } from 'shared/types';

type Props = {
    open: boolean;
    settings: StudySessionSettings;
    onClose: () => void;
    onSave: (settings: StudySessionSettings) => void;
};

const SettingsDialog = ({ open, settings, onClose, onSave }: Props) => {
    const [localSettings, setLocalSettings] = useState<StudySessionSettings>(settings);

    useEffect(() => {
        if (open) {
            setLocalSettings(settings);
        }
    }, [open, settings]);

    const handleSwitchChange = (field: keyof StudySessionSettings) => {
        setLocalSettings((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    const handleSliderChange = (_event: Event, value: number | number[]) => {
        setLocalSettings((prev) => ({
            ...prev,
            timePerCard: value as number,
        }));
    };

    const handleDifficultyChange = (difficulty: 'easy' | 'medium' | 'hard') => {
        setLocalSettings((prev) => ({
            ...prev,
            difficulty,
        }));
    };

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    const handleCancel = () => {
        setLocalSettings(settings);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleCancel}
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
                        gap: '0.5rem',
                    }}
                >
                    <SettingsIcon sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Study Settings
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogContent>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1.5rem',
                        py: '1rem',
                    }}
                >
                    {/* Card Settings */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: '1rem' }}>
                            Card Settings
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={localSettings.shuffleCards}
                                        onChange={() => handleSwitchChange('shuffleCards')}
                                        color="primary"
                                    />
                                }
                                label="Shuffle Cards"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={localSettings.autoAdvance}
                                        onChange={() => handleSwitchChange('autoAdvance')}
                                        color="primary"
                                    />
                                }
                                label="Auto-Advance to Next Card"
                            />
                        </Box>
                    </Box>

                    <Divider />

                    {/* Audio Settings */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: '1rem' }}>
                            Audio Settings
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={localSettings.audioEnabled}
                                    onChange={() => handleSwitchChange('audioEnabled')}
                                    color="primary"
                                />
                            }
                            label="Enable Text-to-Speech (TTS)"
                        />
                    </Box>

                    <Divider />

                    {/* Timer Settings */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: '1rem' }}>
                            Timer Settings
                        </Typography>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={localSettings.timedMode}
                                    onChange={() => handleSwitchChange('timedMode')}
                                    color="primary"
                                />
                            }
                            label="Enable Timed Mode"
                        />

                        {localSettings.timedMode && (
                            <Box sx={{ mt: '1.5rem', px: '0.5rem' }}>
                                <Typography variant="body2" gutterBottom>
                                    Time per Card: {localSettings.timePerCard || 30} seconds
                                </Typography>
                                <Slider
                                    value={localSettings.timePerCard || 30}
                                    onChange={handleSliderChange}
                                    min={10}
                                    max={120}
                                    step={5}
                                    marks={[
                                        { value: 10, label: '10s' },
                                        { value: 30, label: '30s' },
                                        { value: 60, label: '60s' },
                                        { value: 120, label: '120s' },
                                    ]}
                                    valueLabelDisplay="auto"
                                    sx={{
                                        '& .MuiSlider-markLabel': {
                                            fontSize: '0.75rem',
                                        },
                                    }}
                                />
                            </Box>
                        )}
                    </Box>

                    <Divider />

                    {/* Difficulty Settings */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: '1rem' }}>
                            Difficulty Level
                        </Typography>
                        <Box
                            sx={{
                                display: 'flex',
                                gap: '0.5rem',
                            }}
                        >
                            {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
                                <Button
                                    key={difficulty}
                                    variant={
                                        localSettings.difficulty === difficulty
                                            ? 'contained'
                                            : 'outlined'
                                    }
                                    onClick={() => handleDifficultyChange(difficulty)}
                                    sx={{
                                        flex: 1,
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    {difficulty}
                                </Button>
                            ))}
                        </Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mt: '0.5rem' }}
                        >
                            {localSettings.difficulty === 'easy' &&
                                'More lenient answer matching, more hints available'}
                            {localSettings.difficulty === 'medium' &&
                                'Balanced answer matching and hint availability'}
                            {localSettings.difficulty === 'hard' &&
                                'Strict answer matching, fewer hints available'}
                        </Typography>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{ px: '1.5rem', pb: '1rem' }}>
                <Button onClick={handleCancel} variant="outlined">
                    Cancel
                </Button>
                <Button onClick={handleSave} variant="contained">
                    Save Settings
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SettingsDialog;
