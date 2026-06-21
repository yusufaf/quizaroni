import {
    AccessTime as AccessTimeIcon,
    DarkMode,
    Label,
    Language as LanguageIcon,
    Launch,
    LightMode,
    Notifications as NotificationsIcon,
    Palette,
    DateRange as DateRangeIcon,
    Download as DownloadIcon,
    WarningAmber as WarningIcon,
    RecordVoiceOver,
} from '@mui/icons-material';
import {
    Button,
    CircularProgress,
    MenuItem,
    Select,
    SelectChangeEvent,
    Switch,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import NamedColorsDialog from 'components/NamedColorsDialog/NamedColorsDialog';
import useSpeechVoices from 'shared/hooks/useSpeechVoices';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DARK,
    DATE_FORMATS,
    DOWNLOAD_FILE_TYPES,
    LIGHT,
    TIME_FORMATS,
} from 'shared/constants';
import { SimpleFlexContainer } from 'shared/styles/AppStyles';
import { PreferredDateFormat, User } from 'shared/types';
import { useUpdateUserMetadata } from 'state/api/usersAPI';
import {
    ActionColumn,
    ActionHeader,
    SimpleSelect,
    AccountViewContainer,
} from './ProfileStyles';
import { useGlobalStore } from 'state/stores/global';
import NotificationsDialog from 'views/ViewStudySet/NotificationsDialog/NotificationsDialog';
import { downloadTypeItems } from 'shared/components/downloadTypeItems';

const LOADING_IDS = {
    DATE_FORMAT: 'preferredDateFormat',
    TIME_FORMAT: 'preferredTimeFormat',
    SHOW_SECONDS: 'showSeconds',
    CONFIRM_DESTRUCTIVE: 'confirmDestructiveActions',
    DOWNLOAD_FORMAT: 'defaultDownloadFormat',
    DEFAULT_THEME: 'defaultTheme',
    TTS_VOICE: 'ttsVoice',
};

type Props = {
    userData: User;
};

