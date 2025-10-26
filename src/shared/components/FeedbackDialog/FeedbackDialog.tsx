import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
} from '@mui/material';
import { StyledDialogTitle, StyledDialogActions } from 'styles/AppStyles';
import { toast } from 'react-toastify';
import { useState } from 'react';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { useGlobalStore } from 'state/stores/global';

type Props = {};

const FeedbackDialog = (props: Props) => {
    const { feedbackDialogOpen: open, setFeedbackDialogOpen } =
        useGlobalStore();

    const onClose = () => {
        setFeedbackDialogOpen(false);
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
