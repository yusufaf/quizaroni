import {
    Alert,
    Button,
    Checkbox,
    CircularProgress,
    Dialog,
    DialogContentText,
    FormControlLabel,
    TextField,
} from '@mui/material/';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import StandardDialogTitle from 'shared/components/StandardDialogTitle/StandardDialogTitle';
import { useSession } from 'shared/auth/session/SessionProvider';
import {
    AuthRequestError,
    type SocialProvider,
    startSocialSignIn,
} from 'shared/auth/session/sessionClient';
import { useAuthProviders } from 'state/api/authProvidersAPI';
import { useAccountDeletionInfo } from 'state/api/usersAPI';
import { StyledDialogActions } from 'styles/AppStyles';
import { DeleteDialogContent } from './ProfileStyles';

type Props = {
    open: boolean;
    handleClose: () => void;
    reauthFailed?: boolean;
};

// Where a provider sign-in lands, success or not, so the dialog is still open.
const REAUTH_RETURN = '/profile?tab=Account&deleteAccount=1';

const PROVIDER_LABELS: Record<SocialProvider, string> = {
    google: 'Google',
    github: 'GitHub',
};

type ErrorKey =
    | 'wrongPassword'
    | 'sessionExpired'
    | 'lastAdmin'
    | 'rateLimited'
    | 'failed'
    | 'reauthFailed';

const errorKeyOf = (err: unknown): ErrorKey => {
    if (err instanceof AuthRequestError) {
        if (err.code === 'INVALID_PASSWORD' || err.code === 'PASSWORD_REQUIRED')
            return 'wrongPassword';
        if (err.code === 'SESSION_EXPIRED') return 'sessionExpired';
        if (err.code === 'LAST_ADMIN') return 'lastAdmin';
        if (err.status === 429) return 'rateLimited';
    }
    return 'failed';
};

