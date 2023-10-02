import { Link } from "react-router-dom";
import { Menu, MenuItem } from '@mui/material/';
import { useTheme } from "theme/useTheme";
import { styled } from '@mui/system';
import { useDispatch } from "react-redux";
import { setDialogOpen } from "state/slices/global";

const ProfileDropdown = props => {
    const { dropdownRef, showDropdown, onClose } = props;
    const { isDarkMode, theme } = useTheme();
    const dispatch = useDispatch();

    const StyledProfileLink = styled(Link)({
        fontSize: "1.25rem",
        textDecoration: "none",
        color: theme.palette.text.primary
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