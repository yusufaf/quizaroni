import { Stack, TextField, Paper, Typography } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Add as AddIcon } from '@mui/icons-material';
import { CreateTabLayoutProps } from './types';

export const CreateTabLayout = ({
    label,
    value,
    onChange,
    errorInfo,
    onSubmit,
    isLoading = false,
    submitLabel = 'Create',
    previewComponent,
    additionalContent,
}: CreateTabLayoutProps) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !errorInfo && value.trim()) {
            onSubmit();
        }
    };

    return (
        <Stack spacing="1rem" sx={{ mt: '1rem' }}>
            <TextField
                label={label}
                variant="outlined"
                fullWidth
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={Boolean(errorInfo)}
                helperText={errorInfo?.helperText}
                autoFocus
                onKeyDown={handleKeyPress}
            />

            {additionalContent}

            {previewComponent && (
                <Paper variant="outlined" sx={{ p: '1rem' }}>
                    <Typography variant="caption" color="text.secondary">
                        Preview
                    </Typography>
                    {previewComponent}
                </Paper>
            )}

            <LoadingButton
                variant="contained"
                size="large"
                fullWidth
                onClick={onSubmit}
                loading={isLoading}
                disabled={!value.trim() || Boolean(errorInfo)}
                startIcon={<AddIcon />}
            >
                {submitLabel}
            </LoadingButton>
        </Stack>
    );
};
