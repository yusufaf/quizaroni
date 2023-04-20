import {
    Button,
    FormControlLabel,
    IconButton,
    Menu,
    MenuItem,
    Switch,
    Typography,
    Tooltip,
    Paper,
} from "@mui/material/";
import {
    Download,
    Edit,
    EditNotifications,
    MenuOpen,
} from "@mui/icons-material/";
import {
    DISABLED,
    ENABLED,
    SET_METADATA_FIELDS,
} from "src/utilities/constants";
import { useTheme } from "src/theme/useTheme";
import { ActionButtonsRow } from "../ViewFlashSetStyles";
import { useNavigate, useParams } from "react-router-dom";

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
};

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

    console.log({ metadata });

    const { theme } = useTheme();
    const navigate = useNavigate();
    const {id: studysetId} = useParams();

    const handleOpenControlMenu = () => {
        setShowControlMenu(true);
    };

    const handleCloseControlMenu = () => {
        setShowControlMenu(false);
    };

    const updateMetadataState = (property: string) => {
        let newValue;
        let setStateCallback;
        switch (property) {
            case SET_METADATA_FIELDS.TEXT:
                newValue = !enableTextColor;
                setStateCallback = setEnableTextColor;
                break;
            case SET_METADATA_FIELDS.BACKGROUND:
                newValue = !enableBackgroundColor;
                setStateCallback = setEnableBackgroundColor;
                break;
            case SET_METADATA_FIELDS.PUBLIC:
                newValue = !studySetViewable;
                setStateCallback = setStudySetViewable;
                break;
        }
        setStateCallback(newValue);
        updateMetadataField(property, newValue);
    };

    const handleEditClick = () => {
        navigate(`/edit/${studysetId}`);
    }

    return (
        <>
            <ActionButtonsRow >
                <Tooltip title="Edit Study Set">
                    <IconButton color="primary"
                        onClick={handleEditClick}
                    >
                        <Edit />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Download">
                    <IconButton
                        onClick={() => setShowDownloadPopup(true)}
                        color="primary"
                    >
                        <Download />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Manage Notifications">
                    <IconButton
                        onClick={() => setShowNotificationsModal(true)}
                        color="primary"
                    >
                        <EditNotifications />
                    </IconButton>
                </Tooltip>

                <Tooltip title="Control Menu" ref={controlAnchorRef}>
                    <IconButton onClick={handleOpenControlMenu} color="primary">
                        <MenuOpen />
                    </IconButton>
                </Tooltip>
            </ActionButtonsRow>
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
                                onChange={() =>
                                    updateMetadataState(
                                        SET_METADATA_FIELDS.TEXT
                                    )
                                }
                            />
                        }
                        label={
                            <Typography
                                sx={{
                                    color: enableTextColor
                                        ? theme.palette.success.main
                                        : theme.palette.error.main,
                                }}
                            >
                                {`Text Color: ${
                                    enableTextColor ? ENABLED : DISABLED
                                }`}
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
                                onChange={() =>
                                    updateMetadataState(
                                        SET_METADATA_FIELDS.BACKGROUND
                                    )
                                }
                            />
                        }
                        label={
                            <Typography
                                sx={{
                                    color: enableBackgroundColor
                                        ? theme.palette.success.main
                                        : theme.palette.error.main,
                                }}
                            >
                                {`Background Color: ${
                                    enableBackgroundColor ? ENABLED : DISABLED
                                }`}
                            </Typography>
                        }
                    />
                </MenuItem>
                <MenuItem>
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={studySetViewable}
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
                                    color: studySetViewable
                                        ? theme.palette.success.main
                                        : theme.palette.error.main,
                                }}
                            >
                                {`Viewable: ${
                                    studySetViewable ? "Public" : "Private"
                                }`}
                            </Typography>
                        }
                    />
                </MenuItem>
            </Menu>
        </>
    );
};

export default ActionsSection;
