import { useState } from "react";
import { Paper } from "@mui/material";
import { Auth } from "@aws-amplify/auth";
import { ConfirmBtn, ConfirmEmailContainer, ConfirmEmailDesc, ConfirmEmailPage, ConfirmEmailTitle, ConfirmationField } from "./styles";

type Props = {};

const ConfirmEmail = (props: Props) => {

    const [confirmationCode, setConfirmationCode] = useState<string>("");

    const handleConfirmEmail = () => {
        // TODO
    }

    const enterKeyHandler = (e: any) => {
        const key = e.key.trim();
        if (key === "Enter") {

            // handleSignup();
        }
    };

    const isValidCode = /^\d{6}$/.test(confirmationCode);

    return (
        <ConfirmEmailPage>
            <Paper elevation={6}>
                <ConfirmEmailContainer
                    onKeyDown={enterKeyHandler}
                >
                <ConfirmEmailTitle variant="h5">Confirm Email</ConfirmEmailTitle>
                <ConfirmEmailDesc variant="body1">
                    Check your email for a six-digit confirmation code
                </ConfirmEmailDesc>
                <ConfirmEmailDesc variant="body1"
                    sx={{
                        fontWeight: "600"
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
                />
                <ConfirmBtn
                    variant="contained"
                    disabled={!isValidCode}
                    onClick={handleConfirmEmail}
                >
                    Confirm Email
                </ConfirmBtn>

                </ConfirmEmailContainer>
            </Paper>
        </ConfirmEmailPage>
    );
};

export default ConfirmEmail;
