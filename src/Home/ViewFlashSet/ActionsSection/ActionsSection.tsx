
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
    enableBackgroundColor: any;
    enableTextColor: any;
    updateMetadataField: any;
    metadata: any;
    setEnableBackgroundColor: any;
    setEnableTextColor: any;
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
        enableBackgroundColor,
        enableTextColor,
        updateMetadataField,
        metadata = {},
        setEnableBackgroundColor,
        setEnableTextColor,
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
                newValue = !enableTextColor
                setStateCallback = setEnableTextColor;
                break;
            case SET_METADATA_FIELDS.BACKGROUND:
                newValue = !enableBackgroundColor
                setStateCallback = setEnableBackgroundColor;
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
                                checked={enableTextColor}
                                onChange={() => updateMetadataState(SET_METADATA_FIELDS.TEXT)}
                            />
                        } label={
                            <Typography
                                sx={{
                                    color: enableTextColor ? theme.palette.success.main : theme.palette.error.main 
                                }}
                            >
                                {`Text Color: ${enableTextColor ? ENABLED : DISABLED}`}
                            </Typography>
                        }
                    />
                </MenuItem>
                <MenuItem>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={enableBackgroundColor}
                                onChange={() => updateMetadataState(SET_METADATA_FIELDS.BACKGROUND)}
                            />
                        }
                        label={
                            <Typography
                                sx={{
                                    color: enableBackgroundColor ? theme.palette.success.main : theme.palette.error.main 
                                }}
                            >
                                {`Background Color: ${enableBackgroundColor ? ENABLED : DISABLED}`}
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