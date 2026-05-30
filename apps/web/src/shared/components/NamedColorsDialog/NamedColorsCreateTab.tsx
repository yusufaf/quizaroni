import { Stack, Typography, Box } from '@mui/material';
import { CreateTabLayout } from 'shared/components/MetadataDialogs';

type Props = {
    name: string;
    onNameChange: (value: string) => void;
    errorInfo: { helperText: string } | null;
    onSubmit: () => void;
    isLoading: boolean;
    color: string;
};

export const NamedColorsCreateTab = ({
    name,
    onNameChange,
    errorInfo,
    onSubmit,
    isLoading,
    color,
}: Props) => {
    const previewComponent = (
        <Stack
            direction="row"
            spacing="1rem"
            alignItems="center"
            sx={{ mt: '0.5rem' }}
        >
            <Box
                sx={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '0.25rem',
                    bgcolor: color,
                    border: '1px solid',
                    borderColor: 'divider',
                }}
            />
            <Typography>{name || 'Enter a name...'}</Typography>
        </Stack>
    );

    return (
        <CreateTabLayout
            label="Color Name"
            value={name}
            onChange={onNameChange}
            errorInfo={errorInfo}
            onSubmit={onSubmit}
            isLoading={isLoading}
            submitLabel="Create Named Color"
            previewComponent={previewComponent}
        />
    );
};
