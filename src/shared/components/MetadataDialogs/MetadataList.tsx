import { List, Box, Typography, Skeleton, Stack } from '@mui/material';
import { Inbox as InboxIcon } from '@mui/icons-material';
import { InlineEditableListItem } from './InlineEditableListItem';
import { MetadataListProps } from './types';

export const MetadataList = <T extends { name: string }>({
    items,
    editIndex,
    deleteIndices,
    onEdit,
    onDelete,
    onSave,
    onCancel,
    validateFn,
    renderItem,
    getItemKey,
    isLoading = false,
    emptyMessage = 'No items yet',
}: MetadataListProps<T>) => {
    if (isLoading) {
        return (
            <Stack spacing="0.5rem">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} variant="rectangular" height="3rem" />
                ))}
            </Stack>
        );
    }

    if (items.length === 0) {
        return (
            <Box
                sx={{
                    textAlign: 'center',
                    py: '2rem',
                }}
            >
                <InboxIcon fontSize="large" color="disabled" />
                <Typography variant="h6" color="text.secondary" sx={{ mt: '1rem' }}>
                    {emptyMessage}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Create your first item in the CREATE tab
                </Typography>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                maxHeight: '26rem',
                overflowY: 'auto',
                overflowX: 'hidden',
            }}
        >
            <List>
                {items.map((item, index) => (
                    <InlineEditableListItem
                        key={getItemKey ? getItemKey(item) : index}
                        item={item}
                        index={index}
                        isEditing={editIndex === index}
                        isDeleteSelected={deleteIndices.includes(index)}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onSave={onSave}
                        onCancel={onCancel}
                        validateFn={validateFn}
                        renderContent={renderItem}
                        getItemKey={getItemKey}
                    />
                ))}
            </List>
        </Box>
    );
};
