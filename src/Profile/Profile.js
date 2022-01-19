import React, { useState, useEffect, useRef } from "react";

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


    /* Make call using Firebase Auth API to delete this user's account, have to sign in, prompt them to enter their password again, kinda like Github messages*/
    const handleDeleteAccount = async () => {
        deleteUser(userAuthState).then(() => {
            // User deleted.

            /* Delete that user's flashcards */
            // await deleteDoc(doc(db, "cities", "DC"));
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
                        {/* Consolidate this into a style in App.css */}
                        <div className={appStyles.smallTitle}>Delete Account</div>
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