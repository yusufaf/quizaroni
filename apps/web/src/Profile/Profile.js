import React, { useState, useEffect, useRef } from "react";
import { database } from "../firebase/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { getAuth, deleteUser } from "firebase/auth";
import { Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material/';
import LoginMessage from "../LoginMessage/LoginMessage";
import ProfileCard from "./ProfileCard";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

import * as C from "../utilities/constants";

const Profile = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [enteredPass, setEnteredPass] = useState("");

    // Store a property for each user of the theme
    const [defaultTheme, setDefaultTheme] = useState(userAuthState?.bruh ?? "dark");

    /**
     * 
     */
    const handleDefaultTheme = theme => {
        /* Update user database with the newly selected theme */
    }

    /* Make call using Firebase Auth API to delete this user's account, have to sign in, prompt them to enter their password again, kinda like Github messages*/
    const handleDeleteAccount = async () => {
        deleteUser(userAuthState).then(() => {
            // User deleted.

            /* Delete that user's flashcards */

            const result = deleteDoc(doc(database, "users", userAuthState.uid));
            console.log("Result of deleting account = ", result);
        }).catch((error) => {
            // An error ocurred
            // ...
        });
    }

    return (
        <>
            {!userAuthState ?
                <LoginMessage page="profile" />
                :
                <>
                    <ProfileCard />
                    <div className={profileStyles.profileContainer} style={{ color: theme.foreground, background: theme.background }}>
                        <div className={appStyles.title}>
                            Profile
                        </div>

                        <div className={profileStyles.heading}>
                            <span className="material-icons-outlined">
                                dark_mode
                            </span>
                            <div className={appStyles.smallTitle}>Default Theme</div>
                        </div>

                        <div className={profileStyles.themeSelect}>
                            <span className={`material-icons-outlined ${defaultTheme === "light" ? profileStyles.themeSelected : ""}`}
                                onClick={() => handleDefaultTheme("dark")}
                            >
                                light_mode
                            </span>
                            <span className={`material-icons-outlined ${defaultTheme === "dark" ? profileStyles.themeSelected : ""}`}
                                onClick={() => handleDefaultTheme("dark")}
                            >
                                dark_mode
                            </span>
                        </div>

                        <div className={profileStyles.heading}>
                            <span className="material-icons-outlined">
                                person
                            </span>
                            <div className={appStyles.smallTitle}>Change Username</div>
                        </div>
                        <input
                            className={`${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                        />
                        <div className={profileStyles.heading}>
                            <span className="material-icons-outlined">
                                remove_circle
                            </span>
                            <div className={appStyles.smallTitle}>Delete Account</div>
                        </div>

                        <div
                            className={profileStyles.deleteAccount}
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            Delete Account
                        </div>
                        {showDeleteDialog &&
                            <Dialog
                                open={showDeleteDialog}
                                onClose={() => setShowDeleteDialog(false)}
                                style={{ bottom: "20rem" }}
                            >
                                <DialogTitle>Delete Account</DialogTitle>
                                <DialogContent>
                                    <DialogContentText>
                                        {C.DELETE_ACCOUNT_MSG}
                                    </DialogContentText>
                                    <input
                                        className={`${profileStyles.deletePasswordInput} ${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                                        type="password"
                                        name="passwordInput"
                                        placeholder="Enter your password"
                                        onChange={e => setEnteredPass(e.target.value)}
                                    />
                                </DialogContent>
                                <DialogActions>
                                    {/* Redo the Styling for this delete button, possibly using MUI's Button component or just using ideas from work 
                            Disabled state for the button if no password entered
                            Have to do verification of that password before closing modal
                        */}
                                    <div
                                        className={profileStyles.deleteAccount}
                                        onClick={() => handleDeleteAccount()}
                                    >
                                        Delete Account
                                    </div>
                                </DialogActions>
                            </Dialog>
                        }
                    </div>
                </>
            }
        </>
    )
}

export default Profile;