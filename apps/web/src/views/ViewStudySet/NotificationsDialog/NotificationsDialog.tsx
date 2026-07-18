import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    DialogContent,
    FormControlLabel,
    Switch,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    Typography,
    Select,
    MenuItem,
    FormControl,
    Divider,
    Alert,
    CircularProgress,
} from '@mui/material';
import {
    Email as EmailIcon,
    Schedule as ScheduleIcon,
    LibraryBooks as StudysetIcon,
    Snooze as SnoozeIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useTranslation } from 'react-i18next';
import { useGetUser } from 'state/api/usersAPI';
import { useUpdateNotificationPreferences } from 'state/api/usersAPI';
import {
    NotificationMode,
    NotificationPreferences,
    EmailNotificationSettings,
    QuietHoursSettings,
    StudysetNotificationPrefs,
    UUID,
} from 'shared/types';
import {
    NOTIFICATION_MODES,
    NOTIFICATION_MODE_CONFIG,
    SNOOZE_OPTIONS,
    DAYS_OF_WEEK,
    DEFAULT_NOTIFICATION_PREFERENCES,
} from 'shared/constants';
import {
    StyledDialog,
    NotificationSection,
    NotificationRow,
    ModeCard,
    ModeCardGrid,
    DayToggleGroup,
} from './styles';

const StyledTabs = styled(Tabs)(({ theme }) => ({
    borderBottom: `1px solid ${theme.palette.divider}`,
    '& .MuiTab-root': {
        fontSize: '1rem',
        fontWeight: 500,
        textTransform: 'none',
        minHeight: '3rem',
    },
}));

type Props = {
    onClose: () => void;
    open: boolean;
    studysetUUID?: UUID;
    studysetTitle?: string;
};

type TabValue = 'email' | 'schedule' | 'studyset';

// Deep merge helper
const deepMerge = <T extends Record<string, any>>(
    target: T,
    source: Partial<T>
): T => {
    const result = { ...target };
    for (const key in source) {
        const sourceValue = source[key];
        const targetValue = result[key];
        if (
            sourceValue !== null &&
            typeof sourceValue === 'object' &&
            !Array.isArray(sourceValue) &&
            targetValue !== null &&
            typeof targetValue === 'object' &&
            !Array.isArray(targetValue)
        ) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else if (sourceValue !== undefined) {
            result[key] = sourceValue as T[Extract<keyof T, string>];
        }
    }
    return result;
};

