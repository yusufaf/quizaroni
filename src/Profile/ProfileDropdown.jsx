import { Link } from "react-router-dom";
import { Menu, MenuItem } from '@mui/material/';
import { useTheme } from "../theme/useTheme";
import { styled } from '@mui/system';

const ProfileDropdown = props => {
    const { dropdownRef, showDropdown, onClose } = props;
    const { isDarkMode, theme } = useTheme();

    const StyledProfileLink = styled(Link)({
        fontSize: "1.25rem",
        textDecoration: "none",
        color: theme.palette.text.primary
    })

    

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
            <MenuItem>
                Feedback
            </MenuItem>
        </Menu>
    )
}

export default ProfileDropdown;