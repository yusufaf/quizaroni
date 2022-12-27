import { BasePage, SimpleFlexContainer } from "src/AppStyles";
import styled from "@emotion/styled"
import { Card, Chip, Paper, Typography } from "@mui/material";

export const HomePage = styled(BasePage)({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
})

export const HomePaper = styled(Paper)({})

export const HomeSetGrid = styled("div")({
    display: "grid",
    gridTemplateRows: "repeat(3, auto)",
    gridTemplateColumns: "repeat(3, auto)",
    gap: "3rem",
})

/* Grid View - Card Styling */
export const HomeSetCard = styled(Card)(({theme}) => ({
    height: "12rem", 
    width: "20rem",
    padding: "1rem",
    transition: "0.2s ease",
    cursor: "pointer",
    "&&": {
        borderRadius: "0.75rem",
    },
    /* TODO */
    "&:hover": {
        // transition: "background 0.2s ease",
        background: theme.palette.action.hover,
    }
}));

export const CardContent = styled("div")({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
})

export const CardTitle = styled(Typography)({
    fontWeight: "bold",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
    // maxHeight ?
});

export const CardInfo = styled("div")({});

export const TermsLabel = styled(Typography)({
    fontWeight: "bold",
});

export const SpacedContainer = styled(SimpleFlexContainer)({
    justifyContent: "space-between"
});

export const CardBottom = styled(SpacedContainer)({})

export const LabelChip = styled(Chip)({
})

/* Actions Menu Styling */
// export const 