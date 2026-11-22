import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

const ACTION_KEYS = {
    edit: 'edit',
    delete: 'delete',
    'delete-unused': 'deleteUnused',
} as const;

const AFFECTED_KEYS = {
    label: 'affectedLabel',
    category: 'affectedCategory',
    color: 'affectedColor',
} as const;

export const CascadePreviewDialog = ({
    open,
    onClose,
    actionType,
    itemType,
    affectedItems,
    onConfirm,
    isLoading = false,
}: CascadePreviewDialogProps) => {
    const { t } = useTranslation();
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

    const actionKey = ACTION_KEYS[actionType];
    const affectedCount = affectedItems.length;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {t(`cascadePreview.title.${actionKey}`, {
                    item: t(`cascadePreview.items.${itemType}`),
                })}
            </DialogTitle>

            <DialogContent>
                <Alert severity="warning" sx={{ mb: '1rem' }}>
                    {t(`cascadePreview.${AFFECTED_KEYS[itemType]}`, {
                        count: affectedCount,
                    })}
                </Alert>

                <Typography variant="subtitle2" gutterBottom>
                    {t('cascadePreview.affectedItems')}
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
                                {t('cascadePreview.andMore', {
                                    count: affectedItems.length - 10,
                                })}
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
                    label={t('cascadePreview.understand')}
                    sx={{ mt: '1rem' }}
                />
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} disabled={isLoading}>
                    {t('buttons.cancel')}
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleConfirm}
                    disabled={!confirmed || isLoading}
                >
                    {t(`cascadePreview.confirm.${actionKey}`)}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
