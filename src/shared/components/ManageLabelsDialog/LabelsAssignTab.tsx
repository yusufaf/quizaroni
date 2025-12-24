import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Chip, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Studyset } from 'shared/types';

type Props = {
    labels: string[];
    studysets: Studyset[];
    selectedStudysetUUIDs: string[];
    assignLabel: string;
    onStudysetsChange: (uuids: string[]) => void;
    onLabelChange: (label: string) => void;
    onAssign: () => void;
    isLoading: boolean;
};

export const LabelsAssignTab = ({
    labels,
    studysets,
    selectedStudysetUUIDs,
    assignLabel,
    onStudysetsChange,
    onLabelChange,
    onAssign,
    isLoading,
}: Props) => {
    const handleStudysetsChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        onStudysetsChange(typeof value === 'string' ? value.split(',') : value);
    };

    const handleLabelChange = (event: SelectChangeEvent<string>) => {
        onLabelChange(event.target.value);
    };

    const canAssign = assignLabel && selectedStudysetUUIDs.length > 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormControl fullWidth>
                <InputLabel id="studysets-select-label">Select Study Sets</InputLabel>
                <Select
                    labelId="studysets-select-label"
                    label="Select Study Sets"
                    multiple
                    value={selectedStudysetUUIDs}
                    onChange={handleStudysetsChange}
                    renderValue={(selectedUUIDs) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {selectedUUIDs.map((uuid) => {
                                const studyset = studysets.find((s) => s.studysetUUID === uuid);
                                return <Chip key={uuid} label={studyset?.title ?? ''} />;
                            })}
                        </Box>
                    )}
                >
                    {studysets.map((studyset) => (
                        <MenuItem key={studyset.studysetUUID} value={studyset.studysetUUID}>
                            <Typography variant="inherit" noWrap>
                                {studyset.title}
                            </Typography>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel id="label-select-label">Select Label</InputLabel>
                <Select
                    labelId="label-select-label"
                    label="Select Label"
                    value={assignLabel}
                    onChange={handleLabelChange}
                >
                    {labels.map((label) => (
                        <MenuItem key={label} value={label}>
                            {label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedStudysetUUIDs.length > 0 && assignLabel && (
                <Alert severity="warning">
                    This will assign "{assignLabel}" to {selectedStudysetUUIDs.length} study set
                    {selectedStudysetUUIDs.length > 1 ? 's' : ''}, replacing any existing labels.
                </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <LoadingButton
                    variant="contained"
                    onClick={onAssign}
                    disabled={!canAssign}
                    loading={isLoading}
                    sx={{ fontWeight: 600 }}
                >
                    Assign Label
                </LoadingButton>
            </Box>
        </Box>
    );
};
