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
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { isValidUsername } from '@quizaroni/shared-types';
import { User } from 'shared/types';
import { isHttpStatus } from 'state/api/apiClient';
import { useUpdateUsername } from 'state/api/usersAPI';
import DownloadDataDialog from './DownloadDataDialog';
import { useTranslation } from 'react-i18next';

type Props = {
    userData: User;
};

// Username, account deletion and data download.
const AccountTab = ({ userData }: Props) => {
    const { t } = useTranslation(['profile', 'common']);
    const [searchParams, setSearchParams] = useSearchParams();
    // Back from a provider sign-in made to confirm the deletion, reopen it.
    const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(
        () => searchParams.get('deleteAccount') === '1'
    );
    const [reauthFailed] = useState<boolean>(
        () => showDeleteDialog && searchParams.has('error')
    );
    const [showDownloadDialog, setShowDownloadDialog] =
        useState<boolean>(false);
    const [enteredNewUsername, setEnteredNewUsername] = useState<string>('');
    const { mutateAsync: updateUsername, isPending } = useUpdateUsername();

    const trimmedUsername = enteredNewUsername.trim();
    const isUsernameValid = isValidUsername(trimmedUsername);
    const showUsernameRule = trimmedUsername !== '' && !isUsernameValid;

    useEffect(() => {
        const stale = ['deleteAccount', 'error', 'error_description'];
        if (!stale.some((name) => searchParams.has(name))) return;
        const rest = new URLSearchParams(searchParams);
        stale.forEach((name) => rest.delete(name));
        setSearchParams(rest, { replace: true });
    }, [searchParams, setSearchParams]);

    const handleChangeUsername = async () => {
        try {
            const result = await updateUsername({ username: trimmedUsername });
            setEnteredNewUsername('');
            toast.success(
                t('account.usernameChanged', { username: trimmedUsername })
            );
            if (!result.studysetsRenameComplete) {
                toast.warning(t('account.oldUsernameRemains'));
            }
        } catch (err) {
            if (isHttpStatus(err, 409)) {
                toast.error(t('account.usernameTaken'));
            } else if (isHttpStatus(err, 400)) {
                toast.error(t('account.usernameRule'));
            } else {
                toast.error(t('account.usernameChangeFailed'));
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
                    <Typography variant="h6">
                        {t('account.changeUsername')}
                    </Typography>
                </ActionHeader>
                <InfoChangeContainer>
                    <TextField
                        variant="standard"
                        label={t('account.usernameLabel')}
                        placeholder={t('account.usernamePlaceholder')}
                        value={enteredNewUsername}
                        onChange={(e) => setEnteredNewUsername(e.target.value)}
                        size="small"
                        error={showUsernameRule}
                        helperText={
                            showUsernameRule
                                ? t('account.usernameRule')
                                : undefined
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
                        {t('common:buttons.submit')}
                    </ActionSubmitButton>
                </InfoChangeContainer>
            </ActionSection>
            <ActionSection>
                <ActionHeader>
                    <RemoveCircleOutline />
                    <Typography variant="h6">
                        {t('account.deleteAccount')}
                    </Typography>
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
                    {t('account.deleteAccount')}
                </ActionSubmitButton>
                <DeleteAccountDialog
                    open={showDeleteDialog}
                    handleClose={toggleDeleteDialog}
                    reauthFailed={reauthFailed}
                />
            </ActionSection>
            <ActionSection>
                <ActionHeader>
                    <DataUsageRounded />
                    <Typography variant="h6">
                        {t('account.downloadData')}
                    </Typography>
                </ActionHeader>
                <ActionSubmitButton
                    variant="outlined"
                    onClick={toggleDownloadDataDialog}
                    fullWidth
                >
                    {t('account.downloadData')}
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
