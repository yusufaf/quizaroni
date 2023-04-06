import { useState, useEffect, useRef } from "react";
import { database } from "../firebase/firebase";
import { deleteDoc, updateDoc, query, where, collection, getDoc, getDocs, limit } from "firebase/firestore";
import { EmailAuthProvider, getAuth, deleteUser, updatePassword, reauthenticateWithCredential } from "firebase/auth";
import {
    Button,
    Tooltip,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    TextField
} from '@mui/material/';
import { DarkMode, LightMode, Palette, Password, Person, RemoveCircleOutline, VisibilityOff, Visibility } from "@mui/icons-material";
import { styled } from '@mui/system';
import LoginMessage from "../LoginMessage/LoginMessage";
import ProfileCard from "./ProfileCard";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";
import { LIGHT, DARK } from "src/utilities/constants"
import { useTheme } from "src/theme/useTheme";
import * as profileStyles from './Profile.module.css';
import PasswordToggle from "src/components/PasswordToggle/PasswordToggle";
import {
    ActionHeader,
    InfoChangeContainer,
    PasswordFieldsContainer,
    ProfilePage,
    ProfilePaper
} from "./ProfileStyles"
import { BoldHeading } from 'src/AppStyles';
import { useSelector } from "react-redux";
import { selectAuthenticated } from "src/slices/globalSlice";

