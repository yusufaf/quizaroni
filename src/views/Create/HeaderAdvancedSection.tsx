import { Button, IconButton, TextField, Typography } from "@mui/material";
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles";
import {
    AdvancedSection,
    BlankInputsContainer,
    BlankInputsField,
} from "./CreateSetStyles";
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
    selectAdvancedSectionProps,
    setAdvancedSectionProps,
} from "state/slices/createSetSlice";

type Props = {
    onBlankInputsSubmit: any;
};

const HeaderAdvancedSection = ({ onBlankInputsSubmit = null }: Props) => {
    const dispatch = useDispatch();

    const { blankCardsCount, expanded } = useSelector(
        selectAdvancedSectionProps
    );

    const onBlankInputsChange = (e: any) => {
        dispatch(
            setAdvancedSectionProps({
                blankCardsCount: e.target.value,
                expanded,
            })
        );
    };

    const onToggleExpanded = () => {
        dispatch(
            setAdvancedSectionProps({
                blankCardsCount,
                expanded: !expanded,
            })
        );
    };

    const handleBlankInputsSubmit = () => {
        onBlankInputsSubmit();

        const successAlert = {
            message: `${blankCardsCount} cards successfully created!`,
            open: true,
        };
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
