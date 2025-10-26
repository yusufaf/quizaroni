import {
    Button,
    Dialog,
    DialogContentText,
    DialogActions,
    Typography,
    DialogContent,
} from '@mui/material/';
import { useGlobalStore } from 'state/stores/global';
import { ConfirmDialogProps } from 'shared/types';
import {
    STUDYSET_CONFIRM_DIALOGS,
    INITIAL_CONFIRM_DIALOG_PROPS,
} from 'shared/constants';
import useCustomMutation from 'hooks/useCustomMutation';
import {
    useDeleteStudysetMutation,
    useDuplicateStudysetMutation,
    useBatchDeleteStudysetsMutation,
    useBatchDuplicateStudysetsMutation,
} from 'state/api/studysetsAPI';
import { StyledDialogActions } from 'styles/AppStyles';
import { useNavigate } from 'react-router-dom';

import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';

type Props = {};
const ConfirmDialog = (props: Props) => {
    const navigate = useNavigate();
    const { confirmDialogProps: dialogProps, setConfirmDialogProps } = useGlobalStore();

    const { mutate: deleteStudySet } = useCustomMutation({
        mutation: useDeleteStudysetMutation,
        successMessage: 'Successfully deleted study set',
        errorMessage: 'Error deleting study set',
    });

    const {
        mutate: batchDeleteStudysets,
        isLoading: isBatchDeletingStudysets,
        isSuccess: isBatchDeletingStudysetsSuccess,
        isError: isBatchDeletingStudysetsError,
    } = useCustomMutation({
        mutation: useBatchDeleteStudysetsMutation,
        successMessage: 'Successfully deleted study sets',
        errorMessage: 'Error deleting study sets',
    });

    const {
        mutate: duplicateStudySet,
        isLoading: isDuplicatingStudySet,
        isSuccess: isDuplicateStudySetSuccess,
        isError: isDuplicateStudySetError,
    } = useCustomMutation({
        mutation: useDuplicateStudysetMutation,
        successMessage: 'Successfully duplicated study set',
        errorMessage: 'Error duplicating study set',
    });

    const {
        mutate: batchDuplicateStudysets,
        isLoading: isBatchDuplicatingStudySets,
        isSuccess: isBatchDuplicatingStudySetsSuccess,
        isError: isBatchDuplicatingStudySetsError,
    } = useCustomMutation({
        mutation: useBatchDuplicateStudysetsMutation,
        successMessage: 'Successfully duplicated study sets',
        errorMessage: 'Error duplicating study sets',
    });

    const isTableMultiAction = [
        STUDYSET_CONFIRM_DIALOGS.DELETE_MULTIPLE,
        STUDYSET_CONFIRM_DIALOGS.DUPLICATE_MULTIPLE,
    ].includes(dialogProps.type);

    const onClose = () => {
        setConfirmDialogProps({ ...INITIAL_CONFIRM_DIALOG_PROPS });
    };

    const handleConfirm = async () => {
        switch (dialogProps.type) {
            case STUDYSET_CONFIRM_DIALOGS.DELETE:
                deleteStudySet({ ...dialogProps.props });
                navigate('/');
                break;
            case STUDYSET_CONFIRM_DIALOGS.DELETE_MULTIPLE: {
                const { studysetUUIDs = [] } = { ...dialogProps.props };
                batchDeleteStudysets({ studysetUUIDs });
                break;
            }
            case STUDYSET_CONFIRM_DIALOGS.DUPLICATE:
                duplicateStudySet({ ...dialogProps.props });
                break;
            case STUDYSET_CONFIRM_DIALOGS.DUPLICATE_MULTIPLE:
                const { studysetUUIDs = [] } = { ...dialogProps.props };
                batchDuplicateStudysets({ studysetUUIDs });
                break;
        }
        onClose();
    };

    return (
        <Dialog open={dialogProps?.open} onClose={onClose} fullWidth>
            <StandardDialogTitle title={dialogProps?.title} onClose={onClose} />
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
                                    return <li key={crypto.randomUUID()}>{message}</li>;
                                }
                            )}
                        </ul>
                    </DialogContentText>
                )}
            </DialogContent>
            <StyledDialogActions>
                <Button onClick={onClose}>
                    {dialogProps?.cancelButtonText || 'Cancel'}
                </Button>
                <Button variant="contained" onClick={handleConfirm}>
                    {dialogProps?.confirmButtonText || 'Confirm'}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default ConfirmDialog;
