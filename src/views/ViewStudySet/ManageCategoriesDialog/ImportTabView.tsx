import { Dispatch, SetStateAction } from 'react';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Studyset } from 'shared/types';
import { Box, FormControl, InputLabel, Typography, MenuItem, List, ListItem, ListItemText, Button, Chip } from '@mui/material';
import { Inbox as InboxIcon } from '@mui/icons-material';

type Props = {
    selectedStudyset: Studyset;
    setSelectedStudysetUUID: Dispatch<SetStateAction<string>>;
    selectedStudysetUUID: string;
    studysets: Studyset[];
    handleImport: () => void;
};

const ImportTabView = (props: Props) => {
    const {
        selectedStudyset,
        setSelectedStudysetUUID,
        selectedStudysetUUID,
        studysets,
        handleImport,
    } = props;

    const handleChange = (event: SelectChangeEvent) => {
        setSelectedStudysetUUID(event.target.value as string);
    };

    const filteredStudySets = studysets.filter(
        (set) => set.studysetUUID !== selectedStudyset.studysetUUID
    );
    const importSetCategories =
        filteredStudySets.find(
            (studySet) => studySet.studysetUUID === selectedStudysetUUID
        )?.categories ?? [];

    const existingCategories = selectedStudyset.categories ?? [];
    const newCategories = importSetCategories.filter(
        (cat) => !existingCategories.includes(cat)
    );
    const duplicateCategories = importSetCategories.filter(
        (cat) => existingCategories.includes(cat)
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <FormControl fullWidth>
                <InputLabel id="study-set-select-label">Select Study Set</InputLabel>
                <Select
                    labelId="study-set-select-label"
                    label="Select Study Set"
                    value={selectedStudysetUUID}
                    onChange={handleChange}
                >
                    {filteredStudySets.map((studySet) => (
                        <MenuItem
                            key={studySet.studysetUUID}
                            value={studySet.studysetUUID}
                        >
                            <Typography variant="inherit" noWrap title={studySet.title}>
                                {studySet.title}
                            </Typography>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedStudysetUUID && (
                <>
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: '0.75rem' }}>
                            Preview: {importSetCategories.length} categor{importSetCategories.length === 1 ? 'y' : 'ies'} found
                            {newCategories.length > 0 && (
                                <> • {newCategories.length} new</>
                            )}
                            {duplicateCategories.length > 0 && (
                                <> • {duplicateCategories.length} duplicate{duplicateCategories.length > 1 ? 's' : ''} (will be skipped)</>
                            )}
                        </Typography>

                        {importSetCategories.length === 0 ? (
                            <Box sx={{ textAlign: 'center', py: '2rem' }}>
                                <InboxIcon fontSize="large" color="disabled" />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: '0.5rem' }}>
                                    No categories in selected study set
                                </Typography>
                            </Box>
                        ) : (
                            <Box
                                sx={{
                                    maxHeight: '20rem',
                                    overflowY: 'auto',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: '0.25rem',
                                }}
                            >
                                <List dense>
                                    {importSetCategories.map((category, index) => {
                                        const isDuplicate = existingCategories.includes(category);
                                        return (
                                            <ListItem
                                                key={index}
                                                divider={index < importSetCategories.length - 1}
                                                sx={{
                                                    opacity: isDuplicate ? 0.5 : 1,
                                                }}
                                            >
                                                <ListItemText primary={category} />
                                                {isDuplicate && (
                                                    <Chip
                                                        label="Duplicate"
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ ml: '0.5rem' }}
                                                    />
                                                )}
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            </Box>
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleImport}
                            disabled={newCategories.length === 0}
                            sx={{ fontWeight: 600 }}
                        >
                            Import {newCategories.length > 0 && `(${newCategories.length})`}
                        </Button>
                    </Box>
                </>
            )}
        </Box>
    );
};

export default ImportTabView;
