import {
    Menu,
    MenuItem,
    FormControlLabel,
    Switch,
    Typography,
} from '@mui/material';
import { SET_METADATA_FIELDS } from 'shared/constants';
import { Studyset, StudysetMetadata, TODO } from 'shared/types';
import { useTheme } from 'theme/useTheme';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isPublishEnabled } from 'shared/featureFlags';

type Props = {
    anchorEl: Element | null;
    onClose: () => void;
    open: boolean;
    selectedStudyset: Studyset | undefined;
    updateMetadataState: (property: string) => void;
    onOpenPublish: () => void;
};

const ControlMenu = ({
    anchorEl,
    onClose,
    open,
    selectedStudyset,
    updateMetadataState,
    onOpenPublish,
}: Props) => {
    const { muiTheme } = useTheme();
    const { t } = useTranslation();

    const metadata: Partial<StudysetMetadata> = selectedStudyset?.metadata ?? {};
    const {
        backgroundColorVisible = false,
        publiclyViewable = false,
        textColorVisible = false,
        contentOnly = false,
    } = metadata;

    // A non-owner viewing someone else's set gets an empty selectedStudyset.
    const canPublish = isPublishEnabled() && !!selectedStudyset?.studysetUUID;

    const menuItems = useMemo(
        () => [
            {
                condition: textColorVisible,
                updateProperty: SET_METADATA_FIELDS.TEXT,
                label: t('viewStudySet.textColor'),
                description: t('viewStudySet.textColorDescription'),
            },
            {
                condition: backgroundColorVisible,
                updateProperty: SET_METADATA_FIELDS.BACKGROUND,
                label: t('viewStudySet.backgroundColor'),
                description: t('viewStudySet.backgroundColorDescription'),
            },
            {
                condition: contentOnly,
                updateProperty: SET_METADATA_FIELDS.CONTENT_ONLY,
                label: t('viewStudySet.contentOnly'),
                description: t('viewStudySet.contentOnlyDescription'),
            },
        ],
        [textColorVisible, backgroundColorVisible, contentOnly, t]
    );

    return (
        <Menu open={open} onClose={onClose} anchorEl={anchorEl}>
            {menuItems.map(
                ({ condition, updateProperty, label, description }) => {
                    return (
                        <MenuItem key={updateProperty}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        size="small"
                                        checked={condition}
                                        onChange={() =>
                                            updateMetadataState(updateProperty)
                                        }
                                    />
                                }
                                label={
                                    <Typography
                                        sx={{
                                            color: condition
                                                ? muiTheme.palette.success.main
                                                : muiTheme.palette.error.main,
                                        }}
                                    >
                                        {t('viewStudySet.settingStatus', {
                                            label,
                                            status: t(
                                                condition
                                                    ? 'status.enabled'
                                                    : 'status.disabled'
                                            ),
                                        })}
                                    </Typography>
                                }
                                title={description}
                            />
                        </MenuItem>
                    );
                }
            )}
            {canPublish && (
                <MenuItem onClick={onOpenPublish}>
                    {t(
                        publiclyViewable
                            ? 'publish.menuManage'
                            : 'publish.menuPublish'
                    )}
                </MenuItem>
            )}
        </Menu>
    );
};

export default ControlMenu;
