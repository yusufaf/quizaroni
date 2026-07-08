import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    Paper,
} from '@mui/material/';
import {
    UploadFile,
    Restore as RestoreIcon,
    CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { styled } from '@mui/system';
import { StyledDialogActions } from 'styles/AppStyles';
import StandardDialogTitle from 'components/StandardDialogTitle/StandardDialogTitle';
import { Dispatch, SetStateAction, useCallback, useRef, useState } from 'react';
import { Card } from 'shared/types';
import { processImport, ImportFormat } from 'utilities/importUtils';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';

type Props = {
    setShowImportModal: Dispatch<SetStateAction<boolean>>;
    onImportCards: (cards: Card[]) => void;
};

const EditorContainer = styled(Box)({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
});

const EditorHeader = styled(Box)({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem',
});

const ActionsRow = styled(Box)({
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
});

const StyledTextarea = styled('textarea')<{
    hasError: boolean;
    isDragging: boolean;
}>(({ theme, hasError, isDragging }) => ({
    width: '100%',
    minHeight: '18rem',
    padding: '1rem',
    fontFamily:
        '"Fira Code", "Cascadia Code", "JetBrains Mono", "Consolas", monospace',
    fontSize: '0.875rem',
    lineHeight: '1.5',
    tabSize: 4,
    backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
    color: theme.palette.mode === 'dark' ? '#d4d4d4' : '#1e1e1e',
    border: `2px dashed ${
        isDragging
            ? theme.palette.primary.main
            : hasError
              ? theme.palette.error.main
              : theme.palette.divider
    }`,
    borderRadius: '0.5rem',
    outline: 'none',
    resize: 'vertical',
    transition: 'border-color 0.2s ease, background-color 0.2s ease',
    '&:focus': {
        borderColor: hasError
            ? theme.palette.error.main
            : isDragging
              ? theme.palette.primary.main
              : theme.palette.primary.main,
        boxShadow: `0 0 0 2px ${hasError ? theme.palette.error.main + '33' : theme.palette.primary.main + '33'}`,
    },
    '&::selection': {
        backgroundColor: theme.palette.primary.main + '44',
    },
}));

const DropOverlay = styled(Paper)(({ theme }) => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
        theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 30, 0.95)'
            : 'rgba(245, 245, 245, 0.95)',
    borderRadius: '0.5rem',
    pointerEvents: 'none',
    zIndex: 10,
    animation: 'pulse 1.5s ease-in-out infinite',
    '@keyframes pulse': {
        '0%, 100%': {
            backgroundColor:
                theme.palette.mode === 'dark'
                    ? 'rgba(30, 30, 30, 0.95)'
                    : 'rgba(245, 245, 245, 0.95)',
        },
        '50%': {
            backgroundColor:
                theme.palette.mode === 'dark'
                    ? 'rgba(25, 118, 210, 0.15)'
                    : 'rgba(25, 118, 210, 0.08)',
        },
    },
}));

// Separator presets offered for Quizlet imports. Values are descriptors the
// importUtils parser understands (named tokens, a literal, or 'custom').
const FIELD_SEPARATORS: { value: string; labelKey: string }[] = [
    { value: 'tab', labelKey: 'create.sepTab' },
    { value: 'comma', labelKey: 'create.sepComma' },
    { value: 'space', labelKey: 'create.sepSpace' },
    { value: ' - ', labelKey: 'create.sepDash' },
    { value: 'custom', labelKey: 'create.sepCustom' },
];

const ROW_SEPARATORS: { value: string; labelKey: string }[] = [
    { value: 'newline', labelKey: 'create.sepNewline' },
    { value: 'semicolon', labelKey: 'create.sepSemicolon' },
    { value: 'blankline', labelKey: 'create.sepBlankLine' },
    { value: 'custom', labelKey: 'create.sepCustom' },
];

const validateLive = (value: string): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
        JSON.parse(trimmed);
        return null;
    } catch (e) {
        return (e as Error).message;
    }
};

