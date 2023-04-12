import { useState, useEffect, useRef } from "react";
import {
    Button,
    Tooltip,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
    TextField,
} from "@mui/material/";
import {
    DarkMode,
    LightMode,
    Palette,
    Password,
    Person,
    RemoveCircleOutline,
    VisibilityOff,
    Visibility,
} from "@mui/icons-material";
import LoginMessage from "../LoginMessage/LoginMessage";
import ProfileCard from "./ProfileCard";
import DeleteAccountDialog from "./DeleteAccountDialog/DeleteAccountDialog";
import { LIGHT, DARK } from "src/utilities/constants";
import { useTheme } from "src/theme/useTheme";
import PasswordToggle from "src/components/PasswordToggle/PasswordToggle";
import {
    ActionHeader,
    InfoChangeContainer,
    PasswordFieldsContainer,
    ProfileContainer,
    ProfilePage,
    ProfilePaper,
} from "./ProfileStyles";
import { BoldHeading } from "src/AppStyles";
import { useDispatch, useSelector } from "react-redux";
import {
    selectCognitoUser,
    selectAuthenticated,
    selectUserData,
    setUserData,
} from "src/slices/globalSlice";
import axios from "axios";

type Props = {};

const Profile = (props: Props) => {
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const dispatch = useDispatch();
    const authenticated = useSelector(selectAuthenticated);
    const userData = useSelector(selectUserData);

    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState<string>("");
    const [enteredNewUsername, setEnteredNewUsername] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [enteredConfirmPassword, setEnteredConfirmPassword] = useState("");

    const [newPasswordVisibility, setNewPasswordVisibility] = useState(false);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        confirmPassInput: false,
    });

    const [defaultTheme, setDefaultTheme] = useState<string>(
        userData?.metadata?.defaultTheme ?? "dark"
    );

    useEffect(() => {
        if (userData?.metadata?.defaultTheme) {
            setDefaultTheme(userData.metadata.defaultTheme);
        }
    }, []);

    const checkIfInputMatches = (event) => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] =
            event.target.value !== newPassword;
        setShowErrorText(updatedErrorText);
    };

    /**
     * Update user's selected default theme
     */
    const handleDefaultTheme = async (event, newTheme) => {
        try {
            const { uuid } = userData;
            /* Don't take any action if selected theme is the same */
            if (!uuid || newTheme === null || newTheme === defaultTheme) {
                return;
            }

            const themeUpdateResult = await axios.post(
                "/api/users/updateDefaultTheme",
                {
                    uuid,
                    newTheme,
                }
            );
            console.log({ themeUpdateResult });

            setDefaultTheme(newTheme);

            const newUserData = {
                ...userData,
				metadata: {
					...userData.metaadata,
					defaultTheme: newTheme,
				}
            };
			console.log({newUserData})
            dispatch(setUserData(newUserData));
        } catch (error) {
            console.error("Error updating default theme");
        }
    };

    const handleDeleteAccount = async () => {
        // TODO
    };

    /**
     * Change username for authenticated user
     */
    const handleChangeUsername = async () => {
        // TODO
    };

    /**
     * Change user password if signed up with email / password
     */
    const handleChangePassword = () => {
        // TODO
    };

    const handleShowDeleteDialog = () => {
        setShowDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setShowDeleteDialog(false);
    };

    if (!authenticated) {
        return <LoginMessage page="profile" />;
    }

    return (
        <>
            <ProfilePage>
                <ProfileCard />
                <ProfilePaper elevation={6}>
                    <ProfileContainer>
                        <BoldHeading variant="h5">Profile</BoldHeading>
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
                            <ToggleButton
                                value={LIGHT}
                                title="Switch default to Light mode"
                            >
                                <LightMode />
                            </ToggleButton>
                            <ToggleButton
                                value={DARK}
                                title="Switch default to Dark mode"
                            >
                                <DarkMode />
                            </ToggleButton>
                        </ToggleButtonGroup>
                        <ActionHeader>
                            <Person />
                            <Typography variant="h6">
                                Change Username
                            </Typography>
                        </ActionHeader>
                        <InfoChangeContainer>
                            <TextField
                                variant="standard"
                                label="Username"
                                placeholder="Enter new password"
                                value={enteredNewUsername}
                                onChange={(e) =>
                                    setEnteredNewUsername(e.target.value)
                                }
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
                            <Typography variant="h6">
                                Change Password
                            </Typography>
                        </ActionHeader>

                        <InfoChangeContainer>
                            <PasswordFieldsContainer>
                                <TextField
                                    variant="standard"
                                    placeholder="Enter new password"
                                    label="Password"
                                    type={
                                        newPasswordVisibility
                                            ? "text"
                                            : "password"
                                    }
                                    value={newPassword}
                                    name="passInput"
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    // error={showErrorText.passInput}
                                    size="small"
                                    InputProps={{
                                        endAdornment: (
                                            <PasswordToggle
                                                passwordVisibility={
                                                    newPasswordVisibility
                                                }
                                                setPasswordVisibility={
                                                    setNewPasswordVisibility
                                                }
                                            />
                                        ),
                                    }}
                                />

                                <TextField
                                    variant="standard"
                                    placeholder="Confirm new password"
                                    label="Confirm Password"
                                    type={
                                        newPasswordVisibility
                                            ? "text"
                                            : "password"
                                    }
                                    value={newPassword}
                                    name="passInput"
                                    onChange={(e) =>
                                        setEnteredConfirmPassword(
                                            e.target.value
                                        )
                                    }
                                    // error={showErrorText.passInput}
                                    size="small"
                                    InputProps={{
                                        endAdornment: (
                                            <PasswordToggle
                                                passwordVisibility={
                                                    newPasswordVisibility
                                                }
                                                setPasswordVisibility={
                                                    setNewPasswordVisibility
                                                }
                                            />
                                        ),
                                    }}
                                />
                            </PasswordFieldsContainer>

                            <Button
                                variant="contained"
                                onClick={() => handleChangePassword()}
                                disabled={
                                    newPassword === "" ||
                                    enteredConfirmPassword === "" ||
                                    showErrorText.confirmPassInput
                                }
                                sx={{
                                    backgroundColor: "orange",
                                    color: theme.foreground,
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
                            enteredPassword={deletePassword}
                            setEnteredPassword={setDeletePassword}
                        />
                    </ProfileContainer>
                </ProfilePaper>
            </ProfilePage>
        </>
    );
};

export default Profile;
