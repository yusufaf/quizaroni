import { useState, useEffect } from "react"
import {
    Menu,
    MenuItem,
    Typography,
} from '@mui/material/';
import {
    ContentCopy as CopyIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FavoriteBorder as FavoriteIcon,
} from "@mui/icons-material";
import { useTheme } from "../theme/useTheme";


type Props = {
    studySet: any;
    open: any;
    onClose: any;
    anchorEl: any;
    handleShowDeleteConfirmation: any;
}

const SetActionsMenu = (props: Props) => {
    const {
        studySet,
        open,
        onClose,
        anchorEl,
        handleShowDeleteConfirmation
    } = props;

    const {
        cards,
        creationDate,
        title,
        description,
        label,
        setID,
        uid
    } = studySet;

    const { isDarkMode, theme } = useTheme();

    const iconStyling = {
        marginRight: "0.75rem"
    }

    return (
        <Menu
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
        >
            <MenuItem
            >
                <EditIcon
                    sx={iconStyling}
                />
                <Typography>
                    Rename
                </Typography>
            </MenuItem>
            <MenuItem
                // onClick={}
            >
                <CopyIcon
                    sx={iconStyling}
                />
                <Typography>
                    Duplicate
                </Typography>
            </MenuItem>
            <MenuItem
                onClick={handleShowDeleteConfirmation}
            >
                <DeleteIcon
                    sx={iconStyling}
                />
                <Typography>
                    Delete
                </Typography>
            </MenuItem>
            <MenuItem
            // onClick=
            >
                <FavoriteIcon
                    sx={iconStyling}
                />
                <Typography>
                    Favorite
                </Typography>
            </MenuItem>
        </Menu>
    );
}

export default SetActionsMenu;

/*
 { {showRenameModal &&
                <Dialog
                    open={showRenameModal}
                    onClose={() => setShowRenameModal(false)}
                    sx={{
                        '& .MuiDialog-paper': {
                            bottom: "10rem",
                            color: theme.foreground,
                            backgroundColor: theme.background
                        },
                    }}
                >
                    <DialogTitle>Rename this flashset?</DialogTitle>
                    <DialogContent>
                        <input
                            className={`${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                            placeholder="Enter the new name for the study set"
                            onChange={e => {
                                e.stopPropagation();
                                setEnteredRename(e.target.value)
                            }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <div
                            className={`${homeFlashStyles.renameCard} ${appStyles.textButton} ${isDarkMode ? `${appStyles.hoverDark}` : `${appStyles.hoverLight}`}`}
                            onClick={() => handleRenameSet(setID)}
                        >
                            Rename Flash Set
                        </div>
                    </DialogActions>
                </Dialog>
            } } 
            
*/
