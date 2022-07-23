import { Link } from "react-router-dom";
import { Menu, MenuItem } from '@mui/material/';
import { useTheme } from "../theme/useTheme";
import { styled } from '@mui/system';

import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

const ProfileDropdown = props => {
    const { dropdownRef, showDropdown, setShowDropdown, userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    const closeDropdown = () => {
        setShowDropdown(false);
    }

    const StyledProfileLink = styled(Link)({
        fontSize: "1.25rem",
        textDecoration: "none",
        color: theme.palette.text.primary
    })

    return (
        <div>
            <Menu
                open={showDropdown && userAuthState}
                onClose={closeDropdown}
                anchorEl={dropdownRef.current}
            >
                <MenuItem
                    onClick={closeDropdown}
                >
                    <StyledProfileLink
                        to="/profile"
                    >
                        Profile
                    </StyledProfileLink>
                </MenuItem>
            </Menu>
        </div>
    )
}

export default ProfileDropdown;