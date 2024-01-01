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
    OpenInNewRounded,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Studyset } from "lib/types";
import { STUDYSET_CONFIRM_DIALOGS } from "utilities/constants";
import { useFavoriteStudysetMutation } from "state/api/studysetsAPI";
import { showConfirmDialog } from "state/slices/globalSlice";
import { useDispatch } from "react-redux";

type Props = {
    studyset: Studyset | null;
    open: boolean;
    onClose: any;
    anchorEl: any;
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
        anchorReference,
        anchorPosition,
        slotProps,
    } = props;

    const { favorited = false, uuid: studysetUUID = "" } = studyset ?? {};

    const [favoriteStudyset] = useFavoriteStudysetMutation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleConfirmAction = (
        e: React.MouseEvent<HTMLLIElement, MouseEvent>,
        action: string,
        studyset: Studyset
    ) => {
        e.stopPropagation();

        console.log("Props before calling = ", {
            action, studyset
        })
        dispatch(showConfirmDialog({
            type: action,
            studysets: [studyset],
        }));
    };

    const handleFavoriteAction = () => {
        favoriteStudyset({
            studysetUUID,
            favorited: !favorited,
        });
    };

    const handleViewInNewTab = () => {
        // Doesn't seem like opening in new tab is possible with the useNavigate hook
        window.open(`${window.location.origin}/view/${studysetUUID}`);
    };

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
            <MenuItem onClick={() => navigate(`/edit/${studysetUUID}`)}>
                <ListItemIcon>
                    <EditIcon />
                </ListItemIcon>
                <ListItemText>Edit</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={(e) =>
                    handleConfirmAction(
                        e,
                        STUDYSET_CONFIRM_DIALOGS.DUPLICATE,
                        studyset
                    )
                }
            >
                <ListItemIcon>
                    <CopyIcon />
                </ListItemIcon>
                <ListItemText>Duplicate</ListItemText>
            </MenuItem>
            <MenuItem
                onClick={(e) =>
                    handleConfirmAction(
                        e,
                        STUDYSET_CONFIRM_DIALOGS.DELETE,
                        studyset
                    )
                }
            >
                <ListItemIcon>
                    <DeleteIcon color="error" />
                </ListItemIcon>
                <ListItemText>Delete</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleFavoriteAction}>
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
            <MenuItem onClick={handleViewInNewTab}>
                <ListItemIcon>
                    <OpenInNewRounded />
                </ListItemIcon>
                <ListItemText>View in new tab</ListItemText>
            </MenuItem>
        </Menu>
    );
};

export default SetActionsMenu;
