import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Studyset } from 'shared/types';
import { Box, FormControl, InputLabel, Typography, MenuItem } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';

type Props = {
    selectedStudyset: Studyset;
    selectedCardUUID: string;
    setSelectedCardUUID: Dispatch<SetStateAction<string>>;
    onAssignedCategoriesChange: (e: SelectChangeEvent) => void;
    isAssigningCategories?: boolean;
};

const AssignTabView = (props: Props) => {
    const {
        selectedStudyset,
        selectedCardUUID,
        setSelectedCardUUID,
        onAssignedCategoriesChange,
        isAssigningCategories = false,
    } = props;

    const { cards, categories } = selectedStudyset;
    const selectedCardCategories: string[] =
        cards?.find((card) => card.cardUUID === selectedCardUUID)?.categories ??
        [];

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <FormControl fullWidth>
                <InputLabel id="card-select-label">Select Card</InputLabel>
                <Select
                    labelId="card-select-label"
                    label="Select Card"
                    value={selectedCardUUID}
                    onChange={(e) => setSelectedCardUUID(e.target.value)}
                >
                    {cards.map((card) => {
                        const text = `Term: ${card.term} | Definition: ${card.definition}`;
                        return (
                            <MenuItem
                                key={card.cardUUID}
                                value={card.cardUUID}
                            >
                                <Typography variant="inherit" noWrap title={text}>
                                    {text}
                                </Typography>
                            </MenuItem>
                        );
                    })}
                </Select>
            </FormControl>

            {selectedCardUUID && (
                <FormControl fullWidth>
                    <InputLabel id="category-select-label">
                        Assign Categories
                    </InputLabel>
                    <Select
                        labelId="category-select-label"
                        label="Assign Categories"
                        multiple
                        value={selectedCardCategories}
                        onChange={onAssignedCategoriesChange}
                        disabled={isAssigningCategories}
                    >
                        {categories.map((category) => {
                            return (
                                <MenuItem key={category} value={category}>
                                    {category}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>
            )}

            {selectedCardUUID && (
                <Typography variant="body2" color="text.secondary">
                    {selectedCardCategories.length === 0
                        ? 'No categories assigned to this card'
                        : `${selectedCardCategories.length} categor${selectedCardCategories.length === 1 ? 'y' : 'ies'} assigned`}
                </Typography>
            )}
        </Box>
    );
};

export default AssignTabView;
