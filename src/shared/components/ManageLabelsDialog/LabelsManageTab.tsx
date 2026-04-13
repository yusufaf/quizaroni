import { Box, Typography, ListItemText, Button, Collapse } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { MetadataList, ErrorInfo } from 'shared/components/MetadataDialogs';

type Props = {
    labels: string[];
    editIndex: number | null;
    deleteIndices: number[];
    onEdit: (index: number) => void;
    onDelete: (index: number) => void;
    onSave: (index: number, value: string) => void;
    onCancel: () => void;
    validateFn: (value: string, index: number) => ErrorInfo;
    onDeleteSelected: () => void;
    isLoading: boolean;
};

export const LabelsManageTab = ({
    labels,
    editIndex,
    deleteIndices,
    onEdit,
    onDelete,
    onSave,
    onCancel,
    validateFn,
    onDeleteSelected,
    isLoading,
}: Props) => {
    const labelItems = labels.map((name) => ({ name }));

    const renderItem = (item: { name: string }) => (
        <ListItemText primary={item.name} />
    );

    return (
        <Box>
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
                        {deleteIndices.length} item
                        {deleteIndices.length > 1 ? 's' : ''} selected
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
                items={labelItems}
                editIndex={editIndex}
                deleteIndices={deleteIndices}
                onEdit={onEdit}
                onDelete={onDelete}
                onSave={onSave}
                onCancel={onCancel}
                validateFn={validateFn}
                renderItem={renderItem}
                isLoading={isLoading}
                emptyMessage="No labels yet"
            />
        </Box>
    );
};
