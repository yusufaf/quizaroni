import {
    Button,
    Dialog,
    DialogContent,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    TextField,
    Typography,
} from '@mui/material/';
import { StyledDialogActions, StyledDialogTitle } from 'styles/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import CloseDialogButton from 'components/StandardDialogTitle/StandardDialogTitle';
import { Dispatch, SetStateAction, useState } from 'react';

type Props = {
    setShowImportModal: Dispatch<SetStateAction<boolean>>;
};

const IMPORT_METHODS = {
    JSON_INPUT: 'JSON Input',
    FILE: 'File Upload',
} as const;

type ImportMethod = (typeof IMPORT_METHODS)[keyof typeof IMPORT_METHODS];

const ImportCardsModal = ({ setShowImportModal }: Props) => {
    const [importMethod, setImportMethod] = useState<ImportMethod>(
        IMPORT_METHODS.JSON_INPUT
    );

    const handleImportMethodChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setImportMethod(
            (event.target as HTMLInputElement).value as ImportMethod
        );
    };

    const onClose = () => {
        setShowImportModal(false);
    };

    return (
        <Dialog open={true} onClose={onClose} fullWidth maxWidth="md">
            <StandardDialogTitle title="Import Cards" onClose={onClose} />
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

export default ImportCardsModal;
