import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { selectFeedbackDialogOpen, setFeedbackDialogOpen } from "state/slices/globalSlice";
import { StyledDialogTitle, StyledDialogActions } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { toast } from "react-toastify";
import { useState } from "react";

type Props = {};

const FeedbackDialog = (props: Props) => {
    const open = useSelector(selectFeedbackDialogOpen);
    const dispatch = useDispatch();

    const onClose = () => {
        dispatch(setFeedbackDialogOpen(false));
    };

    const [feedbackText, setFeedbackText] = useState<string>("");

    const onSubmit = () => {
        
        
    }

    return (
        <div>
            <Dialog open={open} onClose={onClose}>
                <StyledDialogTitle>
                    Submit Feedback
                    <CloseDialogButton onClose={onClose} />
                </StyledDialogTitle>
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
                            marginTop: "1rem",
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
