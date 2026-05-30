import { useState, ChangeEvent } from 'react';
import { Box, TextField, Checkbox, FormControlLabel } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { ErrorInfo } from 'shared/components/MetadataDialogs';

type Props = {
    labels: string[];
    studysetUUID: string;
    onSubmit: (label: string, updateStudysetLabel: boolean) => void;
    isLoading: boolean;
};

export const LabelsCreateTab = ({
    labels,
    studysetUUID,
    onSubmit,
    isLoading,
}: Props) => {
    const [labelName, setLabelName] = useState('');
    const [errorInfo, setErrorInfo] = useState<ErrorInfo>(null);
    const [shouldUpdateLabel, setShouldUpdateLabel] = useState(false);

    const handleLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setLabelName(value);

        if (!value.trim()) {
            setErrorInfo({ helperText: 'Name cannot be empty' });
        } else if (labels.includes(value)) {
            setErrorInfo({ helperText: 'Label already exists' });
        } else {
            setErrorInfo(null);
        }
    };

    const handleSubmit = () => {
        if (!labelName.trim() || errorInfo) {
            return;
        }
        onSubmit(labelName.trim(), shouldUpdateLabel);
        setLabelName('');
        setShouldUpdateLabel(false);
        setErrorInfo(null);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !errorInfo && labelName.trim()) {
            handleSubmit();
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <TextField
                label="Label Name"
                value={labelName}
                onChange={handleLabelChange}
                onKeyDown={handleKeyPress}
                error={Boolean(errorInfo)}
                helperText={errorInfo?.helperText}
                fullWidth
                autoFocus
            />

            {studysetUUID && (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={shouldUpdateLabel}
                            onChange={(e) =>
                                setShouldUpdateLabel(e.target.checked)
                            }
                        />
                    }
                    label="Apply to current study set"
                />
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <LoadingButton
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={!labelName.trim() || Boolean(errorInfo)}
                    loading={isLoading}
                    sx={{ fontWeight: 600 }}
                >
                    Create
                </LoadingButton>
            </Box>
        </Box>
    );
};
