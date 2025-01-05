import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from 'state/reduxHooks';
import {
    selectFeedbackDialogOpen,
    setFeedbackDialogOpen,
} from 'state/slices/globalSlice';
import { StyledDialogTitle, StyledDialogActions } from 'styles/AppStyles';
import CloseDialogButton from 'components/StandardDialogTitle/StandardDialogTitle';
import { toast } from 'react-toastify';
import { useState } from 'react';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';

type Props = {};

const FeedbackDialog = (props: Props) => {
    const open = useAppSelector(selectFeedbackDialogOpen);
    const dispatch = useAppDispatch();

    const onClose = () => {
        dispatch(setFeedbackDialogOpen(false));
    };

    const [feedbackText, setFeedbackText] = useState<string>('');

    const onSubmit = () => {};

    return (
        <div>
            <Dialog open={open} onClose={onClose}>
                <StandardDialogTitle
                    title="Submit Feedback"
                    onClose={onClose}
                />
                <DialogContent>
                    <DialogContentText>
                        Submit any feedback you have about your experience with
                        Quizaroni.
                    </DialogContentText>
                    <TextField
                        label="Feedback"
                        fullWidth
                        variant="outlined"
                        multiline={true}
                        minRows={4}
                        sx={{
                            marginTop: '1rem',
                        }}
                    />
                </DialogContent>
                <StyledDialogActions>
                    <Button variant="text" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        disabled={!feedbackText}
                        onClick={onClose}
                    >
                        Submit
                    </Button>
                </StyledDialogActions>
            </Dialog>
        </div>
    );
};

export default FeedbackDialog;
