import { styled } from "@mui/system";
import {
    Button,
    Card,
    Paper,
    Select,
    TextField,
    TextareaAutosize,
    Typography,
    IconButton,
    MenuItem,
} from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";
import {
    BasePage,
    FlexColumn,
    SpacedFlexContainer,
    SimpleFlexContainer,
} from "common/AppStyles";
import { ChromePicker } from "react-color";

export const CreateSetPage = styled(BasePage)({
    marginTop: "0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "2rem",
    padding: "2rem 20rem"
});

export const CreateSetPaper = styled(Paper)({});

export const HeaderContainer = styled("div")({
    height: "fit-content",
    padding: "1.25rem",
    borderRadius: "0.75rem",
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    overflow: "hidden"
});

export const HeaderLeft = styled(FlexColumn)({
    gap: "1.25rem",
});

export const BackToViewButton = styled(Button)({
    width: "fit-content"
});


export const HeaderRight = styled(FlexColumn)({});

export const CreateSetInputsContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    position: "relative",
});

export const TitleInput = styled(TextField)({
    width: "80%",
});

export const DescriptionInput = styled(TextField)(({ theme }) => ({
    width: "80%",
    "& .MuiInputBase-input::-webkit-scrollbar": {
        width: "0.5rem",
    },
    "& .MuiInputBase-input::-webkit-scrollbar-thumb": {
        background: theme.palette.grey[500],
        borderRadius: "0.25rem",
    },
}));

export const LabelInputContainer = styled(SimpleFlexContainer)({
    gap: "1rem",
});

export const LabelInput = styled(TextField)({
    width: "18rem",
});

export const PageMainButton = styled(Button)({});

export const AdvancedSection = styled(FlexColumn)({});

export const BlankInputsContainer = styled(SimpleFlexContainer)({
    gap: "0.75rem",
});

export const BlankInputsField = styled(TextField)({
    width: "5rem",
});

export const LabelSelect = styled(Select)({
    width: "10rem",
});

export const LabelMenuItem = styled(MenuItem)({
    width: "10rem",
});

/* ==== Set Modification Buttons ==== */
export const SetModificationsContainer = styled(SimpleFlexContainer)({
    gap: "2rem",
    alignSelf: "flex-end"
})

/* ==== New Card Styled Components ====  */
export const NewCard = styled(Card)({
    padding: "1rem 1.25rem 1.25rem 1.25rem",
    borderRadius: "0.75rem",
    overflow: "unset",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    width: "100%",
});

export const AddCardButton = styled(Button)({
    display: "flex",
    gap: "0.5rem",
    fontWeight: "bold",
    fontSize: "1rem",
});

export const AddCardIcon = styled(AddCircleOutline)({
    fontSize: "3rem",
});

export const NewCardInputs = styled(SpacedFlexContainer)({
    position: "relative",
});


export const NewCardInputField = styled(TextField)(({ theme }) => ({
    width: "25rem",
    "& .MuiInputBase-input::-webkit-scrollbar": {
        width: "0.5rem",
    },
    "& .MuiInputBase-input::-webkit-scrollbar-thumb": {
        background: theme.palette.grey[500],
        borderRadius: "0.25rem",
    },
}));

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
    color: theme.palette.background.paper,
}));

export const NewCardLabel = styled(Typography)(({ theme }) => ({
    color: theme.palette.primary.main,
}));

export const NewCardTerm = styled(FlexColumn)({});

export const NewCardDefinition = styled(FlexColumn)({});

export const ExtraPickerContainer = styled(FlexColumn)(({ theme }) => ({
    background: theme.palette.background.paper,
    border: `0.125rem solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: "column",
}));

export const ExtraPickerButton = styled(IconButton)({
    height: "fit-content",
});
