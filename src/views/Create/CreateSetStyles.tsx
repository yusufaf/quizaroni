
import { styled } from "@mui/system";
import { Box, Button, Card, Paper, Select, TextField, TextareaAutosize, Typography, IconButton } from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import { BasePage, FlexColumn, SpacedFlexContainer, SimpleFlexContainer } from "common/AppStyles";
import { ChromePicker } from "react-color";

export const CreateSetPage = styled(BasePage)({
    display: "grid",
    justifyItems: "center",
    alignItems: "center",
    gridTemplateRows: "auto auto",
    gap: "2rem",
    paddingBottom: "2rem",
})

export const CreateSetPaper = styled(Paper)({})

export const CreateSetContainer = styled("div")({
    height: "fit-content",
    width: "70rem",
    padding: "1.25rem",
    borderRadius: "0.75rem",
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
})

export const HeaderLeftContainer = styled(FlexColumn)({})

export const HeaderRightContainer = styled(FlexColumn)({})

export const CreateSetInputsContainer = styled(Box)({
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: "1.25rem",
    position: "relative",
})

export const TitleInput = styled(TextField)({
    marginBottom: "1rem",
    width: "17rem",
})

export const DescriptionInput = styled(TextField)({
    width: "30rem",
    marginBottom: "1rem",
})

export const LabelInputContainer = styled(SimpleFlexContainer)({
    gap: "1rem",
})

export const LabelInput = styled(TextField)({
    width: "18rem"
})

export const CreateSetButton = styled(Button)({
    // position: "absolute",
    // right: "2rem",
})

export const AdvancedSection = styled(FlexColumn)({
})

export const BlankInputsContainer = styled(SimpleFlexContainer)({
    gap: "0.75rem",
})

export const BlankInputsField = styled(TextField)({
    width: "5rem",
})

export const LabelSelect = styled(Select)({
    width: "10rem"
})


/* 
New Card Styled Components
*/

export const NewCard = styled(Card)({
    width: "70rem",
    padding: "1rem 1.25rem 1.25rem 1.25rem",
    borderRadius: "0.75rem",
    overflow: "unset"
})

export const AddCardButton = styled(Button)({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontWeight: "bold",
    width: "70rem",
    fontSize: "1rem",
    marginTop: "0.5rem",
})

export const AddCardIcon = styled(AddCircleOutline)({
    fontSize: "3rem"
})

export const NewCardInputs = styled(SpacedFlexContainer)({
    marginTop: "0.5rem",
    position: "relative",
})

export const NewCardInputField = styled(TextField)({
    width: "25rem",
    // '&::-webkit-scrollbar': {
    //     width: '0.4rem',
    // },
    // '&::-webkit-scrollbar-track': {
    //     background: "#f1f1f1",
    // },
    // '&::-webkit-scrollbar-thumb': {
    //     backgroundColor: '#888',
    // },
    // '&::-webkit-scrollbar-thumb:hover': {
    //     background: '#555'
    // }
})

export const NewCardHeader = styled("div")({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
});

export const CenterActions = styled(SimpleFlexContainer)({
    position: "relative",
    justifyContent: "center",
    gap: "1rem",
});

export const RightActions = styled(SimpleFlexContainer)({});

export const BottomActions = styled(SimpleFlexContainer)({
    position: "absolute",
    top: "100%",
    left: "47.5%",
});

export const AddCardBelowButton = styled(IconButton)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.background.paper
}));

export const NewCardLabel = styled(Typography)(({ theme }) => ({
    color: theme.palette.primary.main
}));

export const NewCardTerm = styled(FlexColumn)({})

export const NewCardDefinition = styled(FlexColumn)({})

export const BgColorPickerContainer = styled("div")({
    position: "absolute",
    bottom: "2.5rem",
    left: "4rem",
    display: "flex",
    flexDirection:"row"
})

export const TextColorPickerContainer = styled("div")({
    position: "absolute",
    bottom: "2.5rem",
    display: "flex",
    flexDirection:"row"
})

export const ExtraPickerContainer = styled(FlexColumn)(({ theme }) => ({
    background: theme.palette.background.paper,
    border: `0.125rem solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: "column"
}));

export const ExtraPickerButton = styled(IconButton)({
    height: "fit-content"
})