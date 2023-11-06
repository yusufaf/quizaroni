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
import { useDispatch, useSelector } from "react-redux";
import { selectShowImportModal, setShowImportModal } from "state/slices/createSetSlice";

type Props = {};
const ImportSetModal = (props: Props) => {
    const dispatch = useDispatch();
    const showImportModal = useSelector(selectShowImportModal);

    const onClose = () => {
        dispatch(setShowImportModal(false));
    }

    return (
        <Dialog open={showImportModal} onClose={onClose} fullWidth maxWidth="md">
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
