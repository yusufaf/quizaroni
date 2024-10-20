import {
    Person,
    RemoveCircleOutline,
    EmailRounded,
    DataUsageRounded,
} from '@mui/icons-material';
import { Typography, TextField } from '@mui/material';
import DeleteAccountDialog from './DeleteAccountDialog';
import {
    AccountViewContainer,
    ActionHeader,
    ActionSection,
    ActionSubmitButton,
    InfoChangeContainer,
} from './ProfileStyles';
import { useState } from 'react';
import {
    type UpdateUserAttributeOutput,
    updateUserAttribute,
} from '@aws-amplify/auth';
import { EMAIL_REGEX } from 'utilities/constants';
import { useNavigate } from 'react-router-dom';
import { User } from 'lib/types';
import { useAppDispatch } from 'state/reduxHooks';
import { setConfirmationCodeDialogProps } from 'state/slices/globalSlice';
import ChangePasswordSection from './ChangePasswordSection';
import DownloadDataDialog from './DownloadDataDialog';

type Props = {
    userData: User;
};
const AccountTab = ({ userData }: Props) => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showDownloadDialog, setShowDownloadDialog] =
        useState<boolean>(false);
    const [deletePassword, setDeletePassword] = useState<string>('');
    const [enteredNewUsername, setEnteredNewUsername] = useState<string>('');
    const [newEmail, setNewEmail] = useState<string>('');

    const isNewEmailValid = EMAIL_REGEX.test(newEmail);

    const handleDeleteAccount = async () => {
        // TODO
    };

    /**
     * Change username for authenticated user
     */
    const handleChangeUsername = async () => {
        // TODO
    };

    const toggleDeleteDialog = () => {
        setShowDeleteDialog((prevShowDelete) => !prevShowDelete);
    };

    const toggleDownloadDataDialog = () => {
        setShowDownloadDialog((prevShowDownload) => !prevShowDownload);
    };

    const handleUpdateUserAttribute = async (
        attributeKey: string,
        value: string
    ) => {
        try {
            const output = await updateUserAttribute({
                userAttribute: {
                    attributeKey,
                    value,
                },
            });
            handleUpdateUserAttributeNextSteps(output);
        } catch (error) {
            console.log(error);
        }
    };

    const handleUpdateUserAttributeNextSteps = (
        output: UpdateUserAttributeOutput
    ) => {
        const { nextStep } = output;

        switch (nextStep.updateAttributeStep) {
            case 'CONFIRM_ATTRIBUTE_WITH_CODE':
                dispatch(
                    setConfirmationCodeDialogProps({
                        open: true,
                        actionType: 'changeEmail',
                        canResend: false,
                        description: `To confirm you want to change the email associated with your account to ${newEmail}, we've sent a 6-digit confirmation code.`,
                        newEmail,
                        title: 'Confirm Email Change',
                    })
                );

                break;
            case 'DONE':
                console.log(`attribute was successfully updated.`);
                break;
        }
    };

    const handleChangeEmail = async () => {
        handleUpdateUserAttribute('email', newEmail);
        setNewEmail('');
    };

    const getChangeEmailHelperText = () => {
        if (newEmail && !isNewEmailValid) {
            return 'Please enter a valid email';
        }

        // Existing email would satisfy regex
        if (newEmail === userData.email) {
            return 'Same as current email';
        }
    };

    return (
        <AccountViewContainer>
            <ActionSection>
                <ActionHeader>
                    <Person />
                    <Typography variant="h6">Change Username</Typography>
                </ActionHeader>
                <InfoChangeContainer>
                    <TextField
                        variant="standard"
                        label="Username"
                        placeholder="Enter new username"
                        value={enteredNewUsername}
                        onChange={(e) => setEnteredNewUsername(e.target.value)}
                        size="small"
                    />
                    <ActionSubmitButton
                        variant="contained"
                        onClick={() => handleChangeUsername()}
                        disabled={enteredNewUsername === ''}
                    >
                        Submit
                    </ActionSubmitButton>
                </InfoChangeContainer>
            </ActionSection>
            <ChangePasswordSection />
            <ActionSection>
                <ActionHeader>
                    <EmailRounded />
                    <Typography variant="h6">Change Email</Typography>
                </ActionHeader>
                <InfoChangeContainer>
                    <TextField
                        variant="standard"
                        label="New Email"
                        placeholder="Enter new email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required={true}
                        error={Boolean(newEmail) && !isNewEmailValid}
                        helperText={getChangeEmailHelperText()}
                    />
                    <ActionSubmitButton
                        variant="contained"
                        onClick={handleChangeEmail}
                        disabled={!newEmail || !isNewEmailValid}
                    >
                        Submit
                    </ActionSubmitButton>
                </InfoChangeContainer>
            </ActionSection>
            <ActionSection>
                <ActionHeader>
                    <RemoveCircleOutline />
                    <Typography variant="h6">Delete Account</Typography>
                </ActionHeader>
                <ActionSubmitButton
                    variant="outlined"
                    color="error"
                    onClick={toggleDeleteDialog}
                    fullWidth
                >
                    Delete Account
                </ActionSubmitButton>
                <DeleteAccountDialog
                    open={showDeleteDialog}
                    handleClose={toggleDeleteDialog}
                    deletePassword={deletePassword}
                    setDeletePassword={setDeletePassword}
                />
            </ActionSection>
            <ActionSection>
                <ActionHeader>
                    <DataUsageRounded />
                    <Typography variant="h6">Download Data</Typography>
                </ActionHeader>
                <ActionSubmitButton
                    variant="outlined"
                    onClick={toggleDownloadDataDialog}
                    fullWidth
                >
                    Download Data
                </ActionSubmitButton>
                <DownloadDataDialog
                    open={showDownloadDialog}
                    handleClose={toggleDownloadDataDialog}
                />
            </ActionSection>
        </AccountViewContainer>
    );
};

export default AccountTab;
