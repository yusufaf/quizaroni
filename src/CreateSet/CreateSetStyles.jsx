


import { styled } from "@mui/system";
import { Box, Button, Card, Paper, Select, TextField, TextareaAutosize } from "@mui/material";
import { AddCircleOutline } from "@mui/icons-material";

export const CreateSetPage = styled(Box)({
    display: "grid",
    justifyItems: "center",
    alignItems: "center",
    gridTemplateRows: "auto auto",
    gap: "2rem",
    paddingBottom: "2rem",
    // display: "flex",
    // alignItems: "center",
    // justifyContent: "center",
    // flexDirection: "column",
})

export const CreateSetPaper = styled(Paper)({
    marginTop: "2rem"
})

export const CreateSetContainer = styled(Box)({
    height: "fit-content",
    width: "70rem",
    padding: "1.25rem",
    borderRadius: "0.75rem",
})

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

export const LabelInputContainer = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: "1rem",
})

export const LabelInput = styled(TextField)({
    width: "18rem"
})

export const CreateSetButton = styled(Button)({
    position: "absolute",
    right: "2rem",
    display: "flex",
    gap: "0.5rem"
})

/* 
New Card Styled Components
*/

export const NewCard = styled(Card)({
    width: "70rem",
    padding: "1rem 1.25rem 1.25rem 1.25rem",
    borderRadius: "0.75rem",
})

export const AddCardButton = styled(Button)({
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontWeight: "bold",
    width: "70rem",
    fontSize: "1rem"
})

export const AddCardIcon = styled(AddCircleOutline)({
    fontSize: "3rem"
})

export const LabelSelect = styled(Select)({
    width: "10rem"
})

export const NewCardInputField = styled(TextField)({
    width: "25rem"
})