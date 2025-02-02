import {
    DarkMode,
    Label,
    Launch,
    LightMode,
    Palette,
    DateRange as DateRangeIcon,
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
import { useEffect, useState } from 'react';
import { DARK, DATE_FORMATS, LIGHT } from 'shared/constants';
import { SimpleFlexContainer } from 'shared/styles/AppStyles';
import { PreferredDateFormat, User } from 'shared/types';
import { useUpdateUserMetadataMutation } from 'state/api/usersAPI';
import { useAppDispatch, useAppSelector } from 'state/reduxHooks';
import {
    selectNamedColorsDialogProps,
    setLabelsDialogProps,
    setNamedColorsDialogProps,
    setUserData,
} from 'state/slices/globalSlice';
import { ActionColumn, ActionHeader } from './ProfileStyles';

type Props = {
    userData: User;
};

const CustomizationTab = ({ userData }: Props) => {
    const dispatch = useAppDispatch();

    const {
        userUUID = '',
        labels = [],
        metadata: { preferredDateFormat },
    } = userData;
    const namedColorsDialogProps = useAppSelector(selectNamedColorsDialogProps);
    const [defaultTheme, setDefaultTheme] = useState<string>(
        userData?.metadata?.defaultTheme ?? 'dark'
    );
    const [isSelectLoading, setIsSelectLoading] = useState<boolean>(false);

    const [
        updateUserMetadata,
        {
            isLoading: isUpdateMetadataLoading,
            isSuccess: isUpdateMetadataSuccess,
            isError: isUpdateMetadataError,
        },
    ] = useUpdateUserMetadataMutation();

    useEffect(() => {
        if (userData?.metadata?.defaultTheme) {
            setDefaultTheme(userData.metadata.defaultTheme);
        }
    }, []);

    /**
     * Update user's selected default theme
     */
    const handleDefaultTheme = async (event, newTheme) => {
        try {
            /* Don't take any action if selected theme is the same */
            if (!userUUID || newTheme === null || newTheme === defaultTheme) {
                return;
            }

            // const themeUpdateResult = await axios.post(
            //     "/api/users/updateDefaultTheme",
            //     {
            //         uuid: userUUID,
            //         newTheme,
            //     }
            // );
            // console.log({ themeUpdateResult });

            setDefaultTheme(newTheme);

            const newUserData = {
                ...userData,
                metadata: {
                    ...userData.metadata,
                    defaultTheme: newTheme,
                },
            };
            console.log({ newUserData });
            dispatch(setUserData(newUserData));
        } catch (error) {
            console.error('Error updating default theme');
        }
    };

    const openNamedColorsDialog = () => {
        dispatch(
            setNamedColorsDialogProps({
                open: true,
            })
        );
    };

    const showManageLabelsDialog = () => {
        dispatch(
            setLabelsDialogProps({
                open: true,
            })
        );
    };

    const handlePreferredDateFormatChange = (
        event: SelectChangeEvent<PreferredDateFormat>
    ) => {
        setIsSelectLoading(true);
        updateUserMetadata({
            updates: {
                preferredDateFormat: event.target.value,
            },
        })
            .unwrap()
            .then(() => {
                console.log('Date format updated successfully');
            })
            .catch((error) => {
                console.error('Failed to update date format:', error);
            })
            .finally(() => {
                setIsSelectLoading(false);
            });
    };

    return (
        <>
            <ActionColumn>
                <ActionHeader>
                    <DarkMode />
                    <Typography variant="h6">Default Theme</Typography>
                </ActionHeader>
                <ToggleButtonGroup
                    aria-label="Set default theme"
                    exclusive
                    onChange={handleDefaultTheme}
                    value={defaultTheme}
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
                        value={preferredDateFormat ?? DATE_FORMATS.MDY}
                        onChange={handlePreferredDateFormatChange}
                        disabled={isSelectLoading}
                    >
                        {Object.entries(DATE_FORMATS).map(([key, value]) => (
                            <MenuItem key={key} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                    {isSelectLoading && <CircularProgress size={24} />}{' '}
                </SimpleFlexContainer>
            </ActionColumn>
        </>
    );
};

export default CustomizationTab;
