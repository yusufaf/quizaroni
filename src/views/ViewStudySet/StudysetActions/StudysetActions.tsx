import {
    ContentCopyRounded,
    Delete,
    Download,
    Edit,
    EditNotifications,
    MenuOpen,
    Print,
    Settings,
    Share,
} from "@mui/icons-material/";
import {
    IconButton,
    Tooltip
} from "@mui/material/";
import CustomIconButton from "components/CustomIconButton/CustomIconButton";
import { Studyset } from "lib/types";
import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
    showConfirmDialog
} from "state/slices/globalSlice";
import { setSelectedDialog } from "state/slices/viewSetsSlice";
import { useTheme } from "theme/useTheme";
import {
    STUDYSET_CONFIRM_DIALOGS,
    VIEW_SET_DIALOGS
} from "utilities/constants";
import { ActionButtonsRow } from "../styles";
import ControlMenu from "./ControlMenu";

type Props = {
    updateMetadataField: any;
    selectedStudyset: Studyset | undefined;
};

const StudysetActions = (props: Props) => {
    const { updateMetadataField, selectedStudyset } = props;

    const { theme } = useTheme();
    const navigate = useNavigate();
    const { id: studySetUUID } = useParams();
    const dispatch = useDispatch();

    const [showControlMenu, setShowControlMenu] = useState<boolean>(false);
    const controlAnchorRef = useRef(null);

    const handleOpenControlMenu = () => {
        setShowControlMenu(true);
    };

    const handleCloseControlMenu = () => {
        setShowControlMenu(false);
    };

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

    /**
     * Displays the confirmation dialog for deleting or duplicating a studyset
     */
    const handleConfirmAction = (action: string) => {
        if (!selectedStudyset) {
            return;
        }

        dispatch(
            showConfirmDialog({
                type: action,
                studysets: [selectedStudyset],
            })
        );
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
                    onClick={() =>
                        handleShowDialog(VIEW_SET_DIALOGS.NOTIFICATIONS)
                    }
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
                    onClick={() =>
                        handleConfirmAction(STUDYSET_CONFIRM_DIALOGS.DELETE)
                    }
                />
                <CustomIconButton
                    title={"Duplicate Study Set"}
                    color="primary"
                    icon={<ContentCopyRounded />}
                    onClick={() =>
                        handleConfirmAction(STUDYSET_CONFIRM_DIALOGS.DUPLICATE)
                    }
                />
                <CustomIconButton
                    title={"Study Set Settings"}
                    color="primary"
                    icon={<Settings />}
                    onClick={() => handleShowDialog(VIEW_SET_DIALOGS.SETTINGS)}
                />
                <CustomIconButton
                    title={"Share"}
                    color="primary"
                    icon={<Share />}
                    onClick={() => handleShowDialog(VIEW_SET_DIALOGS.SHARE)}
                />
            </ActionButtonsRow>
            <ControlMenu
                open={showControlMenu}
                onClose={handleCloseControlMenu}
                anchorEl={controlAnchorRef.current}
                selectedStudyset={selectedStudyset}
                updateMetadataState={updateMetadataState}
            />
        </>
    );
};

export default StudysetActions;
