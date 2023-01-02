import { Button, IconButton, TextField, Typography } from "@mui/material";
import { BoldHeading, SimpleFlexContainer } from "src/AppStyles"
import { AdvancedSection, BlankInputsContainer, BlankInputsField } from "./CreateSetStyles"
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";

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

    return (
        <AdvancedSection>
            <SimpleFlexContainer>
                <BoldHeading>
                    Advanced
                </BoldHeading>
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
                            inputProps: { min: 0 }
                        }}
                        onChange={onBlankInputsChange}
                        value={blankCardsCount}
                    />
                    <Button 
                        onClick={onBlankInputsSubmit}
                    >
                        Add
                    </Button>
                </BlankInputsContainer>
            }
        </AdvancedSection>
    )
}

export default HeaderAdvancedSection;