const CustomizationTab = ({ userData }: Props) => {
    const { t, i18n } = useTranslation();

    const {
        setNamedColorsDialogProps,
        setLabelsDialogProps,
        namedColorsDialogProps,
    } = useGlobalStore();

    const {
        userUUID = '',
        labels = [],
        metadata: {
            defaultTheme = 'dark',
            preferredDateFormat,
            preferredTimeFormat = TIME_FORMATS.TWELVE_HOUR,
            showSeconds = false,
            confirmDestructiveActions = true,
            defaultDownloadFormat = DOWNLOAD_FILE_TYPES.JSON,
            ttsVoice = '',
        },
    } = userData;

    const [loadingID, setLoadingID] = useState<string>('');
    const [notificationsDialogOpen, setNotificationsDialogOpen] =
        useState(false);

    const defaultThemeLoading = useMemo(() => {
        return loadingID === LOADING_IDS.DEFAULT_THEME;
    }, [loadingID]);

    const dateFormatLoading = useMemo(() => {
        return loadingID === LOADING_IDS.DATE_FORMAT;
    }, [loadingID]);

    const timeFormatLoading = useMemo(() => {
        return loadingID === LOADING_IDS.TIME_FORMAT;
    }, [loadingID]);

    const secondsLoading = useMemo(() => {
        return loadingID === LOADING_IDS.SHOW_SECONDS;
    }, [loadingID]);

    const confirmDestructiveLoading = useMemo(() => {
        return loadingID === LOADING_IDS.CONFIRM_DESTRUCTIVE;
    }, [loadingID]);

    const downloadFormatLoading = useMemo(() => {
        return loadingID === LOADING_IDS.DOWNLOAD_FORMAT;
    }, [loadingID]);

    const ttsVoiceLoading = useMemo(() => {
        return loadingID === LOADING_IDS.TTS_VOICE;
    }, [loadingID]);

    const { voices } = useSpeechVoices();

    const { mutateAsync: updateUserMetadata } = useUpdateUserMetadata();

    /**
     * Update user's selected default theme
     */
    const handleDefaultTheme = async (event, newTheme) => {
        try {
            /* Don't take any action if selected theme is the same */
            if (!userUUID || newTheme === null || newTheme === defaultTheme) {
                return;
            }

            setLoadingID(LOADING_IDS.DEFAULT_THEME);

            updateUserMetadata({
                updates: {
                    defaultTheme: newTheme,
                },
            })
                .catch((error) => {
                    console.error(`Failed to update default theme:`, error);
                })
                .finally(() => {
                    setLoadingID('');
                });
        } catch (error) {
            console.error('Error updating default theme');
        }
    };

    // #region Named Colors
    const openNamedColorsDialog = () => {
        setNamedColorsDialogProps({
            open: true,
        });
    };
    // #endregion

    // #region Labels
    const showManageLabelsDialog = () => {
        setLabelsDialogProps({
            open: true,
        });
    };
    // #endregion

    // #region Date Format, Time Format, Default Download Format
    const handleSelectChange = (event: SelectChangeEvent<unknown>) => {
        setLoadingID(event.target.name);
        updateUserMetadata({
            updates: {
                [event.target.name]: event.target.value,
            },
        })
            .catch((error) => {
                console.error(`Failed to update ${event.target.name}:`, error);
            })
            .finally(() => {
                setLoadingID('');
            });
    };

    const handleShowSecondsToggle = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setLoadingID(LOADING_IDS.SHOW_SECONDS);
        updateUserMetadata({
            updates: {
                showSeconds: event.target.checked,
            },
        })
            .catch((error) => {
                console.error(
                    'Failed to update show seconds preference:',
                    error
                );
            })
            .finally(() => {
                setLoadingID('');
            });
    };

    const handleConfirmDestructiveToggle = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setLoadingID(LOADING_IDS.CONFIRM_DESTRUCTIVE);
        updateUserMetadata({
            updates: {
                confirmDestructiveActions: event.target.checked,
            },
        })
            .catch((error) => {
                console.error(
                    'Failed to update confirm destructive actions preference:',
                    error
                );
            })
            .finally(() => {
                setLoadingID('');
            });
    };

    // #endregion

    // #region Language
    const handleLanguageChange = (event: SelectChangeEvent<unknown>) => {
        i18n.changeLanguage(event.target.value as string);
    };
    // #endregion

    return (
        <AccountViewContainer>
            <ActionColumn>
                <ActionHeader>
                    <DarkMode />
                    <Typography variant="h6">
                        {t('profile.defaultTheme')}
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <ToggleButtonGroup
                        aria-label="Set default theme"
                        exclusive
                        onChange={handleDefaultTheme}
                        value={defaultTheme}
                        disabled={defaultThemeLoading}
                    >
                        <ToggleButton
                            value={LIGHT}
                            title={t('profile.switchToLight')}
                        >
                            <LightMode />
                        </ToggleButton>
                        <ToggleButton
                            value={DARK}
                            title={t('profile.switchToDark')}
                        >
                            <DarkMode />
                        </ToggleButton>
                    </ToggleButtonGroup>
                    {defaultThemeLoading && <CircularProgress size={24} />}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <LanguageIcon />
                    <Typography variant="h6">
                        {t('profile.interfaceLanguage')}
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <SimpleSelect
                        value={i18n.language?.split('-')[0] || 'en'}
                        onChange={handleLanguageChange}
                        sx={{
                            height: '2.5rem',
                            width: '10rem',
                        }}
                    >
                        <MenuItem value="en">{t('languages.en')}</MenuItem>
                        <MenuItem value="es">{t('languages.es')}</MenuItem>
                    </SimpleSelect>
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <Label />
                    <Typography variant="h6">{t('profile.labels')}</Typography>
                </ActionHeader>
                <Button
                    variant="outlined"
                    startIcon={<Launch />}
                    onClick={showManageLabelsDialog}
                >
                    {t('profile.manageLabels')}
                </Button>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <Palette />
                    <Typography variant="h6">
                        {t('profile.namedColors')}
                    </Typography>
                </ActionHeader>
                <Button
                    variant="outlined"
                    startIcon={<Launch />}
                    onClick={openNamedColorsDialog}
                >
                    {t('profile.manageNamedColors')}
                </Button>
                {namedColorsDialogProps.open && <NamedColorsDialog />}
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <NotificationsIcon />
                    <Typography variant="h6">
                        {t('profile.notifications')}
                    </Typography>
                </ActionHeader>
                <Button
                    variant="outlined"
                    startIcon={<Launch />}
                    onClick={() => setNotificationsDialogOpen(true)}
                >
                    {t('profile.manageNotifications')}
                </Button>
                <NotificationsDialog
                    open={notificationsDialogOpen}
                    onClose={() => setNotificationsDialogOpen(false)}
                />
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <DateRangeIcon />
                    <Typography variant="h6">
                        {t('profile.dateFormat')}
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <SimpleSelect
                        value={preferredDateFormat}
                        onChange={handleSelectChange}
                        disabled={dateFormatLoading}
                        name={LOADING_IDS.DATE_FORMAT}
                        sx={{
                            height: '2.5rem',
                            width: '10rem',
                        }}
                    >
                        {Object.entries(DATE_FORMATS).map(([key, value]) => (
                            <MenuItem key={key} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </SimpleSelect>
                    {dateFormatLoading && <CircularProgress size={24} />}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <AccessTimeIcon />
                    <Typography variant="h6">
                        {t('profile.timeFormat')}
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <SimpleSelect
                        value={preferredTimeFormat}
                        onChange={handleSelectChange}
                        disabled={timeFormatLoading}
                        name={LOADING_IDS.TIME_FORMAT}
                        sx={{
                            height: '2.5rem',
                            minWidth: '14rem',
                        }}
                    >
                        <MenuItem value={TIME_FORMATS.TWELVE_HOUR}>
                            {t('profile.twelveHour')}
                        </MenuItem>
                        <MenuItem value={TIME_FORMATS.TWENTY_FOUR_HOUR}>
                            {t('profile.twentyFourHour')}
                        </MenuItem>
                    </SimpleSelect>
                    {timeFormatLoading && <CircularProgress size={24} />}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <AccessTimeIcon />
                    <Typography variant="h6">
                        {t('profile.showSecondsInTimestamps')}
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer
                    style={{ gap: '1rem', alignItems: 'center' }}
                >
                    <Switch
                        checked={showSeconds}
                        onChange={handleShowSecondsToggle}
                        disabled={secondsLoading}
                    />
                    {secondsLoading && <CircularProgress size={24} />}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <WarningIcon />
                    <Typography variant="h6">
                        {t('profile.confirmDestructiveActions')}
                    </Typography>
                </ActionHeader>
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: '0.5rem' }}
                >
                    {t('profile.confirmDestructiveActionsDescription')}
                </Typography>
                <SimpleFlexContainer
                    style={{ gap: '1rem', alignItems: 'center' }}
                >
                    <Switch
                        checked={confirmDestructiveActions}
                        onChange={handleConfirmDestructiveToggle}
                        disabled={confirmDestructiveLoading}
                    />
                    {confirmDestructiveLoading && (
                        <CircularProgress size={24} />
                    )}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <DownloadIcon />
                    <Typography variant="h6">
                        {t('profile.defaultDownloadFormat')}
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <SimpleSelect
                        value={defaultDownloadFormat}
                        onChange={handleSelectChange}
                        disabled={downloadFormatLoading}
                        name={LOADING_IDS.DOWNLOAD_FORMAT}
                        sx={{
                            height: '2.5rem',
                            width: '10rem',
                        }}
                    >
                        {downloadTypeItems}
                    </SimpleSelect>
                    {downloadFormatLoading && (
                        <CircularProgress size={24} />
                    )}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <RecordVoiceOver />
                    <Typography variant="h6">
                        {t('profile.ttsVoice')}
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <SimpleSelect
                        value={ttsVoice}
                        onChange={handleSelectChange}
                        disabled={ttsVoiceLoading}
                        displayEmpty
                        name={LOADING_IDS.TTS_VOICE}
                        sx={{
                            height: '2.5rem',
                            minWidth: '16rem',
                        }}
                    >
                        <MenuItem value="">
                            {t('profile.defaultTtsVoice')}
                        </MenuItem>
                        {voices.map((voice) => (
                            <MenuItem
                                key={voice.voiceURI}
                                value={voice.voiceURI}
                            >
                                {voice.name} ({voice.lang})
                            </MenuItem>
                        ))}
                    </SimpleSelect>
                    {ttsVoiceLoading && <CircularProgress size={24} />}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
        </AccountViewContainer>
    );
};

export default CustomizationTab;
