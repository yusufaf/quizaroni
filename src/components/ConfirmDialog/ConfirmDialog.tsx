import {
    Button,
    Dialog,
    DialogTitle,
    DialogContentText,
    DialogActions,
    Typography,
    DialogContent,
} from '@mui/material/';
import { useDispatch, useSelector } from 'react-redux';
import { selectDialogProps, setDialogProps } from 'state/slices/globalSlice';
import {
    ConfirmDialogProps
} from "lib/types"

type Props = {
}

const initialDialogProps: Partial<ConfirmDialogProps> = {
    open: false,
    title: "",
    dialogMessage: "",
};

const ConfirmDialog = (props: Props) => {
    const dispatch = useDispatch();
    const dialogProps = useSelector(selectDialogProps);

    const onClose = () => {
        dispatch(setDialogProps({...initialDialogProps}));
    }

    const handleClose = () => {
        onClose();
    }

    const handleConfirm = () => {
        dialogProps?.onConfirm();
        onClose();
    }

    return (
        <Dialog 
            open={dialogProps?.open} 
            onClose={dialogProps?.onClose}
        >
            <DialogTitle>
                {dialogProps?.title}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    <Typography>{dialogProps?.dialogMessage}</Typography>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={handleClose}
                >
                    {dialogProps?.cancelButtonText || "Cancel"}
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                >
                    {dialogProps?.confirmButtonText || "Confirm"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default ConfirmDialog;