


import { styled } from "@mui/system";
import { Box, Card, Paper, TextField } from "@mui/material";

export const CreateSetPage = styled(Box)({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
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