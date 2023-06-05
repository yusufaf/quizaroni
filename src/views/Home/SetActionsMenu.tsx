import { Menu, MenuItem, Typography } from "@mui/material/";
import {
    ContentCopy as CopyIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FavoriteBorder as FavoriteIcon,
} from "@mui/icons-material";
import { useTheme } from "theme/useTheme";
import { useNavigate } from "react-router-dom";
import { Studyset } from "lib/types";
import { CONFIRM_DIALOGS } from "utilities/constants";

type Props = {
    studyset: Studyset;
    open: boolean;
    onClose: any;
    anchorEl: any;
    handleShowConfirmDialog: any;
};

const SetActionsMenu = (props: Props) => {
    const { 
        studyset, 
        open, 
        onClose, 
        anchorEl, 
        handleShowConfirmDialog 
    } = props;

    const { isDarkMode, theme } = useTheme();

    const iconStyling = {
        marginRight: "0.75rem",
    };

    const navigate = useNavigate();

    return (
        <Menu
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
        >
            <MenuItem onClick={() => navigate(`/edit/${studyset.uuid}`)}>
                <EditIcon sx={iconStyling} />
                <Typography>Edit</Typography>
            </MenuItem>
            <MenuItem
                onClick={(e) => {
                    e.stopPropagation();
                    handleShowConfirmDialog(CONFIRM_DIALOGS.DUPLICATE, studyset);
                }}
            >
                <CopyIcon sx={iconStyling} />
                <Typography>Duplicate</Typography>
            </MenuItem>
            <MenuItem
                onClick={(e) => {
                    e.stopPropagation();
                    handleShowConfirmDialog(CONFIRM_DIALOGS.DELETE, studyset);
                }}
            >
                <DeleteIcon sx={iconStyling} />
                <Typography>Delete</Typography>
            </MenuItem>
            <MenuItem onClick={(e) => e.stopPropagation()}>
                <FavoriteIcon sx={iconStyling} />
                <Typography>Favorite</Typography>
            </MenuItem>
        </Menu>
    );
};

export default SetActionsMenu;
