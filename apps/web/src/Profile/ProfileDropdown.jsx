import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

const ProfileDropdown = props => {
    const { setShowDropdown } = props;
    const { isDarkMode, theme } = useTheme();

    const dropdownRef = useRef(null);

    /* useEffect to add a clickOutsideListener for the Profile dropdown JSX */
    useEffect(() => {
        window.addEventListener("click", handleClickOutside);
        return () => {
            window.removeEventListener("click", handleClickOutside);
        }
    }, [dropdownRef])

    /**
     * Handles hiding dropdown when clicking away from it
     * @param {*} e 
     */
    const handleClickOutside = e => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
            setShowDropdown(false);
        }
    }

    return (
        <div className={profileStyles.dropdown} ref={dropdownRef}>
            <div className={profileStyles.dropdownItem}>
                <Link
                    className={`${profileStyles.dropdownLink} ${isDarkMode ? appStyles.darkBorder : appStyles.lightBorder}`}
                    to="/profile"
                    style={{
                        color: `${theme.foreground}`
                    }}
                >
                    Profile
                </Link>
            </div>

        </div>
    )
}

export default ProfileDropdown;