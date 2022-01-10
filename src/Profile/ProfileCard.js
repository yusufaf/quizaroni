import React, { useState } from "react";

import { Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material/';
import LoginMessage from "../LoginMessage/LoginMessage";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

const ProfileCard = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    return (
        <div className={profileStyles.profileCard} style={{ color: theme.foreground, background: theme.background }}>
            <div className={profileStyles.profilePicture} style={{ backgroundImage: "" }}>
                <span class="material-icons-outlined" style={{position: "absolute", left: "9rem"}}>
                    add_photo_alternate
                </span>
            </div>
            <div>
                Username
            </div>
            <div>
                # of Flashsets Created
            </div>
            <div>
                Account Created
            </div>
        </div>
    )
}

export default ProfileCard;