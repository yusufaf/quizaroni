import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Studyset } from 'shared/types';
import {
    Box,
    FormControl,
    InputLabel,
    Typography,
    MenuItem,
} from '@mui/material';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

type Props = {
    selectedStudyset: Studyset;
    selectedCardUUID: string;
    setSelectedCardUUID: Dispatch<SetStateAction<string>>;
    assignedCategories: string[];
    onAssignedCategoriesChange: (e: SelectChangeEvent<string[]>) => void;
    isAssigningCategories?: boolean;
};

const AssignTabView = (props: Props) => {
    const {
        selectedStudyset,
        selectedCardUUID,
        setSelectedCardUUID,
        assignedCategories,
        onAssignedCategoriesChange,
        isAssigningCategories = false,
    } = props;

    const { t } = useTranslation();

    const { cards, categories } = selectedStudyset;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <FormControl fullWidth>
                <InputLabel id="card-select-label">
                    {t('categories.selectCard')}
                </InputLabel>
                <Select
                    labelId="card-select-label"
                    label={t('categories.selectCard')}
                    value={selectedCardUUID}
                    onChange={(e) => setSelectedCardUUID(e.target.value)}
                >
                    {cards.map((card) => {
                        const text = t('categories.termDefinitionFormat', {
                            term: card.term,
                            definition: card.definition,
                        });
                        return (
                            <MenuItem key={card.cardUUID} value={card.cardUUID}>
                                <Typography
                                    variant="inherit"
                                    noWrap
                                    title={text}
                                >
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
                        {t('categories.assignCategories')}
                    </InputLabel>
                    <Select
                        labelId="category-select-label"
                        label={t('categories.assignCategories')}
                        multiple
                        value={assignedCategories}
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
                    {assignedCategories.length === 0
                        ? t('categories.noCategoriesAssigned')
                        : t('categories.categoriesAssigned', {
                              count: assignedCategories.length,
                          })}
                </Typography>
            )}
        </Box>
    );
};

export default AssignTabView;
