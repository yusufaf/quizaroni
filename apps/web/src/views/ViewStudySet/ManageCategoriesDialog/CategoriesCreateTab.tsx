import { Box, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { ErrorInfo } from 'shared/components/MetadataDialogs';
import { ChangeEvent } from 'react';

type Props = {
    categoryName: string;
    errorInfo: ErrorInfo;
    onCategoryChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onSubmit: () => void;
    isLoading: boolean;
};

export const CategoriesCreateTab = ({
    categoryName,
    errorInfo,
    onCategoryChange,
    onSubmit,
    isLoading,
}: Props) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !errorInfo && categoryName.trim()) {
            onSubmit();
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextField
                label="Category Name"
                value={categoryName}
                onChange={onCategoryChange}
                onKeyDown={handleKeyPress}
                error={Boolean(errorInfo)}
                helperText={errorInfo?.helperText}
                fullWidth
                autoFocus
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <LoadingButton
                    variant="contained"
                    onClick={onSubmit}
                    disabled={!categoryName.trim() || Boolean(errorInfo)}
                    loading={isLoading}
                    sx={{ fontWeight: 600 }}
                >
                    Create
                </LoadingButton>
            </Box>
        </Box>
    );
};