const ImportCardsModal = ({ setShowImportModal, onImportCards }: Props) => {
    const { t } = useTranslation();
    const [jsonInputText, setJsonInputText] = useState<string>('');
    const [selectedFileName, setSelectedFileName] = useState<string | null>(
        null
    );
    const [liveError, setLiveError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef<number>(0);

    const [format, setFormat] = useState<ImportFormat>('json');
    const [fieldSep, setFieldSep] = useState<string>('tab');
    const [fieldSepCustom, setFieldSepCustom] = useState<string>('');
    const [rowSep, setRowSep] = useState<string>('newline');
    const [rowSepCustom, setRowSepCustom] = useState<string>('');

    const resolvedFieldSep = fieldSep === 'custom' ? fieldSepCustom : fieldSep;
    const resolvedRowSep = rowSep === 'custom' ? rowSepCustom : rowSep;

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const value = e.target.value;
            setJsonInputText(value);
            // Live syntax validation only applies to JSON; delimited formats
            // are validated on import.
            setLiveError(format === 'json' ? validateLive(value) : null);
            setSubmitError(null);
        },
        [format]
    );

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleFileUpload = useCallback(
        (file: File) => {
            if (format === 'json' && !file.name.endsWith('.json')) {
                setSubmitError(t('create.pleaseUploadJson'));
                return;
            }
            setSubmitError(null);
            setSelectedFileName(file.name);

            const reader = new FileReader();
            reader.onload = (e) => {
                const text = (e.target?.result as string) ?? '';
                // Pretty-print JSON uploads; leave delimited text untouched.
                if (format === 'json') {
                    try {
                        const parsed = JSON.parse(text);
                        setJsonInputText(JSON.stringify(parsed, null, 4));
                        setLiveError(null);
                    } catch {
                        setJsonInputText(text);
                        setLiveError(validateLive(text));
                    }
                } else {
                    setJsonInputText(text);
                    setLiveError(null);
                }
            };
            reader.onerror = () => {
                setSubmitError(t('create.failedToReadFile'));
                setSelectedFileName(null);
            };
            reader.readAsText(file);
        },
        [format, t]
    );

    const handleFormatChange = useCallback(
        (_e: React.MouseEvent<HTMLElement>, next: ImportFormat | null) => {
            if (!next) return;
            setFormat(next);
            setSubmitError(null);
            // Re-run live validation under the new format's rules.
            setLiveError(next === 'json' ? validateLive(jsonInputText) : null);
        },
        [jsonInputText]
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            dragCounterRef.current = 0;

            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files.item(0);
                if (!file) return;
                // handleFileUpload enforces the .json requirement for JSON imports.
                handleFileUpload(file);
            }
        },
        [handleFileUpload]
    );

    const handleReset = useCallback(() => {
        setJsonInputText('');
        setSelectedFileName(null);
        setLiveError(null);
        setSubmitError(null);
    }, []);

    const handleImport = useCallback(() => {
        setIsProcessing(true);
        setSubmitError(null);

        const sourceText = jsonInputText.trim();
        if (!sourceText) {
            setSubmitError(t('create.provideJsonContent'));
            setIsProcessing(false);
            return;
        }

        const { cards, error: importError } = processImport(
            sourceText,
            format,
            {
                fieldSeparator: resolvedFieldSep,
                rowSeparator: resolvedRowSep,
            }
        );
        if (importError) {
            setSubmitError(importError);
            setIsProcessing(false);
            return;
        }
        if (cards.length === 0) {
            setSubmitError(t('create.noValidCardsFound'));
            setIsProcessing(false);
            return;
        }

        onImportCards(cards);
        toast.success(
            t('create.successfullyImported', { count: cards.length })
        );
        setShowImportModal(false);
        setIsProcessing(false);
    }, [
        jsonInputText,
        format,
        resolvedFieldSep,
        resolvedRowSep,
        onImportCards,
        setShowImportModal,
        t,
    ]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (jsonInputText.trim() && !liveError) {
                    handleImport();
                }
                return;
            }
            if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const newValue =
                    jsonInputText.substring(0, start) +
                    '    ' +
                    jsonInputText.substring(end);
                setJsonInputText(newValue);
                requestAnimationFrame(() => {
                    target.selectionStart = target.selectionEnd = start + 4;
                });
            }
        },
        [handleImport, jsonInputText, liveError]
    );

    const onClose = () => setShowImportModal(false);

    const importDisabled =
        isProcessing || !jsonInputText.trim() || Boolean(liveError);

    const fileAccept = format === 'json' ? '.json' : '.txt,.csv,.tsv,.text';

    const placeholder =
        format === 'json'
            ? `${t('create.pasteJsonPlaceholder') || 'Paste JSON here...'}\n\n💡 ${t('create.dragDropHint')}`
            : format === 'quizlet'
              ? t('create.pastePlaceholderQuizlet')
              : t('create.pastePlaceholderAnki');

    return (
        <Dialog open={true} onClose={onClose} fullWidth maxWidth="md">
            <StandardDialogTitle
                title={t('create.importCards')}
                onClose={onClose}
            />
            <DialogContent>
                <EditorContainer>
                    <ToggleButtonGroup
                        value={format}
                        exclusive
                        onChange={handleFormatChange}
                        size="small"
                        color="primary"
                        fullWidth
                        disabled={isProcessing}
                    >
                        <ToggleButton value="json">
                            {t('create.formatJson')}
                        </ToggleButton>
                        <ToggleButton value="quizlet">
                            {t('create.formatQuizlet')}
                        </ToggleButton>
                        <ToggleButton value="anki">
                            {t('create.formatAnki')}
                        </ToggleButton>
                    </ToggleButtonGroup>

                    {format === 'quizlet' && (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: '1rem',
                                flexWrap: 'wrap',
                            }}
                        >
                            <FormControl
                                size="small"
                                sx={{ minWidth: 180, flex: 1 }}
                            >
                                <InputLabel>
                                    {t('create.termDefSeparator')}
                                </InputLabel>
                                <Select
                                    label={t('create.termDefSeparator')}
                                    value={fieldSep}
                                    onChange={(e) =>
                                        setFieldSep(e.target.value as string)
                                    }
                                >
                                    {FIELD_SEPARATORS.map((opt) => (
                                        <MenuItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {t(opt.labelKey)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {fieldSep === 'custom' && (
                                <TextField
                                    size="small"
                                    label={t('create.customSeparator')}
                                    value={fieldSepCustom}
                                    onChange={(e) =>
                                        setFieldSepCustom(e.target.value)
                                    }
                                    sx={{ width: 140 }}
                                />
                            )}
                            <FormControl
                                size="small"
                                sx={{ minWidth: 180, flex: 1 }}
                            >
                                <InputLabel>
                                    {t('create.rowSeparatorLabel')}
                                </InputLabel>
                                <Select
                                    label={t('create.rowSeparatorLabel')}
                                    value={rowSep}
                                    onChange={(e) =>
                                        setRowSep(e.target.value as string)
                                    }
                                >
                                    {ROW_SEPARATORS.map((opt) => (
                                        <MenuItem
                                            key={opt.value}
                                            value={opt.value}
                                        >
                                            {t(opt.labelKey)}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {rowSep === 'custom' && (
                                <TextField
                                    size="small"
                                    label={t('create.customSeparator')}
                                    value={rowSepCustom}
                                    onChange={(e) =>
                                        setRowSepCustom(e.target.value)
                                    }
                                    sx={{ width: 140 }}
                                />
                            )}
                        </Box>
                    )}

                    <EditorHeader>
                        <Typography variant="body2" color="text.secondary">
                            {selectedFileName
                                ? t('create.selectedFile', {
                                      filename: selectedFileName,
                                  })
                                : format === 'json'
                                  ? t('create.pasteOrUploadJson')
                                  : format === 'quizlet'
                                    ? t('create.quizletHint')
                                    : t('create.ankiHint')}
                        </Typography>
                        <ActionsRow>
                            <Tooltip title={t('create.uploadJsonFile')}>
                                <IconButton
                                    size="small"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={isProcessing}
                                >
                                    <UploadFile />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={t('create.clearEditor')}>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={handleReset}
                                        disabled={
                                            isProcessing || !jsonInputText
                                        }
                                    >
                                        <RestoreIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={fileAccept}
                                hidden
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileUpload(file);
                                    e.target.value = '';
                                }}
                            />
                        </ActionsRow>
                    </EditorHeader>

                    <Box sx={{ position: 'relative' }}>
                        <StyledTextarea
                            value={jsonInputText}
                            onChange={handleChange}
                            onKeyDown={handleKeyDown}
                            hasError={Boolean(liveError)}
                            isDragging={isDragging}
                            spellCheck={false}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            placeholder={placeholder}
                            disabled={isProcessing}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        />
                        {isDragging && (
                            <DropOverlay elevation={0}>
                                <CloudUploadIcon
                                    sx={{
                                        fontSize: 56,
                                        color: 'primary.main',
                                        mb: 1,
                                    }}
                                />
                                <Typography
                                    variant="h6"
                                    color="primary.main"
                                    fontWeight="medium"
                                >
                                    {t('create.dropJsonFile') ||
                                        'Drop JSON file here'}
                                </Typography>
                            </DropOverlay>
                        )}
                    </Box>

                    {liveError && (
                        <Alert severity="warning" variant="outlined">
                            <Typography
                                variant="caption"
                                sx={{ fontFamily: 'monospace' }}
                            >
                                {liveError}
                            </Typography>
                        </Alert>
                    )}

                    {submitError && (
                        <Alert severity="error">{submitError}</Alert>
                    )}
                </EditorContainer>
            </DialogContent>
            <StyledDialogActions>
                <Button
                    variant="contained"
                    onClick={handleImport}
                    disabled={importDisabled}
                    startIcon={
                        isProcessing ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : undefined
                    }
                >
                    {isProcessing
                        ? t('create.importing')
                        : t('categories.import')}
                </Button>
            </StyledDialogActions>
        </Dialog>
    );
};

export default ImportCardsModal;