const Profile = props => {
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const auth = getAuth();
    const user = auth.currentUser;

    const authenticated = useSelector(selectAuthenticated);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [enteredDeletePassword, setEnteredDeletePassword] = useState("");
    const [enteredNewUsername, setEnteredNewUsername] = useState("");
    const [enteredNewPassword, setEnteredNewPassword] = useState("");
    const [enteredConfirmPassword, setEnteredConfirmPassword] = useState("");
    
    const [newPasswordVisibility, setNewPasswordVisibility] = useState(false);


    /* https://firebase.google.com/docs/auth/custom-email-handler#web-version-9 */

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        confirmPassInput: false
    })

    // Store a property for each user of the theme
    const [defaultTheme, setDefaultTheme] = useState("dark");


    const checkIfInputMatches = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value !== enteredNewPassword;
        setShowErrorText(updatedErrorText);
    }

    /**
     * Update user's selected default theme
     */
    const handleDefaultTheme = async (event, newTheme) => {
        console.log("Entering handleDefaultTheme");

        // TODO: Handling immediately changing based on selection
        // if (theme === "dark" ) {
        //     console.log("TOGGLING DARK MODE");
        //     toggleDarkMode();
        // }
        setDefaultTheme(newTheme);

        /* Update user database with the newly selected theme */
        const uid = "";
        const usersCollection = collection(database, "users");
        const queryResult = query(usersCollection, where("uid", "==", uid));
        const querySnapshot = await getDocs(queryResult);

        const userDoc = querySnapshot.docs[0];
        if (userDoc) {
            const userRef = userDoc.ref;
            updateDoc(userRef, {
                defaultTheme: newTheme
            });
        }
    }

    /* Make call using Firebase Auth API to delete this user's account, have to sign in, prompt them to enter their password again, kinda like Github messages*/
    const handleDeleteAccount = async () => {
        // reauthenticateWithCredential(user, credential)
        //     .then(() => {
        //         // User successfully reauthenticated. New ID tokens should be valid.
        //         deleteUser(userAuthState).then(() => {
        //             // User deleted.
        //             /* Delete that user's flashcards */
        //             const flashCollection = collection(database, "flashcards");
        //             const queryResult = query(flashCollection, where("uid", "==", uid));
        //             const querySnapshot = getDocs(queryResult);

        //             querySnapshot.forEach((doc) => {
        //                 const docRef = doc.ref
        //                 const result = deleteDoc(docRef);
        //             });
        //         }).catch((error) => {
        //             // An error ocurred
        //             // ...
        //         });
        //     })
        //     .catch(error => {
        //         // TODO: Display alert / text indicating password was wrong
        //     });
    }

    /**
     * Change username for authenticated user
     */
    const handleChangeUsername = async () => {
        /*  TODO:
        - Imposing some restrictions on the length / type of username
        */
        const uid = "";
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

        console.log("user object = ", user);
        // updatePassword(user, enteredNewPassword).then(() => {
        //     // Update successful.
        //     console.log("Successfully changed password")
        // }).catch((error) => {
        //     // An error ocurred
        //     // ...
        // });

    }

    const handleShowDeleteDialog = () => {
        setShowDeleteDialog(true);
    }

    const handleCloseDeleteDialog = () => {
        setShowDeleteDialog(false);
    }

    // useEffect(() => {
    //     console.log({ defaultTheme })
    // }, [defaultTheme])

    if (!authenticated) {
        return <LoginMessage page="profile" />;
    }

    return (
        <>
            <ProfilePage>
                <ProfileCard />
                <ProfilePaper elevation={6}>
                    <div className={profileStyles.profileContainer}>
                        <BoldHeading variant="h5">
                            Profile
                        </BoldHeading>
                        <ActionHeader>
                            <Palette />
                            <Typography variant="h6">Default Theme</Typography>
                        </ActionHeader>
                        <ToggleButtonGroup
                            aria-label="Set default theme"
                            exclusive
                            onChange={handleDefaultTheme}
                            value={defaultTheme}
                        >
                            <Tooltip
                                title="Switch default to Light mode"
                                placement="bottom"
                            >
                                <ToggleButton value={LIGHT}>
                                    <LightMode />
                                </ToggleButton>
                            </Tooltip>
                            <Tooltip
                                title="Switch default to Dark mode"
                                placement="bottom"
                            >
                                <ToggleButton value={DARK}>
                                    <DarkMode />
                                </ToggleButton>
                            </Tooltip>
                        </ToggleButtonGroup>

                        <ActionHeader>
                            <Person />
                            <Typography variant="h6">Change Username</Typography>
                        </ActionHeader>
                        <InfoChangeContainer>
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
                        </InfoChangeContainer>

                        <ActionHeader>
                            <Password />
                            <Typography variant="h6">Change Password</Typography>
                        </ActionHeader>

                        <InfoChangeContainer>
                            <PasswordFieldsContainer>
                                <TextField
                                    variant="standard"
                                    placeholder="Enter new password"
                                    label="Password"
                                    type={newPasswordVisibility ? 'text' : 'password'}
                                    value={enteredNewPassword}
                                    name="passInput"
                                    onChange={e => setEnteredNewPassword(e.target.value)}
                                    // onBlur={e => checkIfInputEmpty(e)}
                                    // helperText={showErrorText.passInput && "A password is required"}
                                    // error={showErrorText.passInput}
                                    size="small"
                                    InputProps={{
                                        endAdornment:
                                            <PasswordToggle
                                                passwordVisibility={newPasswordVisibility}
                                                setPasswordVisibility={setNewPasswordVisibility}
                                            />
                                    }}
                                />

                                <TextField
                                    variant="standard"
                                    placeholder="Confirm new password"
                                    label="Confirm Password"
                                    type={newPasswordVisibility ? 'text' : 'password'}
                                    value={enteredNewPassword}
                                    name="passInput"
                                    onChange={e => setEnteredConfirmPassword(e.target.value)}
                                    // onBlur={e => checkIfInputEmpty(e)}
                                    // helperText={showErrorText.passInput && "A password is required"}
                                    // error={showErrorText.passInput}
                                    size="small"
                                    InputProps={{
                                        endAdornment:
                                            <PasswordToggle
                                                passwordVisibility={newPasswordVisibility}
                                                setPasswordVisibility={setNewPasswordVisibility}
                                            />
                                    }}
                                />
                            </PasswordFieldsContainer>

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
                        </InfoChangeContainer>

                        <ActionHeader>
                            <RemoveCircleOutline />
                            <Typography variant="h6">Delete Account</Typography>
                        </ActionHeader>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleShowDeleteDialog}
                        >
                            Delete Account
                        </Button>
                        <DeleteAccountDialog
                            open={showDeleteDialog}
                            handleClose={handleCloseDeleteDialog}
                            enteredPassword={enteredDeletePassword}
                            setEnteredPassword={setEnteredDeletePassword}
                        />
                    </div>
                </ProfilePaper>
            </ProfilePage>
        </>
    )
}

export default Profile;