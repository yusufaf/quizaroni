import { Button, IconButton, TextField, Typography } from "@mui/material";
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles"
import { AdvancedSection, BlankInputsContainer, BlankInputsField } from "./createSetStyles"
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { setAlert } from "state/slices/global";
import { useDispatch } from 'react-redux';

type Props = {
    blankCardsCount: number,
    expanded: boolean,
    onToggleExpanded: any,
    onBlankInputsChange: any,
    onBlankInputsSubmit: any,
}

const HeaderAdvancedSection = (props: Props) => {
    const {
        blankCardsCount,
        expanded,
        onToggleExpanded,
        onBlankInputsChange = null,
        onBlankInputsSubmit = null,
    } = props;

    const dispatch = useDispatch();

    const handleBlankInputsSubmit = () => {
        onBlankInputsSubmit();

        const successAlert = {
            message: `${blankCardsCount} cards successfully created!`,
            open: true,
        };
        dispatch(setAlert(successAlert));
    }
   
    return (
        <AdvancedSection>
            <SimpleFlexContainer>
                <BoldTypography>
                    Advanced
                </BoldTypography>
                <IconButton onClick={onToggleExpanded}>
                    {expanded ?
                        <ExpandLessIcon /> :
                        <ExpandMoreIcon />}
                </IconButton>
            </SimpleFlexContainer>
            {
                expanded &&
                <BlankInputsContainer>
                    <Typography>
                        Add x blank cards
                    </Typography>
                    <BlankInputsField
                        type="number"
                        size="small"
                        InputProps={{
                            inputProps: { min: 0, max: 100}
                        }}
                        onChange={onBlankInputsChange}
                        value={blankCardsCount}
                    />
                    <Button 
                        onClick={handleBlankInputsSubmit}
                    >
                        Add
                    </Button>
                </BlankInputsContainer>
            }
        </AdvancedSection>
    )
}

export default HeaderAdvancedSection;