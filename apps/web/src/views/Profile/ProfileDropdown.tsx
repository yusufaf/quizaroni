import { Link } from "react-router-dom";
import { Menu, MenuItem } from '@mui/material/';
import { useTheme } from "theme/useTheme";
import { styled } from '@mui/system';
import { useAppDispatch } from 'state/reduxHooks';
import { setDialogOpen } from "state/slices/globalSlice";

const ProfileDropdown = props => {
    const { dropdownRef, showDropdown, onClose } = props;
    const { muiTheme } = useTheme();
    const dispatch = useAppDispatch();

    const StyledProfileLink = styled(Link)({
        fontSize: "1.25rem",
        textDecoration: "none",
        color: muiTheme.palette.text.primary
    })

    const openFeedbackDialog = () => {
        dispatch(setDialogOpen(true));
    }
    
    return (
        <Menu
            open={showDropdown}
            onClose={onClose}
            anchorEl={dropdownRef.current}
        >
            <MenuItem
                onClick={onClose}
            >
                <StyledProfileLink
                    to="/profile"
                >
                    Profile
                </StyledProfileLink>
            </MenuItem>
            <MenuItem 
                onClick={openFeedbackDialog}
            >
                Feedback
            </MenuItem>
        </Menu>
    )
}

export default ProfileDropdown;