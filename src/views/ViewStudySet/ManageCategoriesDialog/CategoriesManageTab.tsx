import { Box, Typography, ListItemText, Button, Collapse, Stack } from '@mui/material';
import { Delete as DeleteIcon, Download as DownloadIcon, CleaningServices as CleanIcon } from '@mui/icons-material';
import { MetadataList, ErrorInfo } from 'shared/components/MetadataDialogs';
import { downloadObjectAsJSON } from 'shared/utilities/general';

type Props = {
    categories: string[];
    studysetTitle: string;
    editIndex: number | null;
    deleteIndices: number[];
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    onSave: (index: number, value: string) => void;
    onCancel: () => void;
    validateFn: (value: string, index: number) => ErrorInfo;
    onDeleteSelected: () => void;
    onDeleteUnused: () => void;
    isLoading: boolean;
};

export const CategoriesManageTab = ({
    categories,
    studysetTitle,
    editIndex,
    deleteIndices,
    onEdit,
    onDelete,
    onSave,
    onCancel,
    validateFn,
    onDeleteSelected,
    onDeleteUnused,
    isLoading,
}: Props) => {
    const categoryItems = categories.map((name) => ({ name }));

    const renderItem = (item: { name: string }) => <ListItemText primary={item.name} />;

    const downloadCategoriesList = () => {
        downloadObjectAsJSON(categories, `Quizaroni_${studysetTitle}_Categories.json`);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', mb: '1rem' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">
                        Categories ({categories.length})
                    </Typography>
                    <Stack direction="row" spacing="0.5rem">
                        <Button
                            startIcon={<DownloadIcon />}
                            onClick={downloadCategoriesList}
                            size="small"
                            disabled={categories.length === 0}
                        >
                            Download
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            startIcon={<CleanIcon />}
                            onClick={onDeleteUnused}
                        >
                            Delete Unused
                        </Button>
                    </Stack>
                </Box>
            </Box>

            <Collapse in={deleteIndices.length > 0} timeout={200}>
                <Box
                    sx={{
                        bgcolor: 'error.dark',
                        color: 'error.contrastText',
                        px: '1rem',
                        py: '0.5rem',
                        mb: '1rem',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                    }}
                >
                    <Typography variant="body2" fontWeight={500}>
                        {deleteIndices.length} item{deleteIndices.length > 1 ? 's' : ''} selected
                    </Typography>
                    <Button
                        color="inherit"
                        variant="outlined"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={onDeleteSelected}
                        sx={{
                            borderColor: 'currentColor',
                            fontSize: '0.75rem',
                            py: '0.25rem',
                            px: '0.75rem',
                            '&:hover': {
                                borderColor: 'currentColor',
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        Delete
                    </Button>
                </Box>
            </Collapse>

            <MetadataList
                items={categoryItems}
                editIndex={editIndex}
                deleteIndices={deleteIndices}
                onEdit={onEdit}
                onDelete={onDelete}
                onSave={onSave}
                onCancel={onCancel}
                validateFn={validateFn}
                renderItem={renderItem}
                isLoading={isLoading}
                emptyMessage="No categories yet"
            />
        </Box>
    );
};
