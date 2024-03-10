import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from "@mui/material/";
import { useTheme } from "theme/useTheme";
import { StyledDialogActions, StyledDialogTitle } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { useDispatch, useSelector } from "react-redux";
import {
    selectShowImportModal,
    setShowImportModal,
} from "state/slices/createSetSlice";
import { useState } from "react";

type Props = {};

const IMPORT_METHODS = {
    JSON_INPUT: "JSON Input",
    FILE: "File Upload",
}

const ImportSetModal = (props: Props) => {
    const dispatch = useDispatch();
    const showImportModal = useSelector(selectShowImportModal);

    const [importMethod, setImportMethod] = useState(IMPORT_METHODS.JSON_INPUT);

    const handleImportMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setImportMethod((event.target as HTMLInputElement).value);
    };

    const onClose = () => {
        dispatch(setShowImportModal(false));
    };

    return (
        <Dialog
            open={showImportModal}
            onClose={onClose}
            fullWidth
            maxWidth="md"
        >
            <StyledDialogTitle>
                Import Cards
                <CloseDialogButton onClose={onClose} />
            </StyledDialogTitle>
            <DialogContent>
                <FormControl>
                    <FormLabel id="import-method-radio-group-label">
                        Import Method
                    </FormLabel>
                    <RadioGroup
                        row
                        aria-labelledby="import-method-radio-group-label"
                        name="import-method-radio-group"
                        value={importMethod}
                        onChange={handleImportMethodChange}
                    >
                        <FormControlLabel
                            value={IMPORT_METHODS.JSON_INPUT}
                            control={<Radio />}
                            label={IMPORT_METHODS.JSON_INPUT}
                        />
                        <FormControlLabel
                            value={IMPORT_METHODS.FILE}
                            control={<Radio />}
                            label={IMPORT_METHODS.FILE}
                        />
                    </RadioGroup>
                </FormControl>
                <TextField
                    fullWidth
                    variant="outlined"
                    multiline={true}
                    minRows={4}
                />
            </DialogContent>
            <StyledDialogActions>
                <Button variant="contained">Import</Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default ImportSetModal;
