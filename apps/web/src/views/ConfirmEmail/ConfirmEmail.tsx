import { useState } from "react";
import { Paper } from "@mui/material";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { useSelector } from "react-redux";
import { selectCognitoUser } from "state/slices/globalSlice";
import { useNavigate } from "react-router-dom";
import {
    ConfirmBtn,
    ConfirmEmailContainer,
    ConfirmEmailDesc,
    ConfirmEmailPage,
    ConfirmEmailTitle,
    ConfirmationField,
} from "./styles";

type Props = {};

const ConfirmEmail = (props: Props) => {
    const cognitoUser = useSelector(selectCognitoUser);
    console.log({ cognitoUser });
    const { username } = cognitoUser;

    const navigate = useNavigate();

    const [confirmationCode, setConfirmationCode] = useState<string>("");

    const handleConfirmEmail = async () => {
        try {
            const result = await confirmSignUp({username, confirmationCode});
            console.log("Confirmation code sent succcesfully", result);

            /* Send user to login page if successfully confirmed email */
            navigate("/login");
        } catch (error) {
            console.error("Error confirming sign up", error);
        }
    };

    const handleResendCode = async () => {
        try {
            const result = await resendSignUpCode({username});
            console.log("Code resent succesfully", result);
        } catch (err) {
            console.error("error resending code: ", err);
        }
    };

    const enterKeyHandler = (e: any) => {
        const key = e.key.trim();
        if (key === "Enter") {
            handleConfirmEmail();
        }
    };

    const isValidCode = /^\d{6}$/.test(confirmationCode);

    return (
        <ConfirmEmailPage>
            <Paper elevation={6}>
                <ConfirmEmailContainer onKeyDown={enterKeyHandler}>
                    <ConfirmEmailTitle variant="h5">
                        Confirm Email
                    </ConfirmEmailTitle>
                    <ConfirmEmailDesc variant="body1">
                        Check your email for a six-digit confirmation code
                    </ConfirmEmailDesc>
                    <ConfirmEmailDesc
                        variant="body1"
                        sx={{
                            fontWeight: "600",
                        }}
                    >
                        Be sure to check your spam folder.
                    </ConfirmEmailDesc>
                    <ConfirmationField
                        label="Confirmation Code"
                        size="small"
                        required
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                        error={!isValidCode}
                    />
                    <ConfirmBtn
                        variant="contained"
                        disabled={!isValidCode}
                        onClick={handleConfirmEmail}
                    >
                        Confirm Email
                    </ConfirmBtn>
                    <ConfirmBtn 
                        variant="outlined" 
                        onClick={handleResendCode}
                    >
                        Resend Confirmation Code
                    </ConfirmBtn>
                </ConfirmEmailContainer>
            </Paper>
        </ConfirmEmailPage>
    );
};

export default ConfirmEmail;
