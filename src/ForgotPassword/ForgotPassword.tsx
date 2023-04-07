import { useState } from "react";
import { useTheme } from "src/theme/useTheme";
import { useNavigate } from "react-router-dom";

import {
    ForgotPasswordPage,
    ForgotPasswordContainer,
    ForgotPasswordTitle,
    ForgotPasswordDesc,
    ForgotPassField,
    ForgotPassBtn,
} from "./styles";
import { Auth } from "@aws-amplify/auth";
import { Paper } from "@mui/material";

type Props = {};

const ForgotPassword = (props: Props) => {
    const navigate = useNavigate();

    const [username, setUsername] = useState<string>("");
    const [confirmationCode, setConfirmationCode] = useState<string>("");
    const [codeSent, setCodeSent] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>("");

    const handleForgotPassword = async () => {
        try {
            const result = await Auth.forgotPassword(username);
            console.log("Result of sending forgot pass code = ", result);

            /* Trigger change in the "form" */
            setCodeSent(true);
        } catch (error) {
            console.error("Error sending code ", error);
        }
    };

    const handleResetPassword = async () => {
        try {
            const result = await Auth.forgotPasswordSubmit(
                username,
                confirmationCode,
                newPassword
            );
            console.log("Result of submitting reset password", result);

            /* Send user to login page if successfully changed */
            navigate("/login");
        } catch (error) {}
    };

    const enterKeyHandler = (e: any) => {
        const key = e.key.trim();
        if (key === "Enter") {
            // TODO:
        }
    };

    const isValidCode = /^\d{6}$/.test(confirmationCode);

    return (
        <>
            <ForgotPasswordPage>
                <Paper elevation={6}>
                    <ForgotPasswordContainer onKeyDown={enterKeyHandler}>
                        <ForgotPasswordTitle variant="h5">
                            Forgot Password
                        </ForgotPasswordTitle>
                        <ForgotPasswordDesc variant="body1">
                            Check your email for a six-digit confirmation code
                        </ForgotPasswordDesc>
                        <ForgotPasswordDesc
                            variant="body1"
                            sx={{
                                fontWeight: "600",
                            }}
                        >
                            Be sure to check your spam folder.
                        </ForgotPasswordDesc>
                        <ForgotPassField
                            label="Username"
                            size="small"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />

                        {codeSent ? (
                            <>
                                <ForgotPassField
                                    label="Confirmation Code"
                                    size="small"
                                    required
                                    value={confirmationCode}
                                    onChange={(e) =>
                                        setConfirmationCode(e.target.value)
                                    }
                                    error={!isValidCode}
                                />
                                <ForgotPassField
                                    label="New Password"
                                    size="small"
                                    required
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                />
                                <ForgotPassBtn
                                    variant="contained"
                                    disabled={!isValidCode || !username}
                                    onClick={handleResetPassword}
                                >
                                    Reset Password
                                </ForgotPassBtn>
                            </>
                        ) : (
                            <>
                                <ForgotPassBtn
                                    variant="contained"
                                    disabled={!username}
                                    onClick={handleForgotPassword}
                                >
                                    Send Confirmation Code
                                </ForgotPassBtn>
                            </>
                        )}
                    </ForgotPasswordContainer>
                </Paper>
            </ForgotPasswordPage>
        </>
    );
};

export default ForgotPassword;
