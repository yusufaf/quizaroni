import {
    Button,
    TextField,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { selectDialogOpen, setDialogOpen } from "state/slices/globalSlice";
import styled from "@emotion/styled";

type Props = {
}

const FeedbackDialog = (props: Props) => {
    const open = useSelector(selectDialogOpen);
    const dispatch = useDispatch();

    const handleClose = () => {
        dispatch(setDialogOpen(false));
    }

    const EmailInput = styled(TextField)({
        marginTop: "1rem",
        marginBottom: "1.5rem",
    })

    return (
        <div>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>Submit Feedback</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Submit any feedback you have about your experience with Quizaroni.
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
                    <Button variant="text" onClick={handleClose}>Cancel</Button>
                    <Button variant="contained" onClick={handleClose}>Submit</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default FeedbackDialog;