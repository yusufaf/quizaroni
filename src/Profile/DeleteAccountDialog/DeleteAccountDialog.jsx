import { Button, Tooltip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography, TextField } from '@mui/material/';
import * as C from "../../utilities/constants";
import { styled } from '@mui/system';

const DeleteAccountDialog = props => {
    const { open, handleClose, enteredPassword, setEnteredPassword } = props;

    const DeletePasswordInput = styled(TextField)({
        marginTop: "1rem"
    })

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            sx={{
                bottom: "20rem",
            }}
        >
            <DialogTitle>Delete Account</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {C.DELETE_ACCOUNT_MSG}
                </DialogContentText>

                <DeletePasswordInput
                    fullWidth={true}
                    label="Password"
                    placeholder="Enter your password"
                    value={enteredPassword}
                    name="passwordInput"
                    onChange={e => setEnteredPassword(e.target.value)}
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
                    disabled={enteredPassword === ""}
                >
                    Delete Account
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default DeleteAccountDialog;