import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { confirmResetPassword, resetPassword } from 'aws-amplify/auth';
import { Paper } from '@mui/material';
import {
    ForgotPassBtn,
    ForgotPassField,
    ForgotPasswordContainer,
    ForgotPasswordDesc,
    ForgotPasswordPage,
    ForgotPasswordTitle,
} from './styles';
import PasswordValidator from 'components/PasswordValidator/PasswordValidator';

type Props = {};

const ForgotPassword = (props: Props) => {
    const navigate = useNavigate();

    const [username, setUsername] = useState<string>('');
    const [confirmationCode, setConfirmationCode] = useState<string>('');
    const [codeSent, setCodeSent] = useState<boolean>(false);
    const [newPassword, setNewPassword] = useState<string>('');
    const [passwordValid, setPasswordValid] = useState<boolean>(false);

    const isValidCode = /^\d{6}$/.test(confirmationCode);

    const handleForgotPassword = async () => {
        try {
            await resetPassword({ username });

            /* Trigger change in the "form" */
            setCodeSent(true);
        } catch (error) {
            console.error('Error sending code ', error);
        }
    };

    const handleResetPassword = async () => {
        try {
            await confirmResetPassword({
                username,
                confirmationCode,
                newPassword,
            });

            /* Send user to login page if successfully changed */
            navigate('/login');
        } catch (error) {}
    };

    const enterKeyHandler = (e: KeyboardEvent) => {
        if (e.key !== 'Enter') {
            return;
        }
        if (codeSent) {
            if (username && isValidCode && passwordValid) {
                void handleResetPassword();
            }
        } else if (username.trim()) {
            void handleForgotPassword();
        }
    };

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
                                fontWeight: '600',
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
                                    disabled={
                                        !isValidCode ||
                                        !username ||
                                        !passwordValid
                                    }
                                    onClick={handleResetPassword}
                                >
                                    Reset Password
                                </ForgotPassBtn>
                                <PasswordValidator
                                    password={newPassword}
                                    setIsPasswordValid={setPasswordValid}
                                />
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
