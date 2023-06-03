import { BasePage, BoldTypography, SimpleFlexContainer } from "common/AppStyles";
import styled from "@emotion/styled"
import { Box, Card, Chip, Paper, Typography } from "@mui/material";

export const HomePage = styled(BasePage)({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 2rem 2rem 2rem",
})

export const HomePaper = styled(Paper)({})

export const HomeContainer = styled(Box)({
    width: "70rem",
})

export const HomeSetsHeading = styled(BoldTypography)({})

export const HomeSetsContainer = styled(Box)({
    height: "40rem",
    marginTop: "1rem"
})

// TODO:
export const HomeSetGrid = styled("div")({
    display: "grid",
    gridTemplateRows: "repeat(auto-fit, minmax(15rem, auto))", // modified
    gridTemplateColumns: "repeat(3, auto)",
    height: "calc(100vh - 20rem)", // add a fixed height to prevent movement of the Pagination component
})

/* Grid View - Card Styling */
export const HomeSetCard = styled(Card)(({theme}) => ({
    maxHeight: "15rem",
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
})

export const CardTitle = styled(Typography)({
    fontWeight: "bold",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
});

export const CardDesc = styled(Typography)({
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
})

export const CardInfo = styled("div")({
    marginTop: "2rem"
});

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


