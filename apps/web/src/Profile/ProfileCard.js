import React, { useState } from "react";

import { Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material/';

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

const ProfileCard = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    return (
        <div className={profileStyles.profileCard} style={{ color: theme.foreground, background: theme.background }}>
            <div className={profileStyles.profilePicture} style={{ backgroundImage: "" }}>
                <span className={`material-icons-outlined ${profileStyles.uploadImage}`}>
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