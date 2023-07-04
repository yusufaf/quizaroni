import {
    Button,
    Dialog,
    DialogActions,
    TextField,
    Typography,
} from "@mui/material/";
import { useTheme } from "theme/useTheme";
import { FlexDialogTitle as StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";

const ImportSetModal = (props) => {
    const { open, onClose } = props;

    return (
        <Dialog open={open} onClose={onClose}>
            <StyledDialogTitle>
                Import Cards
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <TextField
                fullWidth
                variant="outlined"
                multiline={true}
                minRows={4}
            />
            {/* Option to enter the cards like Quizlet has */}
            {/* TODO: Radio buttons */}

            <DialogActions>
                <Button variant="contained">Submit</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ImportSetModal;
