import {
    DarkMode,
    Label,
    Launch,
    LightMode,
    Palette,
    DateRange as DateRangeIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import {
    Button,
    CircularProgress,
    MenuItem,
    Select,
    SelectChangeEvent,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import NamedColorsDialog from 'components/NamedColorsDialog/NamedColorsDialog';
import { useEffect, useMemo, useState } from 'react';
import { DARK, DATE_FORMATS, LIGHT } from 'shared/constants';
import { SimpleFlexContainer } from 'shared/styles/AppStyles';
import { PreferredDateFormat, User } from 'shared/types';
import { useUpdateUserMetadataMutation } from 'state/api/usersAPI';
import { ActionColumn, ActionHeader } from './ProfileStyles';
import { downloadTypeItems } from 'views/ViewStudySet/DownloadSetModal/DownloadSetModal';
import { useGlobalStore } from 'state/stores/global';

const LOADING_IDS = {
    DATE_FORMAT: 'preferredDateFormat',
    DOWNLOAD_FORMAT: 'defaultDownloadFormat',
    DEFAULT_THEME: 'defaultTheme',
};

type Props = {
    userData: User;
};

const CustomizationTab = ({ userData }: Props) => {
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
            defaultDownloadFormat,
        },
    } = userData;

    const [loadingID, setLoadingID] = useState<string>('');

    const defaultThemeLoading = useMemo(() => {
        return loadingID === LOADING_IDS.DEFAULT_THEME;
    }, [loadingID]);

    const dateFormatLoading = useMemo(() => {
        return loadingID === LOADING_IDS.DATE_FORMAT;
    }, [loadingID]);

    const downloadFormatLoading = useMemo(() => {
        return loadingID === LOADING_IDS.DOWNLOAD_FORMAT;
    }, [loadingID]);

    const [
        updateUserMetadata,
        {
            isLoading: isUpdateMetadataLoading,
            isSuccess: isUpdateMetadataSuccess,
            isError: isUpdateMetadataError,
        },
    ] = useUpdateUserMetadataMutation();

    /**
     * Update user's selected default theme
     */
    const handleDefaultTheme = async (event, newTheme) => {
        try {
            console.log({ newTheme });
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
                .unwrap()
                .then(() => {
                    console.log(`Default theme updated successfully`);
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

    // #region Date Format, Default Download Format
    const handleSelectChange = (
        event: SelectChangeEvent<PreferredDateFormat>
    ) => {
        setLoadingID(event.target.name);
        updateUserMetadata({
            updates: {
                [event.target.name]: event.target.value,
            },
        })
            .unwrap()
            .then(() => {
                console.log(`${event.target.name} updated successfully`);
            })
            .catch((error) => {
                console.error(`Failed to update ${event.target.name}:`, error);
            })
            .finally(() => {
                setLoadingID('');
            });
    };

    // #endregion

    return (
        <>
            <ActionColumn>
                <ActionHeader>
                    <DarkMode />
                    <Typography variant="h6">Default Theme</Typography>
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
                            title="Switch default to Light mode"
                        >
                            <LightMode />
                        </ToggleButton>
                        <ToggleButton
                            value={DARK}
                            title="Switch default to Dark mode"
                        >
                            <DarkMode />
                        </ToggleButton>
                    </ToggleButtonGroup>
                    {defaultThemeLoading && <CircularProgress size={24} />}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <Label />
                    <Typography variant="h6">Labels</Typography>
                </ActionHeader>
                <Button
                    variant="outlined"
                    startIcon={<Launch />}
                    onClick={showManageLabelsDialog}
                >
                    Manage Labels
                </Button>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <Palette />
                    <Typography variant="h6">Named Colors</Typography>
                </ActionHeader>
                <Button
                    variant="outlined"
                    startIcon={<Launch />}
                    onClick={openNamedColorsDialog}
                >
                    Manage Named Colors
                </Button>
                {namedColorsDialogProps.open && <NamedColorsDialog />}
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <DateRangeIcon />
                    <Typography variant="h6">Date Format</Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <Select
                        value={preferredDateFormat}
                        onChange={handleSelectChange}
                        disabled={dateFormatLoading}
                        name={LOADING_IDS.DATE_FORMAT}
                        sx={{
                            width: '10rem',
                        }}
                    >
                        {Object.entries(DATE_FORMATS).map(([key, value]) => (
                            <MenuItem key={key} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                    {dateFormatLoading && <CircularProgress size={24} />}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
            <ActionColumn>
                <ActionHeader>
                    <DownloadIcon />
                    <Typography variant="h6">
                        Default Download Format
                    </Typography>
                </ActionHeader>
                <SimpleFlexContainer style={{ gap: '1rem' }}>
                    <Select
                        // @ts-ignore
                        value={defaultDownloadFormat}
                        onChange={handleSelectChange}
                        disabled={downloadFormatLoading}
                        name={LOADING_IDS.DOWNLOAD_FORMAT}
                        sx={{
                            width: '10rem',
                        }}
                    >
                        {downloadTypeItems}
                    </Select>
                    {downloadFormatLoading && <CircularProgress size={24} />}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
        </>
    );
};

export default CustomizationTab;
