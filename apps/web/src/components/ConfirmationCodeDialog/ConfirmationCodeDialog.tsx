import { StyledDialogActions } from 'common/AppStyles';
import {
    ConfirmDescription,
    StyledDialog,
    StyledDialogContent,
} from './styles';
import { Button, TextField } from '@mui/material';
import {
    selectConfirmationCodeDialogProps,
    setConfirmationCodeDialogProps,
} from 'state/slices/globalSlice';
import { useAppDispatch, useAppSelector } from 'state/reduxHooks';
import { useState } from 'react';
import {
    confirmSignUp,
    resendSignUpCode,
    confirmUserAttribute,
} from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';
import { useUpdateEmailMutation } from 'state/api/usersAPI';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';

type Props = {};
const ConfirmationCodeDialog = (props: Props) => {
    /* Redux / Hooks */
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    // const cognitoUser = useAppSelector(selectCognitoUser);
    // const { username } = cognitoUser;
    const username = '';
    const confirmationCodeDialogProps = useAppSelector(
        selectConfirmationCodeDialogProps
    );

    // TODO: Toast notification?
    const [updateEmail] = useUpdateEmailMutation();

    const [confirmationCode, setConfirmationCode] = useState<string>('');
    const isValidCode = /^\d{6}$/.test(confirmationCode);

    const {
        actionType = 'signUp',
        canResend = false,
        description = 'Check your email for a six-digit confirmation code.',
        newEmail = '',
        open,
        title = 'Confirm Email',
    } = confirmationCodeDialogProps;

    const closeDialog = () => {
        dispatch(
            setConfirmationCodeDialogProps({
                open: false,
            })
        );
    };

    const handleResendCode = async () => {
        try {
            const result = await resendSignUpCode({ username: '' });
            console.log('Code resent succesfully', result);
        } catch (err) {
            console.error('error resending code: ', err);
        }
    };

    const handleConfirmEmail = async () => {
        try {
            switch (actionType) {
                case 'signUp':
                    const result = await confirmSignUp({
                        username,
                        confirmationCode,
                    });

                    closeDialog();

                    /* Send user to login page if successfully confirmed email */
                    navigate('/login');
                    break;
                case 'changeEmail':
                    const changeEmailResult = await confirmUserAttribute({
                        userAttributeKey: 'email',
                        confirmationCode,
                    });
                    console.log({ changeEmailResult });

                    updateEmail({
                        username,
                        newEmail,
                    });

                    closeDialog();
            }
        } catch (error) {
            console.error('Error confirming sign up', error);
        }
    };

    return (
        <StyledDialog open={open} onClose={closeDialog} fullWidth>
            <StandardDialogTitle title={title} onClose={closeDialog} />
            <StyledDialogContent>
                <div>
                    <ConfirmDescription variant="body1">
                        {description}
                    </ConfirmDescription>
                    <ConfirmDescription
                        variant="body1"
                        sx={{
                            fontWeight: '600',
                            marginTop: '0.25rem',
                        }}
                    >
                        Be sure to check your spam folder.
                    </ConfirmDescription>
                </div>
                <TextField
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
            </StyledDialogContent>
            <StyledDialogActions>
                {canResend && (
                    <Button variant="outlined" onClick={handleResendCode}>
                        Resend Confirmation Code
                    </Button>
                )}
                <Button
                    variant="contained"
                    disabled={!isValidCode}
                    onClick={handleConfirmEmail}
                >
                    Confirm Email
                </Button>
            </StyledDialogActions>
        </StyledDialog>
    );
};

export default ConfirmationCodeDialog;