const DeleteAccountDialog = ({ open, handleClose, reauthFailed }: Props) => {
    const { t } = useTranslation('profile');
    const { deleteAccount } = useSession();
    const {
        data: info,
        isFetching,
        isError,
        refetch,
    } = useAccountDeletionInfo(open);
    const available = useAuthProviders();
    const [password, setPassword] = useState('');
    const [acknowledged, setAcknowledged] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<ErrorKey | null>(null);
    const [showReauthFailed, setShowReauthFailed] = useState(!!reauthFailed);

    const close = () => {
        if (pending) return;
        setPassword('');
        setAcknowledged(false);
        setError(null);
        setShowReauthFailed(false);
        handleClose();
    };

    const ready = !!info && !isFetching && !info.lastAdmin;
    const needsPassword = info?.reauth === 'password';
    const signInRecent = !!info && info.recentSignInSecondsLeft > 0;
    const canConfirmHere = ready && (needsPassword || signInRecent);
    const canConfirm =
        canConfirmHere &&
        (!needsPassword || password !== '') &&
        acknowledged &&
        !pending;
    const reauthProviders =
        info?.providers.filter((id) => available?.providers.includes(id)) ?? [];

    const handleDeleteAccount = async () => {
        if (!canConfirm) return;
        setPending(true);
        setError(null);
        try {
            await deleteAccount(needsPassword ? { password } : {});
        } catch (err) {
            const key = errorKeyOf(err);
            setError(key);
            setPending(false);
            if (key === 'sessionExpired' || key === 'lastAdmin') {
                void refetch();
            }
        }
    };

    const handleReauth = async (provider: SocialProvider) => {
        setPending(true);
        setError(null);
        setShowReauthFailed(false);
        try {
            const url = await startSocialSignIn({
                provider,
                callbackURL: REAUTH_RETURN,
                errorCallbackURL: REAUTH_RETURN,
            });
            window.location.assign(url);
        } catch {
            setError('reauthFailed');
            setPending(false);
        }
    };

    const renderBody = () => {
        if (!info) {
            return isError && !isFetching ? (
                <Alert severity="error" role="alert">
                    {t('deleteAccountDialog.loadFailed')}
                </Alert>
            ) : (
                <CircularProgress sx={{ alignSelf: 'center' }} />
            );
        }
        if (isFetching) {
            return <CircularProgress sx={{ alignSelf: 'center' }} />;
        }
        if (info.lastAdmin) {
            return (
                <DialogContentText>
                    {t('deleteAccountDialog.lastAdmin')}
                </DialogContentText>
            );
        }
        return (
            <>
                {showReauthFailed && (
                    <Alert severity="error" role="alert">
                        {t('deleteAccountDialog.errors.reauthFailed')}
                    </Alert>
                )}
                <DialogContentText sx={{ fontWeight: 'bold' }}>
                    {t('deleteAccountDialog.accountLine', {
                        email: info.email,
                    })}
                </DialogContentText>
                <DialogContentText>
                    {t('deleteAccountDialog.intro')}
                </DialogContentText>
                {info.studysets > 0 && (
                    <DialogContentText>
                        {t('deleteAccountDialog.studysetsDeleted', {
                            count: info.studysets,
                        })}
                    </DialogContentText>
                )}
                {info.publishedStudysets > 0 && (
                    <DialogContentText>
                        {t('deleteAccountDialog.publishedDeleted', {
                            count: info.publishedStudysets,
                        })}
                    </DialogContentText>
                )}
                <DialogContentText>
                    {t('deleteAccountDialog.copiesStay')}
                </DialogContentText>
                <DialogContentText>
                    {t('deleteAccountDialog.downloadHint')}
                </DialogContentText>
                {canConfirmHere ? (
                    <>
                        {needsPassword ? (
                            <TextField
                                fullWidth={true}
                                type="password"
                                autoComplete="current-password"
                                label={t('deleteAccountDialog.passwordLabel')}
                                placeholder={t(
                                    'deleteAccountDialog.passwordPlaceholder'
                                )}
                                value={password}
                                name="passwordInput"
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={pending}
                                size="small"
                            />
                        ) : (
                            <DialogContentText>
                                {t('deleteAccountDialog.recentSignIn')}
                            </DialogContentText>
                        )}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={acknowledged}
                                    onChange={(e) =>
                                        setAcknowledged(e.target.checked)
                                    }
                                    disabled={pending}
                                />
                            }
                            label={t('deleteAccountDialog.acknowledge')}
                        />
                    </>
                ) : reauthProviders.length > 0 ? (
                    <>
                        <DialogContentText>
                            {t('deleteAccountDialog.reauthIntro')}
                        </DialogContentText>
                        {reauthProviders.map((provider) => (
                            <Button
                                key={provider}
                                type="button"
                                variant="outlined"
                                disabled={pending}
                                onClick={() => void handleReauth(provider)}
                            >
                                {t('deleteAccountDialog.reauthButton', {
                                    provider: PROVIDER_LABELS[provider],
                                })}
                            </Button>
                        ))}
                    </>
                ) : (
                    <DialogContentText>
                        {t('deleteAccountDialog.reauthUnavailable')}
                    </DialogContentText>
                )}
                {error && (
                    <Alert severity="error" role="alert">
                        {t(`deleteAccountDialog.errors.${error}`)}
                    </Alert>
                )}
            </>
        );
    };

    return (
        <Dialog open={open} onClose={close}>
            <StandardDialogTitle
                title={t('deleteAccountDialog.title')}
                onClose={close}
            />
            <DeleteDialogContent>{renderBody()}</DeleteDialogContent>
            {canConfirmHere && (
                <StyledDialogActions>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => void handleDeleteAccount()}
                        disabled={!canConfirm}
                    >
                        {pending
                            ? t('deleteAccountDialog.deleting')
                            : t('deleteAccountDialog.confirmButton')}
                    </Button>
                </StyledDialogActions>
            )}
        </Dialog>
    );
};

export default DeleteAccountDialog;
