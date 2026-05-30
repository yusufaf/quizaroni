import { useState } from 'react';
import { Paper } from '@mui/material';
import {
    confirmSignUp,
    resendSignUpCode,
    confirmUserAttribute,
} from 'aws-amplify/auth';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ConfirmBtn,
    ConfirmEmailContainer,
    ConfirmEmailDesc,
    ConfirmEmailPage,
    ConfirmEmailTitle,
    ConfirmationField,
} from './styles';
import { useUpdateEmail } from 'state/api/usersAPI';

type Props = {};
const ConfirmEmail = (props: Props) => {
    // const cognitoUser = useAppSelector(selectCognitoUser);
    // console.log({ cognitoUser });
    // const { username } = cognitoUser;
    const username = '';

    const navigate = useNavigate();
    const { state } = useLocation();

    const { mutate: updateEmail } = useUpdateEmail();

    const { actionType = 'signUp', canResend = false, newEmail = '' } = state;

    const [confirmationCode, setConfirmationCode] = useState<string>('');

    const handleConfirmEmail = async () => {
        try {
            switch (actionType) {
                case 'signUp':
                    const result = await confirmSignUp({
                        username,
                        confirmationCode,
                    });

                    /* Send user to login page if successfully confirmed email */
                    navigate('/login');
                    break;
                case 'changeEmail':
                    await confirmUserAttribute({
                        userAttributeKey: 'email',
                        confirmationCode,
                    });

                    updateEmail({
                        username,
                        newEmail,
                    });
                    navigate('/profile');
            }
        } catch (error) {
            console.error('Error confirming sign up', error);
        }
    };

    const handleResendCode = async () => {
        try {
            await resendSignUpCode({ username });
        } catch (err) {
            console.error('error resending code: ', err);
        }
    };

    const enterKeyHandler = (e: any) => {
        const key = e.key.trim();
        if (key === 'Enter') {
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
                            fontWeight: '600',
                        }}
                    >
                        Be sure to check your spam folder.
                    </ConfirmEmailDesc>
                    <ConfirmationField
                        label="Confirmation Code"
                        size="small"
                        required
                        placeholder="123456"
                        value={confirmationCode}
                        onChange={(e) => {
                            if (!(e.target.value.length > 6)) {
                                setConfirmationCode(e.target.value);
                            }
                        }}
                        error={!isValidCode && Boolean(confirmationCode)}
                    />
                    <ConfirmBtn
                        variant="contained"
                        disabled={!isValidCode}
                        onClick={handleConfirmEmail}
                    >
                        Confirm Email
                    </ConfirmBtn>
                    {canResend && (
                        <ConfirmBtn
                            variant="outlined"
                            onClick={handleResendCode}
                        >
                            Resend Confirmation Code
                        </ConfirmBtn>
                    )}
                </ConfirmEmailContainer>
            </Paper>
        </ConfirmEmailPage>
    );
};

export default ConfirmEmail;
