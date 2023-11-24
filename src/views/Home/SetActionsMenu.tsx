import {
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    PopoverPosition,
    PopoverReference,
} from "@mui/material/";
import {
    ContentCopy as CopyIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Favorite,
    FavoriteBorder,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Studyset } from "lib/types";
import { CONFIRM_DIALOGS } from "utilities/constants";
import { useFavoriteStudysetMutation } from "state/api/studysetsAPI";

type Props = {
    studyset: Studyset | null;
    open: boolean;
    onClose: any;
    anchorEl: any;
    handleShowConfirmDialog: any;
    anchorReference?: PopoverReference;
    anchorPosition?: PopoverPosition;
    slotProps?: any;
};

const SetActionsMenu = (props: Props) => {
    const {
        studyset,
        open,
        onClose,
        anchorEl,
        handleShowConfirmDialog,
        anchorReference,
        anchorPosition,
        slotProps,
    } = props;

    const { favorited = false, uuid = "" } = studyset ?? {};

    const [favoriteStudyset] = useFavoriteStudysetMutation();

    const navigate = useNavigate();

    return (
        <Menu
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            anchorReference={anchorReference}
            anchorPosition={anchorPosition}
            slotProps={slotProps}
        >
            <MenuItem onClick={() => navigate(`/edit/${studyset?.uuid}`)}>
                <ListItemIcon>
                    <EditIcon />
                </ListItemIcon>
                <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={(e) => {
                    e.stopPropagation();
                    handleShowConfirmDialog(
                        CONFIRM_DIALOGS.DUPLICATE,
                        studyset
                    );
                }}
            >
                <ListItemIcon>
                    <CopyIcon />
                </ListItemIcon>
                <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={(e) => {
                    e.stopPropagation();
                    handleShowConfirmDialog(CONFIRM_DIALOGS.DELETE, studyset);
                }}
            >
                <ListItemIcon>
                    <DeleteIcon />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={() =>
                    favoriteStudyset({
                        studysetUUID: uuid,
                        favorited: !favorited,
                    })
                }
            >
                <ListItemIcon>
                    {favorited ? (
                        <Favorite color="primary" />
                    ) : (
                        <FavoriteBorder />
                    )}
                </ListItemIcon>
                <ListItemText>
                    {favorited ? "Unfavorite" : "Favorite"}
                </ListItemText>
            </MenuItem>
        </Menu>
    );
};

export default SetActionsMenu;
