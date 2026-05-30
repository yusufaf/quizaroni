import { Button, Dialog, DialogContentText, TextField } from '@mui/material/';
import * as C from 'shared/constants';
import { StyledDialogActions } from 'styles/AppStyles';
import { Dispatch, SetStateAction } from 'react';
import { DeleteDialogContent } from './ProfileStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useTranslation } from 'react-i18next';

type Props = {
    open: boolean;
    handleClose: () => void;
    deletePassword: string;
    setDeletePassword: Dispatch<SetStateAction<string>>;
};

const DeleteAccountDialog = (props: Props) => {
    const { t } = useTranslation('profile');
    const { open, handleClose, deletePassword, setDeletePassword } = props;

    // deleteUser(user).then(() => {
    //     // User deleted.
    //   }).catch((error) => {
    //     // An error ocurred
    //     // ...
    //   });

    const handleDeleteAccount = () => {
        // TODO
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <StandardDialogTitle
                title={t('deleteAccountDialog.title')}
                onClose={handleClose}
            />
            <DeleteDialogContent>
                <DialogContentText>{C.DELETE_ACCOUNT_MSG}</DialogContentText>
                <TextField
                    fullWidth={true}
                    label={t('deleteAccountDialog.passwordLabel')}
                    placeholder={t('deleteAccountDialog.passwordPlaceholder')}
                    value={deletePassword}
                    name="passwordInput"
                    onChange={(e) => setDeletePassword(e.target.value)}
                    // onBlur={e => checkIfInputEmpty(e)}
                    // helperText={showErrorText.passInput && "A password is required"}
                    // error={showErrorText.passInput}
                    size="small"
                />
            </DeleteDialogContent>
            <StyledDialogActions>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDeleteAccount()}
                    disabled={deletePassword === ''}
                >
                    {t('deleteAccountDialog.confirmButton')}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default DeleteAccountDialog;
