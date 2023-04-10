
import { FormControlLabel, IconButton, Menu, MenuItem, Switch, Typography } from '@mui/material/';
import { Download, EditNotifications, MenuOpen } from '@mui/icons-material/';
import { 
    DISABLED, 
    ENABLED,
    SET_METADATA_FIELDS
} from "src/utilities/constants";
import { useTheme } from "src/theme/useTheme";


type Props = {
    controlAnchorRef: any;
    disableBackgroundColor: any;
    disableTextColor: any;
    updateMetadataField: any;
    metadata: any;
    setDisableBackgroundColor: any;
    setDisableTextColor: any;
    setShowControlMenu: any;
    setShowDownloadPopup: any;
    setShowNotificationsModal: any;
    setStudySetViewable: any;
    showControlMenu: any;
    studySetViewable: any;
}

const ActionsSection = (props: Props) => {
    const {
        controlAnchorRef,
        disableBackgroundColor,
        disableTextColor,
        updateMetadataField,
        metadata = {},
        setDisableBackgroundColor,
        setDisableTextColor,
        setShowControlMenu,
        setShowDownloadPopup,
        setShowNotificationsModal,
        setStudySetViewable,
        showControlMenu,
        studySetViewable,
    } = props;

    console.log({metadata});

    const { theme } = useTheme();

    const handleOpenControlMenu = () => {
        setShowControlMenu(true);
    }

    const handleCloseControlMenu = () => {
        setShowControlMenu(false);
    }

    const updateMetadataState = (property: string) => {
        let newValue;
        let setStateCallback;
        switch (property) {
            case SET_METADATA_FIELDS.TEXT:
                newValue = !disableTextColor
                setStateCallback = setDisableTextColor;
                break;
            case SET_METADATA_FIELDS.BACKGROUND:
                newValue = !disableBackgroundColor
                setStateCallback = setDisableBackgroundColor;
                break;
            case SET_METADATA_FIELDS.PUBLIC:
                newValue = !studySetViewable
                setStateCallback = setStudySetViewable;
                break;
        }
        setStateCallback(newValue);
        updateMetadataField(property, newValue);
    }

    return (
        <>
            <div style={{ marginTop: "1rem" }}>
                <IconButton
                    onClick={() => setShowDownloadPopup(true)}
                    sx={{
                        padding: "0.75rem"
                    }}
                >
                    <Download />
                </IconButton>
                <Typography
                    component="span"
                >
                    Download
                </Typography>
            </div>
            <div>
                <IconButton
                    onClick={() => setShowNotificationsModal(true)}
                    sx={{
                        padding: "0.75rem"
                    }}
                >
                    <EditNotifications />
                </IconButton>
                <Typography
                    component="span"
                >
                    Manage Notifications
                </Typography>
            </div>
            <div
                ref={controlAnchorRef}
            >
                <IconButton
                    onClick={handleOpenControlMenu}
                    sx={{
                        padding: "0.75rem"
                    }}
                >
                    <MenuOpen />
                </IconButton>

                <Typography
                    component="span"
                >
                    Control Menu
                </Typography>
            </div>
            <Menu
                open={showControlMenu}
                onClose={handleCloseControlMenu}
                anchorEl={controlAnchorRef.current}
            >
                <MenuItem>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={disableTextColor}
                                onChange={() => updateMetadataState(SET_METADATA_FIELDS.TEXT)}
                            />
                        } label={
                            <Typography
                                sx={{
                                    color: disableTextColor ? theme.palette.error.main : theme.palette.success.main
                                }}
                            >
                                {`Text Color: ${disableTextColor ? DISABLED : ENABLED}`}
                            </Typography>
                        }
                    />
                </MenuItem>
                <MenuItem>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={disableBackgroundColor}
                                onChange={() => updateMetadataState(SET_METADATA_FIELDS.BACKGROUND)}
                            />
                        }
                        label={
                            <Typography
                                sx={{
                                    color: disableBackgroundColor ? theme.palette.error.main : theme.palette.success.main
                                }}
                            >
                                {`Background Color: ${disableBackgroundColor ? DISABLED : ENABLED}`}
                            </Typography>
                        }
                    />
                </MenuItem>
                <MenuItem>
                    <FormControlLabel control={
                        <Switch
                            size="small"
                            checked={studySetViewable}
                            onChange={() => updateMetadataState(SET_METADATA_FIELDS.PUBLIC)}
                            />
                    } label={
                        <Typography
                            sx={{
                                color: studySetViewable ?  theme.palette.success.main : theme.palette.error.main
                            }}
                        >
                            {`Viewable: ${studySetViewable ? "Public" : "Private"}`}
                        </Typography>
                    }
                    />
                </MenuItem>
            </Menu>
        </>
    )
}

export default ActionsSection;