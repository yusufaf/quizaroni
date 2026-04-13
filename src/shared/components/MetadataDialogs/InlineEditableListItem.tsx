import { useState, ChangeEvent, useEffect } from 'react';
import {
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    TextField,
    Checkbox,
    Fade,
    Box,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import { Edit, Delete, Check, Close } from '@mui/icons-material';
import { InlineEditableListItemProps, ErrorInfo } from './types';

export const InlineEditableListItem = <T extends { name: string }>({
    item,
    index,
    isEditing,
    isDeleteSelected,
    onEdit,
    onDelete,
    onSave,
    onCancel,
    validateFn,
    renderContent,
    getItemKey,
}: InlineEditableListItemProps<T>) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [editValue, setEditValue] = useState(item.name);
    const [errorInfo, setErrorInfo] = useState<ErrorInfo>(null);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (isEditing) {
            setEditValue(item.name);
            setErrorInfo(null);
        }
    }, [isEditing, item.name]);

    const handleEditChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEditValue(value);
        setErrorInfo(validateFn(value, index));
    };

    const handleSave = () => {
        if (!errorInfo && editValue.trim()) {
            onSave(index, editValue);
        }
    };

    const handleCancel = () => {
        setEditValue(item.name);
        setErrorInfo(null);
        onCancel();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !errorInfo) {
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (isEditing) {
        return (
            <ListItem divider sx={{ bgcolor: 'action.hover', pr: '6rem' }}>
                <TextField
                    fullWidth
                    value={editValue}
                    onChange={handleEditChange}
                    error={Boolean(errorInfo)}
                    helperText={errorInfo?.helperText}
                    autoFocus
                    onKeyDown={handleKeyPress}
                    sx={{ pr: '1rem' }}
                />
                <ListItemSecondaryAction>
                    <IconButton
                        color="primary"
                        onClick={handleSave}
                        disabled={Boolean(errorInfo)}
                        title="Save"
                    >
                        <Check />
                    </IconButton>
                    <IconButton onClick={handleCancel} title="Cancel">
                        <Close />
                    </IconButton>
                </ListItemSecondaryAction>
            </ListItem>
        );
    }

    const showButtons = isHovered || isMobile || isDeleteSelected;

    return (
        <ListItem
            divider
            selected={isDeleteSelected}
            sx={{
                bgcolor: isDeleteSelected ? 'error.light' : undefined,
                transition: 'background-color 200ms',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {isDeleteSelected && (
                <Checkbox
                    checked
                    onChange={() => onDelete(index)}
                    sx={{ mr: '0.5rem' }}
                    color="error"
                />
            )}

            {renderContent ? (
                renderContent(item, false)
            ) : (
                <ListItemText
                    primary={item.name}
                    sx={{
                        textDecoration: isDeleteSelected
                            ? 'line-through'
                            : 'none',
                    }}
                />
            )}

            <ListItemSecondaryAction
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <Box
                    sx={{
                        opacity: showButtons ? 1 : 0,
                        transition: 'opacity 200ms',
                        display: 'flex',
                        gap: '0.25rem',
                    }}
                >
                    {!isDeleteSelected && (
                        <IconButton
                            size="small"
                            onClick={() => onEdit(index)}
                            title="Edit"
                        >
                            <Edit />
                        </IconButton>
                    )}
                    <IconButton
                        size="small"
                        onClick={() => onDelete(index)}
                        title={
                            isDeleteSelected
                                ? 'Unmark for deletion'
                                : 'Mark for deletion'
                        }
                        color={isDeleteSelected ? 'error' : undefined}
                    >
                        <Delete />
                    </IconButton>
                </Box>
            </ListItemSecondaryAction>
        </ListItem>
    );
};
