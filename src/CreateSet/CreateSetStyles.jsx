


import { styled } from "@mui/system";
import { Box, Button, Card, Paper, Select, TextField } from "@mui/material";

export const CreateSetPage = styled(Box)({
    display: "grid",
    justifyItems: "center",
    alignItems: "center",
    gridTemplateRows: "auto auto",
    gap: "2rem",

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
    resize: "none",
    borderRadius: "0.25rem",
    width: "30rem",
    marginBottom: "1rem"
    // fontFamily  : -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
})

export const LabelInputContainer = styled("div")({
    display: "flex",
    alignItems: "center",
    gap: "1rem",
})

export const LabelInput = styled(TextField)({
    width: "18rem"
})


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
    // width: "50%",
    width: "70rem",
    // marginTop: "2rem",
})

export const LabelSelect = styled(Select)({
    width: "10rem"
})