const NotificationsDialog = (props: Props) => {
    const { open, onClose, studysetUUID, studysetTitle } = props;
    const { t } = useTranslation();
    const { data: userData } = useGetUser();
    const updateNotificationPrefs = useUpdateNotificationPreferences();

    const [selectedTab, setSelectedTab] = useState<TabValue>('email');
    const [error, setError] = useState<string | null>(null);

    // Local state for optimistic updates - stores the intended state during mutation
    const [optimisticPrefs, setOptimisticPrefs] =
        useState<NotificationPreferences | null>(null);

    // Track previous server state to detect when server has updated
    const prevServerStateRef = useRef<string | null>(null);

    // Server state
    const serverPreferences: NotificationPreferences = useMemo(() => {
        return (
            userData?.user?.metadata?.notifications ??
            (DEFAULT_NOTIFICATION_PREFERENCES as NotificationPreferences)
        );
    }, [userData]);

    // Clear optimistic state when server state actually changes
    useEffect(() => {
        const currentServerState = JSON.stringify(serverPreferences);
        if (
            optimisticPrefs &&
            prevServerStateRef.current !== null &&
            prevServerStateRef.current !== currentServerState
        ) {
            // Server state changed, clear optimistic state
            setOptimisticPrefs(null);
        }
        prevServerStateRef.current = currentServerState;
    }, [serverPreferences, optimisticPrefs]);

    // Use optimistic state if set, otherwise server state
    const preferences = optimisticPrefs ?? serverPreferences;

    // Clear error after a few seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const isEnabled = preferences.enabled;
    const isSnoozed = preferences.snoozeUntil
        ? new Date(preferences.snoozeUntil) > new Date()
        : false;

    const updatePreferences = (updates: Partial<NotificationPreferences>) => {
        // Set optimistic state before mutation
        const newPrefs = deepMerge(serverPreferences, updates);
        setOptimisticPrefs(newPrefs);
        setError(null);

        updateNotificationPrefs.mutate(
            { updates },
            {
                // Don't clear on success - useEffect will clear when server state updates
                onError: (err) => {
                    // Clear optimistic state on error - reverts to server state
                    setOptimisticPrefs(null);
                    setError('Failed to save notification preferences.');
                    console.error(
                        'Notification preferences update failed:',
                        err
                    );
                },
            }
        );
    };

    const handleToggleMaster = () => {
        updatePreferences({ enabled: !isEnabled });
    };

    const handleModeChange = (mode: NotificationMode) => {
        if (mode === 'custom') {
            updatePreferences({ mode });
        } else {
            const modeConfig =
                NOTIFICATION_MODE_CONFIG[
                    mode as keyof typeof NOTIFICATION_MODE_CONFIG
                ];
            updatePreferences({
                mode,
                email: {
                    ...preferences.email,
                    ...modeConfig.email,
                },
            });
        }
    };

    const handleEmailToggle = (key: keyof EmailNotificationSettings) => {
        if (key === 'digestDay') return;
        updatePreferences({
            mode: 'custom' as NotificationMode,
            email: {
                ...preferences.email,
                [key]: !preferences.email?.[key],
            },
        });
    };

    const handleDigestDayChange = (day: number) => {
        updatePreferences({
            email: {
                ...preferences.email,
                digestDay: day,
            },
        });
    };

    const handleQuietHoursToggle = () => {
        updatePreferences({
            quietHours: {
                ...preferences.quietHours,
                enabled: !preferences.quietHours?.enabled,
            },
        });
    };

    const handleQuietHoursChange = (
        field: keyof QuietHoursSettings,
        value: string
    ) => {
        updatePreferences({
            quietHours: {
                ...preferences.quietHours,
                [field]: value,
            },
        });
    };

    const handleSnooze = (hours: number) => {
        const snoozeUntil = new Date();
        snoozeUntil.setHours(snoozeUntil.getHours() + hours);
        updatePreferences({ snoozeUntil: snoozeUntil.toISOString() });
    };

    const handleClearSnooze = () => {
        updatePreferences({ snoozeUntil: undefined });
    };

    /**
     * Apply a patch to this studyset's prefs entry, returning the full updated
     * list — or null when the studyset has no entry yet.
     */
    const patchStudysetPrefs = (
        patch: Partial<StudysetNotificationPrefs>
    ): StudysetNotificationPrefs[] | null => {
        const existingPrefs = preferences.studysetPrefs || [];
        const existingIndex = existingPrefs.findIndex(
            (p) => p.studysetUUID === studysetUUID
        );
        const existing = existingPrefs[existingIndex];
        if (!existing) return null;

        const updatedPrefs = [...existingPrefs];
        updatedPrefs[existingIndex] = { ...existing, ...patch };
        return updatedPrefs;
    };

    const handleStudysetToggle = (enabled: boolean) => {
        if (!studysetUUID) return;

        const updatedPrefs = patchStudysetPrefs({ enabled }) ?? [
            ...(preferences.studysetPrefs || []),
            {
                studysetUUID,
                enabled,
                reminderTime: '09:00',
                reminderDays: [1, 2, 3, 4, 5],
            },
        ];

        updatePreferences({ studysetPrefs: updatedPrefs });
    };

    const handleStudysetReminderTime = (time: string) => {
        if (!studysetUUID) return;

        const updatedPrefs = patchStudysetPrefs({ reminderTime: time });
        if (updatedPrefs) {
            updatePreferences({ studysetPrefs: updatedPrefs });
        }
    };

    const handleStudysetReminderDays = (days: number[]) => {
        if (!studysetUUID) return;

        const updatedPrefs = patchStudysetPrefs({ reminderDays: days });
        if (updatedPrefs) {
            updatePreferences({ studysetPrefs: updatedPrefs });
        }
    };

    const currentStudysetPrefs = useMemo(() => {
        if (!studysetUUID) return null;
        return (
            preferences.studysetPrefs?.find(
                (p) => p.studysetUUID === studysetUUID
            ) ?? null
        );
    }, [studysetUUID, preferences.studysetPrefs]);

    const formatSnoozeEnd = (date: string) => {
        return new Date(date).toLocaleString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <StyledDialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <StandardDialogTitle
                title={t('dialogs.notifications.title')}
                onClose={onClose}
            />

            {/* Error Alert */}
            {error && (
                <Alert severity="warning" sx={{ mx: 3, mt: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Master Toggle */}
            <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider' }}>
                <FormControlLabel
                    control={
                        <Switch
                            checked={isEnabled}
                            onChange={handleToggleMaster}
                        />
                    }
                    label={
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                            <Box>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight={600}
                                >
                                    {t('dialogs.notifications.masterToggle')}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    {t(
                                        'dialogs.notifications.masterToggleDescription'
                                    )}
                                </Typography>
                            </Box>
                            {updateNotificationPrefs.isPending && (
                                <CircularProgress size={16} />
                            )}
                        </Box>
                    }
                    sx={{ m: 0, width: '100%' }}
                />
            </Box>

            {/* Snoozed Alert */}
            {isSnoozed && preferences.snoozeUntil && (
                <Alert
                    severity="info"
                    sx={{ mx: 3, mt: 2 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={handleClearSnooze}
                        >
                            {t('dialogs.notifications.snooze.clear')}
                        </Button>
                    }
                >
                    {t('dialogs.notifications.snooze.activeUntil', {
                        time: formatSnoozeEnd(preferences.snoozeUntil),
                    })}
                </Alert>
            )}

            {/* Mode Selection */}
            {isEnabled && (
                <Box sx={{ px: 3, py: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        {t('dialogs.notifications.modes.title')}
                    </Typography>
                    <ModeCardGrid>
                        {Object.entries(NOTIFICATION_MODES).map(
                            ([key, value]) => (
                                <ModeCard
                                    key={value}
                                    selected={preferences.mode === value}
                                    onClick={() =>
                                        handleModeChange(
                                            value as NotificationMode
                                        )
                                    }
                                    elevation={0}
                                >
                                    <Typography
                                        variant="subtitle2"
                                        fontWeight={600}
                                    >
                                        {t(
                                            `dialogs.notifications.modes.${value}`
                                        )}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        {t(
                                            `dialogs.notifications.modes.${value}Description`
                                        )}
                                    </Typography>
                                </ModeCard>
                            )
                        )}
                    </ModeCardGrid>
                </Box>
            )}

            {/* Tabs */}
            {isEnabled && (
                <>
                    <StyledTabs
                        value={selectedTab}
                        onChange={(_, v) => setSelectedTab(v)}
                        variant="fullWidth"
                    >
                        <Tab
                            value="email"
                            label={t('dialogs.notifications.tabs.email')}
                            icon={<EmailIcon />}
                            iconPosition="start"
                        />
                        <Tab
                            value="schedule"
                            label={t('dialogs.notifications.tabs.schedule')}
                            icon={<ScheduleIcon />}
                            iconPosition="start"
                        />
                        {studysetUUID && (
                            <Tab
                                value="studyset"
                                label={t(
                                    'dialogs.notifications.tabs.thisStudyset'
                                )}
                                icon={<StudysetIcon />}
                                iconPosition="start"
                            />
                        )}
                    </StyledTabs>

                    <DialogContent sx={{ p: 3 }}>
                        {/* Email Tab */}
                        {selectedTab === 'email' && (
                            <NotificationSection>
                                <NotificationRow>
                                    <Box>
                                        <Typography variant="subtitle2">
                                            {t(
                                                'dialogs.notifications.email.studyReminders'
                                            )}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {t(
                                                'dialogs.notifications.email.studyRemindersDescription'
                                            )}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={
                                            preferences.email?.studyReminders ??
                                            false
                                        }
                                        onChange={() =>
                                            handleEmailToggle('studyReminders')
                                        }
                                    />
                                </NotificationRow>

                                <NotificationRow>
                                    <Box>
                                        <Typography variant="subtitle2">
                                            {t(
                                                'dialogs.notifications.email.streakAlerts'
                                            )}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {t(
                                                'dialogs.notifications.email.streakAlertsDescription'
                                            )}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={
                                            preferences.email?.streakAlerts ??
                                            false
                                        }
                                        onChange={() =>
                                            handleEmailToggle('streakAlerts')
                                        }
                                    />
                                </NotificationRow>

                                <NotificationRow>
                                    <Box>
                                        <Typography variant="subtitle2">
                                            {t(
                                                'dialogs.notifications.email.weeklyDigest'
                                            )}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {t(
                                                'dialogs.notifications.email.weeklyDigestDescription'
                                            )}
                                        </Typography>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 2,
                                        }}
                                    >
                                        {preferences.email?.weeklyDigest && (
                                            <FormControl
                                                size="small"
                                                sx={{ minWidth: 120 }}
                                            >
                                                <Select
                                                    value={
                                                        preferences.email
                                                            ?.digestDay ?? 0
                                                    }
                                                    onChange={(e) =>
                                                        handleDigestDayChange(
                                                            e.target
                                                                .value as number
                                                        )
                                                    }
                                                >
                                                    {DAYS_OF_WEEK.map((day) => (
                                                        <MenuItem
                                                            key={day.value}
                                                            value={day.value}
                                                        >
                                                            {day.label}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                        <Switch
                                            checked={
                                                preferences.email
                                                    ?.weeklyDigest ?? false
                                            }
                                            onChange={() =>
                                                handleEmailToggle(
                                                    'weeklyDigest'
                                                )
                                            }
                                        />
                                    </Box>
                                </NotificationRow>

                                <NotificationRow>
                                    <Box>
                                        <Typography variant="subtitle2">
                                            {t(
                                                'dialogs.notifications.email.inactivityNudges'
                                            )}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {t(
                                                'dialogs.notifications.email.inactivityNudgesDescription'
                                            )}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={
                                            preferences.email
                                                ?.inactivityNudges ?? false
                                        }
                                        onChange={() =>
                                            handleEmailToggle(
                                                'inactivityNudges'
                                            )
                                        }
                                    />
                                </NotificationRow>
                            </NotificationSection>
                        )}

                        {/* Schedule Tab */}
                        {selectedTab === 'schedule' && (
                            <NotificationSection>
                                <NotificationRow>
                                    <Box>
                                        <Typography variant="subtitle2">
                                            {t(
                                                'dialogs.notifications.schedule.quietHours'
                                            )}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {t(
                                                'dialogs.notifications.schedule.quietHoursDescription'
                                            )}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={
                                            preferences.quietHours?.enabled ??
                                            false
                                        }
                                        onChange={handleQuietHoursToggle}
                                    />
                                </NotificationRow>

                                {preferences.quietHours?.enabled && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 2,
                                            alignItems: 'center',
                                            pl: 2,
                                        }}
                                    >
                                        <TextField
                                            label={t(
                                                'dialogs.notifications.schedule.startTime'
                                            )}
                                            type="time"
                                            value={
                                                preferences.quietHours?.start ??
                                                '22:00'
                                            }
                                            onChange={(e) =>
                                                handleQuietHoursChange(
                                                    'start',
                                                    e.target.value
                                                )
                                            }
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                        <Typography variant="body2">
                                            {t(
                                                'dialogs.notifications.schedule.to'
                                            )}
                                        </Typography>
                                        <TextField
                                            label={t(
                                                'dialogs.notifications.schedule.endTime'
                                            )}
                                            type="time"
                                            value={
                                                preferences.quietHours?.end ??
                                                '08:00'
                                            }
                                            onChange={(e) =>
                                                handleQuietHoursChange(
                                                    'end',
                                                    e.target.value
                                                )
                                            }
                                            size="small"
                                            InputLabelProps={{ shrink: true }}
                                        />
                                    </Box>
                                )}

                                <Divider sx={{ my: 2 }} />

                                <Box>
                                    <Typography
                                        variant="subtitle2"
                                        gutterBottom
                                    >
                                        <SnoozeIcon
                                            sx={{
                                                verticalAlign: 'middle',
                                                mr: 1,
                                            }}
                                        />
                                        {t(
                                            'dialogs.notifications.snooze.title'
                                        )}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        display="block"
                                        sx={{ mb: 1 }}
                                    >
                                        {t(
                                            'dialogs.notifications.snooze.description'
                                        )}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: 1,
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        {SNOOZE_OPTIONS.map((option) => (
                                            <Button
                                                key={option.value}
                                                variant="outlined"
                                                size="small"
                                                onClick={() =>
                                                    handleSnooze(option.value)
                                                }
                                            >
                                                {option.label}
                                            </Button>
                                        ))}
                                    </Box>
                                </Box>
                            </NotificationSection>
                        )}

                        {/* This Studyset Tab */}
                        {selectedTab === 'studyset' && studysetUUID && (
                            <NotificationSection>
                                <Typography variant="h6" gutterBottom>
                                    {studysetTitle ||
                                        t(
                                            'dialogs.notifications.studyset.thisStudyset'
                                        )}
                                </Typography>

                                <NotificationRow>
                                    <Box>
                                        <Typography variant="subtitle2">
                                            {t(
                                                'dialogs.notifications.studyset.enableReminders'
                                            )}
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {t(
                                                'dialogs.notifications.studyset.enableRemindersDescription'
                                            )}
                                        </Typography>
                                    </Box>
                                    <Switch
                                        checked={
                                            currentStudysetPrefs?.enabled ??
                                            false
                                        }
                                        onChange={(e) =>
                                            handleStudysetToggle(
                                                e.target.checked
                                            )
                                        }
                                    />
                                </NotificationRow>

                                {currentStudysetPrefs?.enabled && (
                                    <>
                                        <Box sx={{ pl: 2 }}>
                                            <Typography
                                                variant="subtitle2"
                                                gutterBottom
                                            >
                                                {t(
                                                    'dialogs.notifications.studyset.reminderTime'
                                                )}
                                            </Typography>
                                            <TextField
                                                type="time"
                                                value={
                                                    currentStudysetPrefs?.reminderTime ??
                                                    '09:00'
                                                }
                                                onChange={(e) =>
                                                    handleStudysetReminderTime(
                                                        e.target.value
                                                    )
                                                }
                                                size="small"
                                                InputLabelProps={{
                                                    shrink: true,
                                                }}
                                            />
                                        </Box>

                                        <Box sx={{ pl: 2 }}>
                                            <Typography
                                                variant="subtitle2"
                                                gutterBottom
                                            >
                                                {t(
                                                    'dialogs.notifications.studyset.reminderDays'
                                                )}
                                            </Typography>
                                            <DayToggleGroup
                                                value={
                                                    currentStudysetPrefs?.reminderDays ??
                                                    []
                                                }
                                                onChange={(_, newDays) =>
                                                    handleStudysetReminderDays(
                                                        newDays
                                                    )
                                                }
                                            >
                                                {DAYS_OF_WEEK.map((day) => (
                                                    <ToggleButton
                                                        key={day.value}
                                                        value={day.value}
                                                    >
                                                        {day.short}
                                                    </ToggleButton>
                                                ))}
                                            </DayToggleGroup>
                                        </Box>
                                    </>
                                )}
                            </NotificationSection>
                        )}
                    </DialogContent>
                </>
            )}
        </StyledDialog>
    );
};

export default NotificationsDialog;
