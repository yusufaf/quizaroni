import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { Menu, MenuItem } from '@mui/material/';

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

const ProfileDropdown = props => {
    const { showDropdown, setShowDropdown } = props;
    const { isDarkMode, theme } = useTheme();

    console.log("Theme = ", theme);

    // const useStyles = makeStyles({
    //     root: {
    //         color: "azure",
    //         '& .MuiInputLabel-root': { color: "#adadad", }
    //     }
    // })

    return (
        <div className={profileStyles.dropdown}>
            <Menu
                open={showDropdown}
                onClose={() => setShowDropdown(false)}
            >
                <MenuItem
                    sx={{
                        backgroundColor: theme.background,
                        color: theme.foreground
                    }}
                    onClick={() => setShowDropdown(false)}
                >
                    <Link
                        className={`${profileStyles.dropdownLink} ${isDarkMode ? appStyles.darkBorder : appStyles.lightBorder}`}
                        to="/profile"
                        style={{
                            color: `${theme.foreground}`
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