import { useState, useEffect, useRef } from "react";
import { database } from "../firebase/firebase";
import { deleteDoc, updateDoc, query, where, collection, getDoc, getDocs, limit } from "firebase/firestore";
import { EmailAuthProvider, getAuth, deleteUser, updatePassword, reauthenticateWithCredential } from "firebase/auth";
import { Button, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, InputAdornment, Typography, TextField } from '@mui/material/';
import { DarkMode, LightMode, Palette, Password, Person, RemoveCircleOutline, VisibilityOff, Visibility} from "@mui/icons-material";
import { styled } from '@mui/system';
import LoginMessage from "../LoginMessage/LoginMessage";
import ProfileCard from "./ProfileCard";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";

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
    const [enteredDeletePassword, setEnteredDeletePassword] = useState("");

    const [enteredNewUsername, setEnteredNewUsername] = useState("");
    const [enteredNewPassword, setEnteredNewPassword] = useState("");
    const [enteredConfirmPassword, setEnteredConfirmPassword] = useState("");
    const [passVisibility, setPassVisibility] = useState(false);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        confirmPassInput: false
    })

    // Store a property for each user of the theme
    const [defaultTheme, setDefaultTheme] = useState(userAuthState?.bruh ?? "dark");

    if (userAuthState) {
        let credential = EmailAuthProvider.credential(
            user.email,
            enteredDeletePassword
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


    const ActionHeader = styled("div")({
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    })

    if (!userAuthState) {
        return <LoginMessage page="profile" />;
    }

    return (
        <>
            <div className={profileStyles.profilePage}>
                <ProfileCard userAuthState={userAuthState} />
                <div className={profileStyles.profileContainer}>
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: "bold"
                        }}
                    >
                        Profile
                    </Typography>

                    <ActionHeader>
                        <Palette />
                        <Typography variant="h6">Default Theme</Typography>
                    </ActionHeader>

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

                    <ActionHeader>
                        <Person />
                        <Typography variant="h6">Change Username</Typography>
                    </ActionHeader>
                    <div className={profileStyles.changeUsernameContainer}>
                        <TextField
                            variant="standard"
                            label="Username"
                            placeholder="Enter new password"
                            value={enteredNewUsername}
                            onChange={e => setEnteredNewUsername(e.target.value)}
                            size="small"
                        />

                        <Button
                            variant="contained"
                            onClick={() => handleChangeUsername()}
                            disabled={enteredNewUsername === ""}
                        >
                            Submit
                        </Button>
                    </div>

                    <ActionHeader>
                        <Password />
                        <Typography variant="h6">Change Password</Typography>
                    </ActionHeader>
                    
                    <div className={profileStyles.changeUsernameContainer}>
                        <div className={profileStyles.changeInputs}>
                            <TextField
                                variant="standard"
                                placeholder="Enter new password"
                                label="Password"
                                type={passVisibility ? 'text' : 'password'}
                                value={enteredNewPassword}
                                name="passInput"
                                onChange={e => setEnteredNewPassword(e.target.value)}
                                // onBlur={e => checkIfInputEmpty(e)}
                                // helperText={showErrorText.passInput && "A password is required"}
                                // error={showErrorText.passInput}
                                size="small"
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="toggle password visibility"
                                                onClick={() => setPassVisibility(!passVisibility)}
                                                edge="end"
                                            >
                                                {passVisibility ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
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
                    </div>

                    <ActionHeader>
                        <RemoveCircleOutline />
                        <Typography variant="h6">Delete Account</Typography>
                    </ActionHeader>

                    <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        Delete Account
                    </Button>

                    <DeleteAccountDialog
                        open={showDeleteDialog}
                        handleClose={() => setShowDeleteDialog(false)}
                        enteredPassword={enteredDeletePassword}
                        setEnteredPassword={setEnteredDeletePassword}
                    />    
                </div>
            </div>
        </>
    )
}

export default Profile;