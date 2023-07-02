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
    Delete,
    Download,
    Edit,
    EditNotifications,
    MenuOpen,
    Print,
    Settings,
} from "@mui/icons-material/";
import { DISABLED, ENABLED, SET_METADATA_FIELDS } from "utilities/constants";
import { useTheme } from "theme/useTheme";
import { ActionButtonsRow } from "../styles";
import { useNavigate, useParams } from "react-router-dom";
import { Studyset } from "lib/types";
import { Dispatch, SetStateAction } from "react";

type Props = {
    controlAnchorRef: any;
    updateMetadataField: any;
    setShowControlMenu: Dispatch<SetStateAction<boolean>>;
    setShowDownloadPopup: Dispatch<SetStateAction<boolean>>;
    setShowNotificationsModal: Dispatch<SetStateAction<boolean>>;
    showControlMenu: any;
    selectedStudyset: Studyset | undefined;
    handleDeleteStudyset: () => void;
    setShowStudysetSettings: Dispatch<SetStateAction<boolean>>;
};

const StudysetActions = (props: Props) => {
    const {
        controlAnchorRef,
        updateMetadataField,
        setShowControlMenu,
        setShowDownloadPopup,
        setShowNotificationsModal,
        showControlMenu,
        selectedStudyset,
        handleDeleteStudyset,
        setShowStudysetSettings,
    } = props;

    const { theme } = useTheme();
    const navigate = useNavigate();
    const { id: studySetUUID } = useParams();

    const handleOpenControlMenu = () => {
        setShowControlMenu(true);
    };

    const handleCloseControlMenu = () => {
        setShowControlMenu(false);
    };

    const { metadata = {} } = selectedStudyset || {};

    const {
        // @ts-ignore
        backgroundColorVisible = false,
        // @ts-ignore
        publiclyViewable = false,
        // @ts-ignore
        textColorVisible = false,
    } = metadata;
    console.log({ metadata });

    const updateMetadataState = (property: string) => {
        let newValue;
        switch (property) {
            default:
                newValue = !selectedStudyset.metadata[property];
                break;
        }
        updateMetadataField(property, newValue);
    };

    const handleEditClick = () => {
        navigate(`/edit/${studySetUUID}`);
    };

    return (
        <>
            <ActionButtonsRow>
                <Tooltip title="Edit Study Set">
                    <IconButton color="primary" onClick={handleEditClick}>
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
                <Tooltip title="Print">
                    <IconButton color="primary">
                        <Print />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Delete Study Set">
                    <IconButton
                        color="primary"
                        onClick={() => handleDeleteStudyset()}
                    >
                        <Delete />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Study Set Settings">
                    <IconButton 
                        color="primary"
                        onClick={() => setShowStudysetSettings(true)}
                    >
                        <Settings />
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
                                checked={textColorVisible}
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
                                    color: textColorVisible
                                        ? theme.palette.success.main
                                        : theme.palette.error.main,
                                }}
                            >
                                {`Text Color: ${
                                    textColorVisible ? ENABLED : DISABLED
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
                                checked={backgroundColorVisible}
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
                                    color: backgroundColorVisible
                                        ? theme.palette.success.main
                                        : theme.palette.error.main,
                                }}
                            >
                                {`Background Color: ${
                                    backgroundColorVisible ? ENABLED : DISABLED
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
                </MenuItem>
            </Menu>
        </>
    );
};

export default StudysetActions;
