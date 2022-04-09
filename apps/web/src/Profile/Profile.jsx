import { useState, useEffect, useRef } from "react";
import { database } from "../firebase/firebase";
import { deleteDoc, updateDoc, query, where, collection, getDoc, getDocs, limit } from "firebase/firestore";
import { EmailAuthProvider, getAuth, deleteUser, updatePassword, reauthenticateWithCredential } from "firebase/auth";
import { Button, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material/';
import LoginMessage from "../LoginMessage/LoginMessage";
import ProfileCard from "./ProfileCard";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as profileStyles from './Profile.module.css';
import * as appStyles from "../App.module.css";

import * as C from "../utilities/constants";
import { color } from "@mui/system";

const Profile = props => {
    const { userAuthState, setUserAuthState } = props;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const auth = getAuth();
    const user = auth.currentUser;



    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [enteredDeletePass, setEnteredDeletePass] = useState("");

    const [enteredNewUsername, setEnteredNewUsername] = useState("");
    const [enteredNewPassword, setEnteredNewPassword] = useState("");
    const [enteredConfirmPassword, setEnteredConfirmPassword] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        confirmPassInput: false
    })

    // Store a property for each user of the theme
    const [defaultTheme, setDefaultTheme] = useState(userAuthState?.bruh ?? "dark");

    if (userAuthState) {
        let credential = EmailAuthProvider.credential(
            user.email,
            enteredDeletePass
        );
    }

    const checkIfInputMatches = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value !== enteredNewPassword;
        setShowErrorText(updatedErrorText);
    }

    /**
     * Update user's selected default theme
     */
    const handleDefaultTheme = async (theme) => {
        console.log("Entering handleDefaultTheme");
        // TODO: Handling immediately changing based on selection
        // if (theme === "dark" ) {
        //     console.log("TOGGLING DARK MODE");
        //     toggleDarkMode();
        // }
        setDefaultTheme(theme);

        /* Update user database with the newly selected theme */
        const { uid } = userAuthState;
        const usersCollection = collection(database, "users");
        const queryResult = query(usersCollection, where("uid", "==", uid));
        const querySnapshot = await getDocs(queryResult);

        const userDoc = querySnapshot.docs[0];
        if (userDoc) {
            const userRef = userDoc.ref;
            updateDoc(userRef, {
                defaultTheme: theme
            });
        }
    }

    /* Make call using Firebase Auth API to delete this user's account, have to sign in, prompt them to enter their password again, kinda like Github messages*/
    const handleDeleteAccount = async () => {
        reauthenticateWithCredential(user, credential)
            .then(() => {
                // User successfully reauthenticated. New ID tokens should be valid.
                deleteUser(userAuthState).then(() => {
                    // User deleted.
                    /* Delete that user's flashcards */
                    const flashCollection = collection(database, "flashcards");
                    const queryResult = query(flashCollection, where("uid", "==", uid));
                    const querySnapshot = getDocs(queryResult);

                    querySnapshot.forEach((doc) => {
                        const docRef = doc.ref
                        const result = deleteDoc(docRef);
                    });
                }).catch((error) => {
                    // An error ocurred
                    // ...
                });
            })
            .catch(error => {
                // TODO: Display alert / text indicating password was wrong
            });


    }

    /**
     * Change username for authenticated user
     */
    const handleChangeUsername = async () => {
        /*  TODO:
        - Imposing some restrictions on the length / type of username
        */

        const { uid } = userAuthState;
        const usersCollection = collection(database, "users");
        const queryResult = query(usersCollection, where("uid", "==", uid));
        const docSnap = await getDocs(queryResult);

        const userDoc = docSnap.docs[0];
        if (userDoc) {
            const userRef = userDoc.ref;
            updateDoc(userRef, {
                username: enteredNewUsername
            });
        }
    }

    /**
     * Change user password if signed up with email / password
     */
    const handleChangePassword = () => {
        if (enteredNewPassword !== enteredConfirmPassword) {
            //TODO: Display alert
        }

        // console.log("userAuthState = ", userAuthState);
        console.log("user object = ", user);
        updatePassword(user, enteredNewPassword).then(() => {
            // Update successful.
            console.log("Successfully changed password")
        }).catch((error) => {
            // An error ocurred
            // ...
        });
    }


    if (!userAuthState) {
        return <LoginMessage page="profile" />;
    }

    return (
        <>
            <>
                <ProfileCard userAuthState={userAuthState} />
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
                        <Tooltip title="Switch default to Light mode"
                            placement="left"
                        >
                            <span className={`material-icons-outlined ${defaultTheme === "light" ? profileStyles.themeSelected : ""}`}
                                onClick={() => handleDefaultTheme("light")}
                            >
                                light_mode
                            </span>
                        </Tooltip>
                        <Tooltip title="Switch default to Dark mode"
                            placement="right"
                        >
                            <span className={`material-icons-outlined ${defaultTheme === "dark" ? profileStyles.themeSelected : ""}`}
                                onClick={() => handleDefaultTheme("dark")}
                            >
                                dark_mode
                            </span>
                        </Tooltip>
                    </div>

                    <div className={profileStyles.heading}>
                        <span className="material-icons-outlined">
                            person
                        </span>
                        <div className={appStyles.smallTitle}>Change Username</div>
                    </div>
                    <div className={profileStyles.changeUsernameContainer}>
                        <input
                            className={`${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                            placeholder="Enter new username"
                            onChange={(e) => setEnteredNewUsername(e.target.value)}
                        />

                        <Button
                            variant="contained"
                            onClick={() => handleChangeUsername()}
                            disabled={enteredNewUsername === ""}
                            sx={{
                                backgroundColor: "orange",
                                color: theme.foreground
                            }}
                        >
                            Submit
                        </Button>

                        {/* <button
                            tabIndex="0"
                            className={profileStyles.changeUsername}
                            onClick={() => handleChangeUsername()}
                            disabled={enteredNewUsername === ""}
                        >
                            Submit
                        </button> */}
                    </div>

                    <div className={profileStyles.heading}>
                        <span class="material-icons-outlined">
                            password
                        </span>
                        <div className={appStyles.smallTitle}>Change Password</div>
                    </div>

                    <div className={profileStyles.changeUsernameContainer}>
                        <div className={profileStyles.changeInputs}>
                            {/* TODO: Add password visibility toggles here */}
                            <input
                                className={`${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                                placeholder="Enter new password"
                                onChange={(e) => setEnteredNewPassword(e.target.value)}
                            />
                            <div className={profileStyles.confirmPassword}>
                                <input
                                    className={`${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                                    name="confirmPassInput"
                                    placeholder="Confirm new password"
                                    onChange={(e) => {
                                        checkIfInputMatches(e);
                                        setEnteredConfirmPassword(e.target.value)
                                    }}
                                    onBlur={e => checkIfInputMatches(e)}
                                />

                                {showErrorText.confirmPassInput &&
                                    <span className={appStyles.errorText}
                                        style={{ top: "1rem" }}
                                    >
                                        Confirmed password doesn't match entered password
                                    </span>
                                }
                            </div>

                        </div>

                        <Button
                            variant="contained"
                            onClick={() => handleChangePassword()}
                            disabled={enteredNewPassword === "" || enteredConfirmPassword === "" || showErrorText.confirmPassInput}
                            sx={{
                                backgroundColor: "orange",
                                color: theme.foreground
                            }}
                        >
                            Submit
                        </Button>

                        {/* <button
                            tabIndex="0"
                            className={profileStyles.changeUsername}
                            onClick={() => handleChangePassword()}
                            disabled={enteredNewPassword === "" || enteredConfirmPassword === ""}
                        >
                            Submit
                        </button> */}

                    </div>

                    <div className={profileStyles.heading}>
                        <span className="material-icons-outlined">
                            remove_circle
                        </span>
                        <div className={appStyles.smallTitle}>Delete Account</div>
                    </div>

                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        Delete Account
                    </Button>

                    <Dialog
                        open={showDeleteDialog}
                        onClose={() => setShowDeleteDialog(false)}
                        sx={{
                            // TODO: WTF IS THIS
                            "&.MuiDialog-paper": {
                                backgroundColor: theme.background,
                            },
                            bottom: "20rem",
                        }}
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
                                onChange={e => setEnteredDeletePass(e.target.value)}
                            />
                        </DialogContent>
                        <DialogActions>
                            {/* Redo the Styling for this delete button, possibly using MUI's Button component or just using ideas from work 
                            Disabled state for the button if no password entered
                            Have to do verification of that password before closing modal
                        */}
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => handleDeleteAccount()}
                                disabled={enteredDeletePass === ""}
                            >
                                Delete Account
                            </Button>
                        </DialogActions>
                    </Dialog>
                </div>
            </>
        </>
    )
}

export default Profile;