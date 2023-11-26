import {
    Button,
    Dialog,
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
import { STUDYSET_CONFIRM_DIALOGS } from 'utilities/constants';
import useCustomMutation from "lib/hooks/useCustomMutation";
import { useDeleteStudysetMutation, useDuplicateStudysetMutation } from "state/api/studysetsAPI";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { useNavigate } from 'react-router-dom';

type Props = {
}

const initialDialogProps: Partial<ConfirmDialogProps> = {
    open: false,
    title: "",
    dialogMessage: "",
};

const ConfirmDialog = (props: Props) => {

    const navigate = useNavigate();
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
            case STUDYSET_CONFIRM_DIALOGS.DELETE:
                deleteStudySet({...dialogProps.props});
                navigate("/");
                break;
            case STUDYSET_CONFIRM_DIALOGS.DUPLICATE:
                duplicateStudySet({...dialogProps.props});
                break;
        }
        onClose();
    }

    if (!dialogProps?.open) {
        return null;
    } 
    
    return (
        <Dialog 
            open={dialogProps?.open} 
            onClose={onClose}
            fullWidth
        >
            <StyledDialogTitle>
                {dialogProps?.title}
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
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