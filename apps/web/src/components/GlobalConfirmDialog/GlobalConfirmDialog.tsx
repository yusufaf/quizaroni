import {
    Button,
    Dialog,
    DialogContentText,
    DialogActions,
    Typography,
    DialogContent,
} from "@mui/material/";
import { useDispatch, useSelector } from "react-redux";
import {
    selectConfirmDialogProps,
    setConfirmDialogProps,
} from "state/slices/globalSlice";
import { ConfirmDialogProps } from "lib/types";
import {
    STUDYSET_CONFIRM_DIALOGS,
    INITIAL_CONFIRM_DIALOG_PROPS,
} from "utilities/constants";
import useCustomMutation from "lib/hooks/useCustomMutation";
import {
    useDeleteStudysetMutation,
    useDuplicateStudysetMutation,
} from "state/api/studysetsAPI";
import {
    StyledDialogActions,
    StyledDialogTitle,
} from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

type Props = {};
const ConfirmDialog = (props: Props) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const dialogProps = useSelector(selectConfirmDialogProps);

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

    const isTableMultiAction = [
        STUDYSET_CONFIRM_DIALOGS.DELETE_MULTIPLE,
        STUDYSET_CONFIRM_DIALOGS.DUPLICATE_MULTIPLE,
    ].includes(dialogProps.type);

    const onClose = () => {
        dispatch(setConfirmDialogProps({ ...INITIAL_CONFIRM_DIALOG_PROPS }));
    };

    const handleConfirm = async () => {
        switch (dialogProps.type) {
            case STUDYSET_CONFIRM_DIALOGS.DELETE:
                deleteStudySet({ ...dialogProps.props });
                navigate("/");
                break;
            case STUDYSET_CONFIRM_DIALOGS.DELETE_MULTIPLE: {
                const { studysetUUIDs = [] } = { ...dialogProps.props };
                const promises = studysetUUIDs.map((uuid: string) => {
                    return deleteStudySet({
                        uuid,
                    }).unwrap();
                });
                await Promise.allSettled(promises);
                break;
            }
            case STUDYSET_CONFIRM_DIALOGS.DUPLICATE:
                duplicateStudySet({ ...dialogProps.props });
                break;
            case STUDYSET_CONFIRM_DIALOGS.DUPLICATE_MULTIPLE:
                const { studysetUUIDs = [] } = { ...dialogProps.props };
                const promises = studysetUUIDs.map((uuid: string) => {
                    return duplicateStudySet({
                        uuid,
                    }).unwrap();
                });
                await Promise.allSettled(promises);
                break;
        }
        onClose();
    };

    return (
        <Dialog open={dialogProps?.open} onClose={onClose} fullWidth>
            <StyledDialogTitle>
                {dialogProps?.title}
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <DialogContent
                sx={{
                    paddingBottom: 0,
                }}
            >
                <DialogContentText>
                    <Typography>{dialogProps?.dialogMessage}</Typography>
                </DialogContentText>
                {isTableMultiAction && (
                    <DialogContentText>
                        <ul>
                            {dialogProps?.props?.messages?.map(
                                (message: string) => {
                                    return <li key={uuidv4()}>{message}</li>;
                                }
                            )}
                        </ul>
                    </DialogContentText>
                )}
            </DialogContent>
            <StyledDialogActions>
                <Button onClick={onClose}>
                    {dialogProps?.cancelButtonText || "Cancel"}
                </Button>
                <Button variant="contained" onClick={handleConfirm}>
                    {dialogProps?.confirmButtonText || "Confirm"}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
