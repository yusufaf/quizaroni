import { Link } from "react-router-dom";
import { Menu, MenuItem } from '@mui/material/';

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

const ProfileDropdown = props => {
    const { dropdownRef, showDropdown, setShowDropdown, userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    // TODO: Fix this
    const profileMenuStyling = {
        '&.MuiMenu-paper': {
            // color: theme.foreground,
            // backgroundColor: theme.background
        },
    }

    return (
        <div className={profileStyles.dropdown}>
            <Menu
                open={showDropdown && userAuthState}
                onClose={() => setShowDropdown(false)}
                sx={profileMenuStyling}
                anchorEl={dropdownRef.current}
            >
                <MenuItem
                    sx={{
                        // backgroundColor: theme.background,
                        // color: theme.foreground
                    }}
                    onClick={() => setShowDropdown(false)}
                >
                    <Link
                        className={`${profileStyles.dropdownLink} ${isDarkMode ? appStyles.darkBorder : appStyles.lightBorder}`}
                        to="/profile"
                        style={{
                            // color: `${theme.foreground}`
                        }}
                    >
                        Profile
                    </Link>
                </MenuItem>
            </Menu>
        </div>
    )
}

export default ProfileDropdown;