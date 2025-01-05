import {
    Menu,
    MenuItem,
    FormControlLabel,
    Switch,
    Typography,
} from '@mui/material';
import { SET_METADATA_FIELDS, ENABLED, DISABLED } from 'shared/constants';
import { Studyset, TODO } from 'shared/types';
import { useTheme } from 'theme/useTheme';
import { useMemo } from 'react';

type Props = {
    anchorEl: Element | null;
    onClose: () => void;
    open: boolean;
    selectedStudyset: Studyset | undefined;
    updateMetadataState: any;
};

const ControlMenu = ({
    anchorEl,
    onClose,
    open,
    selectedStudyset,
    updateMetadataState,
}: Props) => {
    const { muiTheme } = useTheme();

    const { metadata = {} } = selectedStudyset || {};
    const {
        // @ts-ignore
        backgroundColorVisible = false,
        // @ts-ignore
        publiclyViewable = false,
        // @ts-ignore
        textColorVisible = false,
        // @ts-ignore
        contentOnly = false,
    } = metadata;

    const menuItems = useMemo(
        () => [
            {
                condition: textColorVisible,
                updateProperty: SET_METADATA_FIELDS.TEXT,
                label: 'Text Color',
                description:
                    'If enabled, text color for the term/definition will be applied/visible.',
            },
            {
                condition: backgroundColorVisible,
                updateProperty: SET_METADATA_FIELDS.BACKGROUND,
                label: 'Background Color',
                description:
                    'If enabled, background color for cards will be applied/visible.',
            },
            {
                condition: contentOnly,
                updateProperty: SET_METADATA_FIELDS.CONTENT_ONLY,
                label: 'Content Only',
                description:
                    'If enabled, buttons and labels on all cards will be hidden.',
            },
        ],
        [textColorVisible, backgroundColorVisible, contentOnly]
    );

    return (
        <Menu open={open} onClose={onClose} anchorEl={anchorEl}>
            {menuItems.map(
                ({ condition, updateProperty, label, description }) => {
                    return (
                        <MenuItem>
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
                                        {`${label}: ${
                                            condition ? ENABLED : DISABLED
                                        }`}
                                    </Typography>
                                }
                                title={description}
                            />
                        </MenuItem>
                    );
                }
            )}
            {/* <MenuItem>
        <FormControlLabel
            control={
                <Switch
                    size="small"
                    checked={publiclyViewable}
                    onChange={() =>
                        updateMetadataState(
                            SET_METADATA_FIELDS.PUBLIC
                        )
                    }
                />
            }
            label={
                <Typography
                    sx={{
                        color: publiclyViewable
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                    }}
                >
                    {`Viewable: ${
                        publiclyViewable ? "Public" : "Private"
                    }`}
                </Typography>
            }
        />
    </MenuItem> */}
        </Menu>
    );
};

export default ControlMenu;
