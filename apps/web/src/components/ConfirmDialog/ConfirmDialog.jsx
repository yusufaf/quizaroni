import {
    Button,
    Dialog,
    DialogTitle,
    DialogContentText,
    DialogActions,
    Typography,
    DialogContent,
} from '@mui/material/';

const ConfirmDialog = props => {
    const {
        open,
        onClose,
        title,
        dialogMessage,
        onConfirm,
        cancelButtonText = "Cancel",
        confirmButtonText = "Confirm",
    } = props;

    const handleClose = () => {
        onClose();
    }

    const handleConfirm = () => {
        onConfirm();
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>
                <Typography>{title}</Typography>
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    <Typography>{dialogMessage}</Typography>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={handleClose}
                >
                    {cancelButtonText}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                >
                    {confirmButtonText}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ConfirmDialog;