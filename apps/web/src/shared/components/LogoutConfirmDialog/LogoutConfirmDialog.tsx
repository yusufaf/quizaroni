import {
    Button,
    Dialog,
    DialogContent,
    DialogContentText,
} from '@mui/material/';
import { useTranslation } from 'react-i18next';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useSignOut } from 'hooks/useLogout';
import { useGlobalStore } from 'state/stores/global';
import { StyledDialogActions } from 'styles/AppStyles';

/**
 * Shown instead of signing out straight away when some progress hasn't reached
 * the server yet, because signing out removes it from this device.
 */
const LogoutConfirmDialog = () => {
    const { t } = useTranslation();
    const signOutNow = useSignOut();
    const open = useGlobalStore((state) => state.logoutConfirmOpen);
    const setOpen = useGlobalStore((state) => state.setLogoutConfirmOpen);

    const onClose = () => setOpen(false);
    const onConfirm = () => {
        setOpen(false);
        void signOutNow();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth>
            <StandardDialogTitle
                title={t('logoutConfirm.title')}
                onClose={onClose}
            />
            <DialogContent sx={{ paddingBottom: 0 }}>
                <DialogContentText>{t('logoutConfirm.body')}</DialogContentText>
            </DialogContent>
            <StyledDialogActions>
                <Button onClick={onClose}>{t('logoutConfirm.cancel')}</Button>
                <Button variant="contained" color="error" onClick={onConfirm}>
                    {t('logoutConfirm.confirm')}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default LogoutConfirmDialog;
