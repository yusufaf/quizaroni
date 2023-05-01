import { useState, useEffect } from "react";
import { Menu, MenuItem, Typography } from "@mui/material/";
import {
    ContentCopy as CopyIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FavoriteBorder as FavoriteIcon,
} from "@mui/icons-material";
import { useTheme } from "theme/useTheme";

type Props = {
    studyset: any;
    open: any;
    onClose: any;
    anchorEl: any;
    handleShowConfirmDialog: any;
};

const SetActionsMenu = (props: Props) => {
    const { studyset, open, onClose, anchorEl, handleShowConfirmDialog } =
        props;

    const { isDarkMode, theme } = useTheme();

    const iconStyling = {
        marginRight: "0.75rem",
    };

    return (
        <Menu
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
        >
            <MenuItem onClick={(e) => e.stopPropagation()}>
                <EditIcon sx={iconStyling} />
                <Typography>Rename</Typography>
            </MenuItem>
            <MenuItem
                onClick={(e) => {
                    e.stopPropagation();
                    handleShowConfirmDialog("RESET", studyset);
                }}
            >
                <CopyIcon sx={iconStyling} />
                <Typography>Duplicate</Typography>
            </MenuItem>
            <MenuItem
                onClick={(e) => {
                    e.stopPropagation();
                    handleShowConfirmDialog("DELETE", studyset);
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
