import { Box, Typography, Button } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import { ItemListHeaderProps } from './types';

export const ItemListHeader = ({
    title,
    onDownload,
    itemCount,
}: ItemListHeaderProps) => {
    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: '1rem',
            }}
        >
            <Typography variant="h6">
                {title} ({itemCount})
            </Typography>
            <Button
                startIcon={<DownloadIcon />}
                onClick={onDownload}
                size="small"
                disabled={itemCount === 0}
            >
                Download
            </Button>
        </Box>
    );
};
