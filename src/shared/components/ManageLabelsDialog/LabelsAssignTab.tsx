import { Box, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, Chip, Alert } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Studyset } from 'shared/types';

type Props = {
    labels: string[];
    studysets: Studyset[];
    selectedStudysetUUIDs: string[];
    assignLabels: string[];
    onStudysetsChange: (uuids: string[]) => void;
    onLabelsChange: (labels: string[]) => void;
    onAssign: () => void;
    isLoading: boolean;
};

export const LabelsAssignTab = ({
    labels,
    studysets,
    selectedStudysetUUIDs,
    assignLabels,
    onStudysetsChange,
    onLabelsChange,
    onAssign,
    isLoading,
}: Props) => {
    const handleStudysetsChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        onStudysetsChange(typeof value === 'string' ? value.split(',') : value);
    };

    const handleLabelsChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        onLabelsChange(typeof value === 'string' ? value.split(',') : value);
    };

    const canAssign = assignLabels.length > 0 && selectedStudysetUUIDs.length > 0;

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
                <InputLabel id="labels-select-label">Select Labels</InputLabel>
                <Select
                    labelId="labels-select-label"
                    label="Select Labels"
                    multiple
                    value={assignLabels}
                    onChange={handleLabelsChange}
                    renderValue={(selectedLabels) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {selectedLabels.map((label) => (
                                <Chip key={label} label={label} size="small" />
                            ))}
                        </Box>
                    )}
                >
                    {labels.map((label) => (
                        <MenuItem key={label} value={label}>
                            {label}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedStudysetUUIDs.length > 0 && assignLabels.length > 0 && (
                <Alert severity="warning">
                    This will set {assignLabels.length} label{assignLabels.length > 1 ? 's' : ''} to {selectedStudysetUUIDs.length} study set
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
                    Assign Labels
                </LoadingButton>
            </Box>
        </Box>
    );
};
