import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Studyset } from 'shared/types';
import {
    CategoryFormControl,
    CategoryInputsContainer,
    StyledMenuItem,
} from './styles';
import { InputLabel, Typography } from '@mui/material';
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
        <CategoryInputsContainer>
            <CategoryFormControl fullWidth>
                <InputLabel id="card-select-label">Card</InputLabel>
                <Select
                    labelId="card-select-label"
                    label="Card"
                    value={selectedCardUUID}
                    onChange={(e) => setSelectedCardUUID(e.target.value)}
                >
                    {cards.map((card, index) => {
                        const text = `Term: ${card.term} | Definition: ${card.definition}`;
                        return (
                            <StyledMenuItem
                                key={card.cardUUID}
                                value={card.cardUUID}
                                title={text}
                            >
                                <Typography
                                    variant="inherit"
                                    noWrap
                                    title={text}
                                >
                                    {text}
                                </Typography>
                            </StyledMenuItem>
                        );
                    })}
                </Select>
            </CategoryFormControl>
            {selectedCardUUID && (
                <CategoryFormControl fullWidth>
                    <InputLabel id="category-select-label">
                        Categories
                    </InputLabel>
                    <Select
                        labelId="category-select-label"
                        label="Categories"
                        multiple
                        value={selectedCardCategories}
                        onChange={onAssignedCategoriesChange}
                        disabled={isAssigningCategories}
                    >
                        {categories.map((category, index) => {
                            return (
                                <StyledMenuItem key={category} value={category}>
                                    {category}
                                </StyledMenuItem>
                            );
                        })}
                    </Select>
                </CategoryFormControl>
            )}
        </CategoryInputsContainer>
    );
};

export default AssignTabView;
