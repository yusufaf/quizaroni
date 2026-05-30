import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Alert,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import { CascadePreviewDialogProps } from './types';

const ACTION_LABELS = {
    edit: 'Edit',
    delete: 'Delete',
    'delete-unused': 'Delete Unused',
};

const AFFECTED_TYPE_LABELS = {
    label: 'study set',
    category: 'card',
    color: 'usage',
};

export const CascadePreviewDialog = ({
    open,
    onClose,
    actionType,
    itemType,
    affectedItems,
    onConfirm,
    isLoading = false,
}: CascadePreviewDialogProps) => {
    const [confirmed, setConfirmed] = useState(false);

    useEffect(() => {
        if (!open) {
            setConfirmed(false);
        }
    }, [open]);

    const handleConfirm = () => {
        onConfirm();
        setConfirmed(false);
    };

    const handleClose = () => {
        setConfirmed(false);
        onClose();
    };

    const actionLabel = ACTION_LABELS[actionType];
    const affectedTypeLabel = AFFECTED_TYPE_LABELS[itemType];
    const affectedCount = affectedItems.length;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Confirm {actionLabel} {itemType}
            </DialogTitle>

            <DialogContent>
                <Alert severity="warning" sx={{ mb: '1rem' }}>
                    This action will affect {affectedCount} {affectedTypeLabel}
                    {affectedCount !== 1 ? 's' : ''}
                </Alert>

                <Typography variant="subtitle2" gutterBottom>
                    Affected Items:
                </Typography>

                <Paper
                    variant="outlined"
                    sx={{ p: '1rem', maxHeight: '18.75rem', overflow: 'auto' }}
                >
                    <List dense>
                        {affectedItems.slice(0, 10).map((item, i) => (
                            <ListItem key={i}>
                                <ListItemIcon>
                                    <WarningIcon
                                        fontSize="small"
                                        color="warning"
                                    />
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.name}
                                    secondary={item.detail}
                                />
                            </ListItem>
                        ))}
                        {affectedItems.length > 10 && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                    mt: '0.5rem',
                                    display: 'block',
                                    textAlign: 'center',
                                }}
                            >
                                ... and {affectedItems.length - 10} more
                            </Typography>
                        )}
                    </List>
                </Paper>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                        />
                    }
                    label="I understand this action cannot be undone"
                    sx={{ mt: '1rem' }}
                />
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={isLoading}>
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleConfirm}
                    disabled={!confirmed || isLoading}
                >
                    Confirm {actionLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
