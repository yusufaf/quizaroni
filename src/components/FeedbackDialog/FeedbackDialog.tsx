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
import styled from "@emotion/styled";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
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

    const EmailInput = styled(TextField)({
        marginTop: "1rem",
        marginBottom: "1.5rem",
    });

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
                    <EmailInput
                        autoFocus
                        label="Email Address"
                        type="email"
                        fullWidth
                        variant="standard"
                    />
                    <TextField
                        label="Feedback"
                        fullWidth
                        variant="outlined"
                        multiline={true}
                        minRows={4}
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="text" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={onClose}>
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default FeedbackDialog;
