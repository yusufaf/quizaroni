import { Dispatch, SetStateAction, useRef, useState, useCallback } from 'react';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Studyset } from 'shared/types';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Typography,
} from '@mui/material';
import {
    Inbox as InboxIcon,
    UploadFile as UploadFileIcon,
    CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

type Props = {
    selectedStudyset: Studyset;
    setSelectedStudysetUUID: Dispatch<SetStateAction<string>>;
    selectedStudysetUUID: string;
    studysets: Studyset[];
    handleImport: () => void;
    onFileImport: (categories: string[]) => void;
};

const ACCEPTED_EXTENSIONS = ['.json', '.txt', '.csv'];

const parseFileCategories = (content: string, fileName: string): string[] => {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

    switch (ext) {
        case '.json': {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return parsed.map(String).filter(Boolean);
            }
            return [];
        }
        case '.csv':
            return content
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        case '.txt':
            return content
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean);
        default:
            return [];
    }
};

const ImportTabView = (props: Props) => {
    const {
        selectedStudyset,
        setSelectedStudysetUUID,
        selectedStudysetUUID,
        studysets,
        handleImport,
        onFileImport,
    } = props;

    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [fileCategories, setFileCategories] = useState<string[]>([]);
    const [selectedFileName, setSelectedFileName] = useState<string | null>(
        null
    );
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const dragCounterRef = useRef<number>(0);

    const handleChange = (event: SelectChangeEvent) => {
        setSelectedStudysetUUID(event.target.value as string);
    };

    const filteredStudySets = studysets.filter(
        (set) => set.studysetUUID !== selectedStudyset.studysetUUID
    );
    const importSetCategories =
        filteredStudySets.find(
            (studySet) => studySet.studysetUUID === selectedStudysetUUID
        )?.categories ?? [];

    const existingCategories = selectedStudyset.categories ?? [];
    const newCategories = importSetCategories.filter(
        (cat) => !existingCategories.includes(cat)
    );
    const duplicateCategories = importSetCategories.filter((cat) =>
        existingCategories.includes(cat)
    );

    // File import
    const newFileCategories = fileCategories.filter(
        (cat) => !existingCategories.includes(cat)
    );
    const duplicateFileCategories = fileCategories.filter((cat) =>
        existingCategories.includes(cat)
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(ext)) {
            setFileError(t('categories.unsupportedFileType'));
            setFileCategories([]);
            setSelectedFileName(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const parsed = parseFileCategories(content, file.name);
                if (parsed.length === 0) {
                    setFileError(t('categories.noCategoriesInFile'));
                    setFileCategories([]);
                    setSelectedFileName(null);
                    return;
                }
                setFileCategories(parsed);
                setSelectedFileName(file.name);
                setFileError(null);
            } catch {
                setFileError(t('categories.failedToParseFile'));
                setFileCategories([]);
                setSelectedFileName(null);
            }
        };
        reader.onerror = () => {
            setFileError(t('categories.failedToReadFile'));
            setFileCategories([]);
            setSelectedFileName(null);
        };
        reader.readAsText(file);

        // Reset input so the same file can be re-selected
        e.target.value = '';
    };

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

                const ext = file.name
                    .slice(file.name.lastIndexOf('.'))
                    .toLowerCase();
                if (!ACCEPTED_EXTENSIONS.includes(ext)) {
                    setFileError(t('categories.unsupportedFileType'));
                    setFileCategories([]);
                    setSelectedFileName(null);
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const content = event.target?.result as string;
                        const parsed = parseFileCategories(content, file.name);
                        if (parsed.length === 0) {
                            setFileError(t('categories.noCategoriesInFile'));
                            setFileCategories([]);
                            setSelectedFileName(null);
                            return;
                        }
                        setFileCategories(parsed);
                        setSelectedFileName(file.name);
                        setFileError(null);
                    } catch {
                        setFileError(t('categories.failedToParseFile'));
                        setFileCategories([]);
                        setSelectedFileName(null);
                    }
                };
                reader.onerror = () => {
                    setFileError(t('categories.failedToReadFile'));
                    setFileCategories([]);
                    setSelectedFileName(null);
                };
                reader.readAsText(file);
            }
        },
        [t]
    );

    const handleFileImport = () => {
        if (newFileCategories.length > 0) {
            onFileImport(newFileCategories);
            setFileCategories([]);
            setSelectedFileName(null);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* From Study Set */}
            <Typography variant="subtitle2" color="text.secondary">
                {t('categories.fromStudyset')}
            </Typography>

            <FormControl fullWidth>
                <InputLabel id="study-set-select-label">
                    {t('categories.selectStudyset')}
                </InputLabel>
                <Select
                    labelId="study-set-select-label"
                    label={t('categories.selectStudyset')}
                    value={selectedStudysetUUID}
                    onChange={handleChange}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                maxHeight: '20rem',
                            },
                        },
                    }}
                >
                    {filteredStudySets.map((studySet) => (
                        <MenuItem
                            key={studySet.studysetUUID}
                            value={studySet.studysetUUID}
                        >
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    width: '100%',
                                    gap: '1rem',
                                }}
                            >
                                <Typography
                                    variant="inherit"
                                    noWrap
                                    title={studySet.title}
                                >
                                    {studySet.title}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ flexShrink: 0 }}
                                >
                                    {new Date(
                                        studySet.createdAt
                                    ).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Typography>
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedStudysetUUID && (
                <>
                    <Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: '0.75rem' }}
                        >
                            {t('categories.previewFound', {
                                count: importSetCategories.length,
                            })}
                            {newCategories.length > 0 && (
                                <>
                                    {' '}
                                    •{' '}
                                    {t('categories.newCount', {
                                        count: newCategories.length,
                                    })}
                                </>
                            )}
                            {duplicateCategories.length > 0 && (
                                <>
                                    {' '}
                                    •{' '}
                                    {t('categories.duplicateCount', {
                                        count: duplicateCategories.length,
                                    })}
                                </>
                            )}
                        </Typography>

                        {importSetCategories.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: '2rem' }}>
                                <InboxIcon fontSize="large" color="disabled" />
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: '0.5rem' }}
                                >
                                    {t('categories.noCategoriesInSet')}
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    maxHeight: '20rem',
                                    overflowY: 'auto',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '0.25rem',
                                }}
                            >
                                <List dense>
                                    {importSetCategories.map(
                                        (category, index) => {
                                            const isDuplicate =
                                                existingCategories.includes(
                                                    category
                                                );
                                            return (
                                                <ListItem
                                                    key={index}
                                                    divider={
                                                        index <
                                                        importSetCategories.length -
                                                            1
                                                    }
                                                    sx={{
                                                        opacity: isDuplicate
                                                            ? 0.5
                                                            : 1,
                                                    }}
                                                >
                                                    <ListItemText
                                                        primary={category}
                                                    />
                                                    {isDuplicate && (
                                                        <Chip
                                                            label={t(
                                                                'categories.duplicate'
                                                            )}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                ml: '0.5rem',
                                                            }}
                                                        />
                                                    )}
                                                </ListItem>
                                            );
                                        }
                                    )}
                                </List>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleImport}
                            disabled={newCategories.length === 0}
                            sx={{ fontWeight: 600 }}
                        >
                            {newCategories.length > 0
                                ? t('categories.importCount', {
                                      count: newCategories.length,
                                  })
                                : t('categories.import')}
                        </Button>
                    </Box>
                </>
            )}

            <Divider />

            {/* From File */}
            <Typography variant="subtitle2" color="text.secondary">
                {t('categories.fromFile')}
            </Typography>

            <Box
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                sx={{
                    position: 'relative',
                    border: '2px dashed',
                    borderColor: isDragging ? 'primary.main' : 'divider',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    backgroundColor: isDragging
                        ? (theme) =>
                              theme.palette.mode === 'dark'
                                  ? 'rgba(25, 118, 210, 0.15)'
                                  : 'rgba(25, 118, 210, 0.08)'
                        : 'transparent',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt,.csv"
                    onChange={handleFileSelect}
                    hidden
                />

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                    }}
                >
                    {isDragging ? (
                        <CloudUploadIcon
                            sx={{ fontSize: 48, color: 'primary.main' }}
                        />
                    ) : (
                        <UploadFileIcon
                            sx={{ fontSize: 40, color: 'text.secondary' }}
                        />
                    )}
                    <Typography
                        variant="body2"
                        color={isDragging ? 'primary.main' : 'text.secondary'}
                        align="center"
                    >
                        {isDragging
                            ? t('categories.dropFileHere', {
                                  defaultValue: 'Drop file here',
                              })
                            : t('categories.dragDropOrClick', {
                                  defaultValue:
                                      'Drag & drop a file here, or click to browse',
                              })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t('categories.supportedFormats')}
                    </Typography>
                </Box>

                {selectedFileName && !isDragging && (
                    <Typography
                        variant="body2"
                        color="success.main"
                        align="center"
                        sx={{ mt: '0.5rem' }}
                    >
                        {' '}
                        {selectedFileName}
                    </Typography>
                )}
            </Box>

            {fileError && <Alert severity="error">{fileError}</Alert>}

            {fileCategories.length > 0 && (
                <>
                    <Box>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: '0.75rem' }}
                        >
                            {t('categories.previewFound', {
                                count: fileCategories.length,
                            })}
                            {newFileCategories.length > 0 && (
                                <>
                                    {' '}
                                    •{' '}
                                    {t('categories.newCount', {
                                        count: newFileCategories.length,
                                    })}
                                </>
                            )}
                            {duplicateFileCategories.length > 0 && (
                                <>
                                    {' '}
                                    •{' '}
                                    {t('categories.duplicateCount', {
                                        count: duplicateFileCategories.length,
                                    })}
                                </>
                            )}
                        </Typography>

                        <Box
                            sx={{
                                maxHeight: '15rem',
                                overflowY: 'auto',
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: '0.25rem',
                            }}
                        >
                            <List dense>
                                {fileCategories.map((category, index) => {
                                    const isDuplicate =
                                        existingCategories.includes(category);
                                    return (
                                        <ListItem
                                            key={index}
                                            divider={
                                                index <
                                                fileCategories.length - 1
                                            }
                                            sx={{
                                                opacity: isDuplicate ? 0.5 : 1,
                                            }}
                                        >
                                            <ListItemText primary={category} />
                                            {isDuplicate && (
                                                <Chip
                                                    label={t(
                                                        'categories.duplicate'
                                                    )}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ ml: '0.5rem' }}
                                                />
                                            )}
                                        </ListItem>
                                    );
                                })}
                            </List>
                        </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleFileImport}
                            disabled={newFileCategories.length === 0}
                            sx={{ fontWeight: 600 }}
                        >
                            {newFileCategories.length > 0
                                ? t('categories.importCount', {
                                      count: newFileCategories.length,
                                  })
                                : t('categories.import')}
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default ImportTabView;
