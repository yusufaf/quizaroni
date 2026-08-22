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
import { User } from 'shared/types';
import DownloadDataDialog from './DownloadDataDialog';

type Props = {
    userData: User;
};
// Change Password and Change Email used to live here as Amplify attribute
// mutations — Logto's hosted pages (and its own account settings) own both
// now, so this view is down to the fields that are actually app-local.
const AccountTab = ({ userData }: Props) => {
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
    const [showDownloadDialog, setShowDownloadDialog] =
        useState<boolean>(false);
    const [deletePassword, setDeletePassword] = useState<string>('');
    const [enteredNewUsername, setEnteredNewUsername] = useState<string>('');

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
