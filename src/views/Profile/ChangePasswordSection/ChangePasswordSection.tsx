import { Password } from "@mui/icons-material";
import { Typography, TextField } from "@mui/material";
import PasswordToggle from "components/PasswordToggle/PasswordToggle";
import {
    ActionSection,
    ActionHeader,
    InfoChangeContainer,
    ActionSubmitButton,
} from "../ProfileStyles";
import { useState } from "react";
import { updatePassword } from "@aws-amplify/auth";
import { toast } from "react-toastify";

type Props = {};

const ChangePasswordSection = ({}: Props) => {
    const [oldPassword, setOldPassword] = useState<string>("");
    const [newPassword, setNewPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const [oldPasswordVisibility, setOldPasswordVisibility] =
        useState<boolean>(false);
    const [newPasswordVisibility, setNewPasswordVisibility] =
        useState<boolean>(false);

    const handleUpdatePassword = async () => {
        try {
            await updatePassword({ oldPassword, newPassword });
            toast.success("Password successfully updated", {
                position: toast.POSITION.BOTTOM_LEFT,
            });
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            console.log(err);
        }
    };

    return (
        <ActionSection>
            <ActionHeader>
                <Password />
                <Typography variant="h6">Change Password</Typography>
            </ActionHeader>
            <InfoChangeContainer>
                <TextField
                    variant="standard"
                    placeholder="Enter old password"
                    label="Old Password"
                    type={oldPasswordVisibility ? "text" : "password"}
                    value={oldPassword}
                    name="oldPasswordInput"
                    onChange={(e) => setOldPassword(e.target.value)}
                    // error={showErrorText.passInput}
                    size="small"
                    InputProps={{
                        endAdornment: (
                            <PasswordToggle
                                passwordVisibility={oldPasswordVisibility}
                                setPasswordVisibility={setOldPasswordVisibility}
                            />
                        ),
                    }}
                />
                <TextField
                    variant="standard"
                    placeholder="Enter new password"
                    label="Password"
                    type={newPasswordVisibility ? "text" : "password"}
                    value={newPassword}
                    name="passInput"
                    onChange={(e) => setNewPassword(e.target.value)}
                    // error={showErrorText.passInput}
                    size="small"
                    InputProps={{
                        endAdornment: (
                            <PasswordToggle
                                passwordVisibility={newPasswordVisibility}
                                setPasswordVisibility={setNewPasswordVisibility}
                            />
                        ),
                    }}
                />
                <TextField
                    variant="standard"
                    placeholder="Confirm new password"
                    label="Confirm Password"
                    type={newPasswordVisibility ? "text" : "password"}
                    value={confirmPassword}
                    name="passInput"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    // error={showErrorText.passInput}
                    size="small"
                    InputProps={{
                        endAdornment: (
                            <PasswordToggle
                                passwordVisibility={newPasswordVisibility}
                                setPasswordVisibility={setNewPasswordVisibility}
                            />
                        ),
                    }}
                />
                <ActionSubmitButton
                    variant="contained"
                    onClick={handleUpdatePassword}
                >
                    Submit
                </ActionSubmitButton>
            </InfoChangeContainer>
        </ActionSection>
    );
};

export default ChangePasswordSection;
