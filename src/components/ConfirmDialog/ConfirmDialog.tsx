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
import { CONFIRM_DIALOGS } from 'utilities/constants';
import useCustomMutation from "lib/hooks/useCustomMutation";
import { useDeleteStudysetMutation, useDuplicateStudysetMutation } from "state/api/studysets";

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

    const { mutate: deleteStudySet } = useCustomMutation({
        mutation: useDeleteStudysetMutation,
        successMessage: "Successfully deleted study set",
        errorMessage: "Error deleting study set",
    });

    const {
        mutate: duplicateStudySet,
        isLoading: isDuplicatingStudySet,
        isSuccess: isDuplicateStudySetSuccess,
        isError: isDuplicateStudySetError,
    } = useCustomMutation({
        mutation: useDuplicateStudysetMutation,
        successMessage: "Successfully duplicated study set",
        errorMessage: "Error duplicating study set",
    });


    const onClose = () => {
        dispatch(setDialogProps({...initialDialogProps}));
    }

    const handleConfirm = () => {
        switch (dialogProps.type) {
            case CONFIRM_DIALOGS.DELETE:
                deleteStudySet({...dialogProps.props});
                break;
            case CONFIRM_DIALOGS.DUPLICATE:

        }
        onClose();
    }

    return (
        <Dialog 
            open={dialogProps?.open} 
            onClose={onClose}
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
                    onClick={onClose}
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