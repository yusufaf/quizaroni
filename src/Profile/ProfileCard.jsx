import React, { useState, useRef } from "react";

import { Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material/';

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

const ProfileCard = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    const profilePicRef = useRef(null);

    const handleProfilePicture = () => {

    }

    /*
 <div className={createSetStyles.uploadImage}>
                        <input
                            type="file"
                            id="fileInput"
                            ref={fileInputRef}
                            accept=".png, .jpg"
                            onChange={e => onFileChange(e, index)}
                            style={{ display: "none" }}
                        />
                        <i
                            className="material-icons-outlined"
                            style={{ fontSize: "2rem" }}
                            onClick={() => fileInputRef.current.click()}
                        >
                            image
                        </i>
                    </div>
    */

    return (
        <div className={profileStyles.profileCard} style={{ color: theme.foreground, background: theme.background }}>
            <div className={profileStyles.profilePicture} style={{ backgroundImage: "" }}>
                {/* TODO: In fileChange function, have a switch case that restricts it to images only */}
                <input
                    type="file"
                    id="profilePicture"
                    ref={profilePicRef}
                    accept=".png, .jpg"
                    // onChange={e => onFileChange(e, index)}
                    style={{ display: "none" }}
                />
                <span
                    className={`material-icons-outlined ${profileStyles.uploadImage}`}
                    onClick={() => profilePicRef.current.click()}
                >
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