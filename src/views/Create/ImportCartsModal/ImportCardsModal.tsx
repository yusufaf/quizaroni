import {
    Alert,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    FormControl,
    FormControlLabel,
    FormLabel,
    Radio,
    RadioGroup,
    TextField,
} from '@mui/material/';
import { UploadFile } from '@mui/icons-material';
import { StyledDialogActions } from 'styles/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { Dispatch, SetStateAction, useState } from 'react';
import { Card } from 'shared/types';
import { processImportedCards } from 'utilities/importUtils';
import { toast } from 'react-toastify';

type Props = {
    setShowImportModal: Dispatch<SetStateAction<boolean>>;
    onImportCards: (cards: Card[]) => void;
};

const IMPORT_METHODS = {
    JSON_INPUT: 'JSON Input',
    FILE: 'File Upload',
} as const;

type ImportMethod = (typeof IMPORT_METHODS)[keyof typeof IMPORT_METHODS];

const ImportCardsModal = ({ setShowImportModal, onImportCards }: Props) => {
    const [importMethod, setImportMethod] = useState<ImportMethod>(
        IMPORT_METHODS.JSON_INPUT
    );
    const [jsonInputText, setJsonInputText] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);

    const handleImportMethodChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setImportMethod(
            (event.target as HTMLInputElement).value as ImportMethod
        );
        setError(null); // Clear error when switching methods
    };

    const handleFileUpload = (file: File) => {
        if (!file.name.endsWith('.json')) {
            setError('Please upload a .json file');
            setSelectedFile(null);
            return;
        }

        setSelectedFile(file);
        setError(null);

        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target?.result as string;
            setJsonInputText(text);
        };

        reader.onerror = () => {
            setError('Failed to read file. Please try again.');
            setSelectedFile(null);
        };

        reader.readAsText(file);
    };

    const handleImport = () => {
        setIsProcessing(true);
        setError(null);

        const sourceText = jsonInputText.trim();

        if (!sourceText) {
            setError('Please provide JSON content');
            setIsProcessing(false);
            return;
        }

        const { cards, error: importError } = processImportedCards(sourceText);

        if (importError) {
            setError(importError);
            setIsProcessing(false);
            return;
        }

        if (cards.length === 0) {
            setError('No valid cards found to import');
            setIsProcessing(false);
            return;
        }

        // Success - send to parent
        onImportCards(cards);
        toast.success(`Successfully imported ${cards.length} card(s)`);
        setShowImportModal(false);
        setIsProcessing(false);
    };

    const onClose = () => {
        setShowImportModal(false);
    };

    return (
        <Dialog open={true} onClose={onClose} fullWidth maxWidth="md">
            <StandardDialogTitle title="Import Cards" onClose={onClose} />
            <DialogContent>
                <FormControl sx={{ mb: 2 }}>
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

                {importMethod === IMPORT_METHODS.JSON_INPUT && (
                    <TextField
                        fullWidth
                        variant="outlined"
                        multiline
                        minRows={8}
                        placeholder='Paste JSON here. Examples:
Single card: {"term": "Photosynthesis", "definition": "Process by which plants make food"}
Multiple cards: [{"term": "DNA", "definition": "Genetic material"}, {"term": "RNA", "definition": "Messenger molecule"}]'
                        value={jsonInputText}
                        onChange={(e) => setJsonInputText(e.target.value)}
                        disabled={isProcessing}
                    />
                )}

                {importMethod === IMPORT_METHODS.FILE && (
                    <>
                        <Button
                            variant="outlined"
                            component="label"
                            fullWidth
                            disabled={isProcessing}
                            startIcon={<UploadFile />}
                            sx={{ mb: 1 }}
                        >
                            {selectedFile
                                ? `Selected: ${selectedFile.name}`
                                : 'Choose JSON File'}
                            <input
                                type="file"
                                accept=".json"
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(file);
                                }}
                            />
                        </Button>
                        {jsonInputText && (
                            <TextField
                                fullWidth
                                variant="outlined"
                                multiline
                                minRows={8}
                                value={jsonInputText}
                                onChange={(e) =>
                                    setJsonInputText(e.target.value)
                                }
                                disabled={isProcessing}
                                label="File Contents (editable)"
                            />
                        )}
                    </>
                )}

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </DialogContent>
            <StyledDialogActions>
                <Button
                    variant="contained"
                    onClick={handleImport}
                    disabled={isProcessing || !jsonInputText.trim()}
                    startIcon={
                        isProcessing ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : undefined
                    }
                >
                    {isProcessing ? 'Importing...' : 'Import'}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default ImportCardsModal;
