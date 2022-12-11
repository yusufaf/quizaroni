import { styled } from "@mui/system";
import { Box, Card, Paper } from "@mui/material";

export const ViewFlashsetPage = styled(Box)({
    display: "grid",
    justifyItems: "center",
    alignItems: "center",
    gap: "2rem"
})

export const ViewFlashsetPaper = styled(Paper)({
    marginTop: "2rem"
})

export const ViewFlashsetContainer = styled(Box)({
    gridRow: "1",
    height: "25rem",
    width: "70rem",
    padding: "1rem 1.25rem",
    borderRadius: "0.75rem",
})

export const ViewFlashsetHeader = styled(Box)({
    display: "grid",
    gridTemplateColumns: "30rem auto",
})

export const SetInfo = styled(Box)(({ theme }) => ({
    borderRight: `0.1rem solid ${theme.palette.text.primary}`,
}));

export const StudyModeGrid = styled(Box)({
    marginTop: "1rem",
    display: "grid",
    gridTemplateColumns: "15rem 15rem",
    gridTemplateRows: "auto auto",
})

/* Actions Section */


/* Cards */

export const ViewFlashsetCard = styled(Card)({
    position: "relative",
    width: "70rem",
    padding: "1rem 1.25rem 1.25rem 1.25rem",
    borderRadius: "0.75rem",
})

export const ViewFlashCardActions = styled("div")({
    marginLeft: "auto"
})

export const ViewCardInfoContainer = styled("div")({

})

export const ViewCardInfo = styled("div")({
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    flexWrap: "wrap",
    flexGrow: "1",
    width: "10rem",
    wordWrap: "break-word"
})


export const StudyModeOption = styled("div")(({ theme }) => ({
    fontSize: "1.25rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",

    userSelect: "none",
    cursor: "pointer",

    padding: "0.75rem 0.5rem",
    borderRadius: "0.25rem",
    "&: hover": {
        background: theme.palette.action.hover,
        transition: "0.2s ease",
    }
}));