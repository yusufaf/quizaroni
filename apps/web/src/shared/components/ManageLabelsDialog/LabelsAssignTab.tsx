import {
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent,
    Typography,
    Chip,
    Alert,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useTranslation } from 'react-i18next';
import { Studyset } from 'shared/types';
import { dateLocale } from 'i18n/languages';

type Props = {
    labels: string[];
    studysets: Studyset[];
    currentStudysetUUID?: string;
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
    currentStudysetUUID,
    selectedStudysetUUIDs,
    assignLabels,
    onStudysetsChange,
    onLabelsChange,
    onAssign,
    isLoading,
}: Props) => {
    const { t } = useTranslation();
    const formatDate = (timestamp: string) => {
        try {
            return new Date(timestamp).toLocaleDateString(dateLocale(), {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return '';
        }
    };
    const handleStudysetsChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        onStudysetsChange(typeof value === 'string' ? value.split(',') : value);
    };

    const handleLabelsChange = (event: SelectChangeEvent<string[]>) => {
        const value = event.target.value;
        onLabelsChange(typeof value === 'string' ? value.split(',') : value);
    };

    const canAssign =
        assignLabels.length > 0 && selectedStudysetUUIDs.length > 0;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormControl fullWidth>
                <InputLabel id="studysets-select-label">
                    {t('labelsAssign.selectStudySets')}
                </InputLabel>
                <Select
                    labelId="studysets-select-label"
                    label={t('labelsAssign.selectStudySets')}
                    multiple
                    value={selectedStudysetUUIDs}
                    onChange={handleStudysetsChange}
                    MenuProps={{
                        PaperProps: {
                            sx: {
                                maxHeight: '25rem',
                                maxWidth: '35rem',
                            },
                        },
                    }}
                    renderValue={(selectedUUIDs) => (
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                            }}
                        >
                            {selectedUUIDs.map((uuid) => {
                                const studyset = studysets.find(
                                    (s) => s.studysetUUID === uuid
                                );
                                return (
                                    <Chip
                                        key={uuid}
                                        label={studyset?.title ?? ''}
                                    />
                                );
                            })}
                        </Box>
                    )}
                >
                    {studysets.map((studyset) => {
                        const isCurrent =
                            studyset.studysetUUID === currentStudysetUUID;
                        const dateStr = formatDate(studyset.createdAt);
                        return (
                            <MenuItem
                                key={studyset.studysetUUID}
                                value={studyset.studysetUUID}
                            >
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        width: '100%',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                        }}
                                    >
                                        <Typography
                                            variant="inherit"
                                            noWrap
                                            sx={{ flex: 1 }}
                                        >
                                            {studyset.title}
                                        </Typography>
                                        {isCurrent && (
                                            <Chip
                                                label={t(
                                                    'labelsAssign.current'
                                                )}
                                                size="small"
                                                color="primary"
                                                sx={{
                                                    height: '1.25rem',
                                                    fontSize: '0.625rem',
                                                }}
                                            />
                                        )}
                                    </Box>
                                    {dateStr && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            {t('labelsAssign.createdOn', {
                                                date: dateStr,
                                            })}
                                        </Typography>
                                    )}
                                </Box>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel id="labels-select-label">
                    {t('labelsAssign.selectLabels')}
                </InputLabel>
                <Select
                    labelId="labels-select-label"
                    label={t('labelsAssign.selectLabels')}
                    multiple
                    value={assignLabels}
                    onChange={handleLabelsChange}
                    renderValue={(selectedLabels) => (
                        <Box
                            sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                            }}
                        >
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
                    {t('labelsAssign.replaceWarning', {
                        labels: t('labelsAssign.labelCount', {
                            count: assignLabels.length,
                        }),
                        sets: t('labelsAssign.setCount', {
                            count: selectedStudysetUUIDs.length,
                        }),
                    })}
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
                    {t('home.toolbar.assignLabels')}
                </LoadingButton>
            </Box>
        </Box>
    );
};
