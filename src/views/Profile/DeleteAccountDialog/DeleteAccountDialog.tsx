import { Button, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography, TextField } from '@mui/material/';
import * as C from "utilities/constants";
import { styled } from '@mui/system';
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { Dispatch, SetStateAction } from 'react';

type Props = {
    open: boolean;
    handleClose: () => void;
    deletePassword: string;
    setDeletePassword: Dispatch<SetStateAction<string>>;
}

const DeleteAccountDialog = (props: Props) => {
    const { open, handleClose, deletePassword, setDeletePassword } = props;

    const DeletePasswordInput = styled(TextField)({
        marginTop: "1rem"
    })

    // deleteUser(user).then(() => {
    //     // User deleted.
    //   }).catch((error) => {
    //     // An error ocurred
    //     // ...
    //   });

    const handleDeleteAccount = () => {
        // TODO
    }

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            sx={{
                bottom: "20rem",
            }}
        >
            <StyledDialogTitle>
                Delete Account
                <CloseDialogButton onClose={handleClose} />
            </StyledDialogTitle>
            <DialogContent>
                <DialogContentText>
                    {C.DELETE_ACCOUNT_MSG}
                </DialogContentText>
                <DeletePasswordInput
                    fullWidth={true}
                    label="Password"
                    placeholder="Enter your password"
                    value={deletePassword}
                    name="passwordInput"
                    onChange={e => setDeletePassword(e.target.value)}
                    // onBlur={e => checkIfInputEmpty(e)}
                    // helperText={showErrorText.passInput && "A password is required"}
                    // error={showErrorText.passInput}
                    size="small"
                />
            </DialogContent>
            <DialogActions>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDeleteAccount()}
                    disabled={deletePassword === ""}
                >
                    Delete Account
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default DeleteAccountDialog;