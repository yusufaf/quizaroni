import { useState } from 'react';
import { CloudOff, CloudSync, CloudDone } from '@mui/icons-material';
import {
    IconButton,
    Tooltip,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useSync } from '../hooks/useSync';

export function SyncStatusIndicator() {
    const { t } = useTranslation('common');
    const { isOnline, isSyncing, pendingCount, lastSyncAt, triggerSync } =
        useSync();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleForceSync = async () => {
        await triggerSync();
        handleClose();
    };

    // Determine icon and color based on state
    let Icon = CloudDone;
    let color: 'success' | 'warning' | 'error' | 'default' = 'success';
    let tooltip = t('sync.allCaughtUp');

    if (!isOnline) {
        Icon = CloudOff;
        color = 'warning';
        tooltip = t('sync.offline');
    } else if (isSyncing) {
        Icon = CloudSync;
        color = 'default';
        tooltip = t('sync.syncing');
    } else if (pendingCount > 0) {
        Icon = CloudSync;
        color = 'warning';
        tooltip = t('sync.pending', { count: pendingCount });
    }

    const formatLastSync = (timestamp: number | null) => {
        if (!timestamp) return t('sync.never');
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return t('sync.justNow');
        if (diffMins < 60) return t('sync.minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('sync.hoursAgo', { count: diffHours });
        return t('sync.daysAgo', { count: diffDays });
    };

    return (
        <>
            <Tooltip title={tooltip}>
                <IconButton
                    onClick={handleClick}
                    color={color}
                    size="small"
                    aria-label={tooltip}
                >
                    <Badge
                        badgeContent={pendingCount > 0 ? pendingCount : 0}
                        color="error"
                    >
                        <Icon
                            sx={{
                                animation: isSyncing
                                    ? 'spin 1s linear infinite'
                                    : 'none',
                                '@keyframes spin': {
                                    from: { transform: 'rotate(0deg)' },
                                    to: { transform: 'rotate(360deg)' },
                                },
                            }}
                        />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem disabled sx={{ opacity: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {isOnline ? t('sync.online') : t('sync.offlineMode')}
                    </Typography>
                </MenuItem>

                <MenuItem disabled sx={{ opacity: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        {t('sync.lastSync')}: {formatLastSync(lastSyncAt)}
                    </Typography>
                </MenuItem>

                {pendingCount > 0 && (
                    <MenuItem disabled sx={{ opacity: 1 }}>
                        <Typography variant="body2" color="warning.main">
                            {t('sync.pendingChanges', { count: pendingCount })}
                        </Typography>
                    </MenuItem>
                )}

                <Divider />

                <MenuItem
                    onClick={handleForceSync}
                    disabled={!isOnline || isSyncing}
                >
                    {isSyncing ? t('sync.syncing') : t('sync.syncNow')}
                </MenuItem>

                {!isOnline && (
                    <MenuItem disabled>
                        <Typography variant="caption" color="text.secondary">
                            {t('sync.willSyncWhenOnline')}
                        </Typography>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
