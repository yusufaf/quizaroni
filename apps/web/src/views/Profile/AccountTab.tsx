import {
    Person,
    RemoveCircleOutline,
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
import { useLogto } from '@logto/react';
import { toast } from 'react-toastify';
import { isValidUsername } from '@quizaroni/shared-types';
import { User } from 'shared/types';
import { isHttpStatus } from 'state/api/awsAPI';
import { useUpdateUsername } from 'state/api/usersAPI';
import DownloadDataDialog from './DownloadDataDialog';

type Props = {
    userData: User;
};

const USERNAME_RULE =
    '3-32 letters, numbers or underscores, not starting with a number';

// Change Password and Change Email used to live here as Amplify attribute
// mutations — Logto's hosted pages (and its own account settings) own both
// now. The username is changed through the API, which writes it to Logto.
const AccountTab = ({ userData }: Props) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showDownloadDialog, setShowDownloadDialog] =
        useState<boolean>(false);
    const [deletePassword, setDeletePassword] = useState<string>('');
    const [enteredNewUsername, setEnteredNewUsername] = useState<string>('');
    const { clearAccessToken } = useLogto();
    const { mutateAsync: updateUsername, isPending } = useUpdateUsername();

    const trimmedUsername = enteredNewUsername.trim();
    const isUsernameValid = isValidUsername(trimmedUsername);
    const showUsernameRule = trimmedUsername !== '' && !isUsernameValid;

    const handleDeleteAccount = async () => {
        // TODO
    };

    const handleChangeUsername = async () => {
        try {
            const result = await updateUsername({ username: trimmedUsername });
            // The cached token still carries the old username claim, which
            // the API stamps on new sets; the next call mints a fresh one.
            await clearAccessToken();
            setEnteredNewUsername('');
            toast.success(`Username changed to ${trimmedUsername}`);
            if (!result.studysetsRenameComplete) {
                toast.warning(
                    'Some of your study sets still show your old username'
                );
            }
        } catch (err) {
            if (isHttpStatus(err, 409)) {
                toast.error('That username is taken');
            } else if (isHttpStatus(err, 400)) {
                toast.error(USERNAME_RULE);
            } else {
                toast.error('Failed to change username');
            }
        }
    };

    const toggleDeleteDialog = () => {
        setShowDeleteDialog((prevShowDelete) => !prevShowDelete);
    };

    const toggleDownloadDataDialog = () => {
        setShowDownloadDialog((prevShowDownload) => !prevShowDownload);
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
                        error={showUsernameRule}
                        helperText={
                            showUsernameRule ? USERNAME_RULE : undefined
                        }
                    />
                    <ActionSubmitButton
                        variant="contained"
                        onClick={() => handleChangeUsername()}
                        disabled={
                            !isUsernameValid ||
                            trimmedUsername === userData.username ||
                            isPending
                        }
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
                    variant="text"
                    onClick={toggleDeleteDialog}
                    fullWidth
                    sx={{
                        color: '#d32f2f',
                        backgroundColor: 'rgba(211, 47, 47, 0.08)',
                        '&:hover': {
                            backgroundColor: 'rgba(211, 47, 47, 0.16)',
                        },
                    }}
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
