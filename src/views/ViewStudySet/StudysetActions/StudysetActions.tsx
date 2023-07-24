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
import { DISABLED, ENABLED, SET_METADATA_FIELDS, VIEW_SET_DIALOGS } from "utilities/constants";
import { useTheme } from "theme/useTheme";
import { ActionButtonsRow } from "../styles";
import { useNavigate, useParams } from "react-router-dom";
import { Studyset } from "lib/types";
import { Dispatch, SetStateAction } from "react";
import { useDispatch } from "react-redux";
import { setSelectedDialog } from "state/slices/viewSetsSlice";

import CustomIconButton from "components/CustomIconButton/CustomIconButton";

type Props = {
    controlAnchorRef: any;
    updateMetadataField: any;
    setShowControlMenu: Dispatch<SetStateAction<boolean>>;
    showControlMenu: any;
    selectedStudyset: Studyset | undefined;
    handleDeleteStudyset: () => void;
};

const StudysetActions = (props: Props) => {
    const {
        controlAnchorRef,
        updateMetadataField,
        setShowControlMenu,
        showControlMenu,
        selectedStudyset,
        handleDeleteStudyset,
    } = props;

    const { theme } = useTheme();
    const navigate = useNavigate();
    const { id: studySetUUID } = useParams();
    const dispatch = useDispatch();


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

    const handleShowDialog = (dialog: string) => {
        dispatch(setSelectedDialog(dialog));
    };

    /*
        Former Implementation of tooltip buttons:
        <Tooltip title="Edit Study Set">
            <IconButton color="primary" onClick={handleEditClick}>
                <Edit />
            </IconButton>
        </Tooltip
    */

    return (
        <>
            <ActionButtonsRow>
                <CustomIconButton
                    title={"Edit Study Set"}
                    color="primary"
                    icon={<Edit />}
                    onClick={handleEditClick}
                />
                <CustomIconButton
                    title={"Download"}
                    color="primary"
                    icon={<Download />}
                    onClick={() => handleShowDialog(VIEW_SET_DIALOGS.DOWNLOAD)}
                />
                <CustomIconButton
                    title={"Manage Notifications"}
                    color="primary"
                    icon={<EditNotifications />}
                    onClick={() => handleShowDialog(VIEW_SET_DIALOGS.NOTIFICATIONS)}
                />
                {/* <CustomIconButton
                    title={"Control Menu"}
                    color="primary"
                    icon={<MenuOpen />}
                    onClick={handleOpenControlMenu}
                    ref={controlAnchorRef}
                /> */}
                <Tooltip title="Control Menu" ref={controlAnchorRef}>
                    <IconButton onClick={handleOpenControlMenu} color="primary">
                        <MenuOpen />
                    </IconButton>
                </Tooltip>
                <CustomIconButton
                    title={"Print"}
                    color="primary"
                    icon={<Print />}
                    onClick={() => handleShowDialog(VIEW_SET_DIALOGS.PRINT)}
                />
                <CustomIconButton
                    title={"Delete Study Set"}
                    color="primary"
                    icon={<Delete />}
                    onClick={() => handleDeleteStudyset()}
                />
                <CustomIconButton
                    title={"Study Set Settings"}
                    color="primary"
                    icon={<Settings />}
                    onClick={() => handleShowDialog(VIEW_SET_DIALOGS.SETTINGS)}
                />
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
