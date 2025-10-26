import { Button, IconButton, TextField, Typography } from '@mui/material';
import { BoldTypography, SimpleFlexContainer } from 'styles/AppStyles';
import {
    AdvancedSection,
    BlankInputsContainer,
    BlankInputsField,
} from './CreateSetStyles';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { useCreateSetStore } from 'state/stores/createSet';

type Props = {
    onBlankInputsSubmit: any;
};

const HeaderAdvancedSection = ({ onBlankInputsSubmit = null }: Props) => {
    const { advancedSectionProps, setAdvancedSectionProps } =
        useCreateSetStore();

    const { blankCardsCount, expanded } = advancedSectionProps;

    const onBlankInputsChange = (e: any) => {
        setAdvancedSectionProps({
            blankCardsCount: e.target.value,
            expanded,
        });
    };

    const onToggleExpanded = () => {
        setAdvancedSectionProps({
            blankCardsCount,
            expanded: !expanded,
        });
    };

    const handleBlankInputsSubmit = () => {
        onBlankInputsSubmit();
    };

    return (
        <AdvancedSection>
            <SimpleFlexContainer>
                <BoldTypography>Advanced</BoldTypography>
                <IconButton onClick={onToggleExpanded}>
                    {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
            </SimpleFlexContainer>
            {expanded && (
                <BlankInputsContainer>
                    <Typography>Add x blank cards</Typography>
                    <BlankInputsField
                        type="number"
                        size="small"
                        InputProps={{
                            inputProps: { min: 0, max: 100 },
                        }}
                        onChange={onBlankInputsChange}
                        value={blankCardsCount}
                    />
                    <Button onClick={handleBlankInputsSubmit}>Add</Button>
                </BlankInputsContainer>
            )}
        </AdvancedSection>
    );
};

export default HeaderAdvancedSection;
