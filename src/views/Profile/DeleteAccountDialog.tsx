import {
    Button,
    Tooltip,
    Dialog,
    DialogContentText,
    Typography,
    TextField,
} from '@mui/material/';
import * as C from 'utilities/constants';
import { StyledDialogTitle, StyledDialogActions } from 'common/AppStyles';
import CloseDialogButton from 'components/StandardDialogTitle/StandardDialogTitle';
import { Dispatch, SetStateAction } from 'react';
import { DeleteDialogContent } from './ProfileStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';

type Props = {
    open: boolean;
    handleClose: () => void;
    deletePassword: string;
    setDeletePassword: Dispatch<SetStateAction<string>>;
};

const DeleteAccountDialog = (props: Props) => {
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

    console.log({ deletePassword });

    return (
        <Dialog open={open} onClose={handleClose}>
            <StandardDialogTitle title="Delete Account" onClose={handleClose} />
            <DeleteDialogContent>
                <DialogContentText>{C.DELETE_ACCOUNT_MSG}</DialogContentText>
                <TextField
                    fullWidth={true}
                    label="Password"
                    placeholder="Enter your password"
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
                    Delete Account
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default DeleteAccountDialog;
