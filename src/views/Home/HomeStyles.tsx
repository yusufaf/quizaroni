import {
    BasePage,
    BoldTypography,
    SimpleFlexContainer,
} from "common/AppStyles";
import styled from "@emotion/styled";
import { Box, Card, Chip, Paper, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

export const HomePage = styled(BasePage)({
    marginTop: "0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 20rem"
});

export const HomePaper = styled(Paper)({});

export const HomeContainer = styled(Box)({
    width: "70rem",
    padding: "1.25rem",
    borderRadius: "0.75rem",
});

export const HomeSetsHeading = styled(BoldTypography)({});

export const HomeSetsContainer = styled("div")({
    display: "flex",
    flexDirection: "column",
    height: "40rem",
    marginTop: "1rem",
});

/* MUI DataGrid View */
export const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    "& .MuiDataGrid-virtualScroller::-webkit-scrollbar": {
        height: "0.5rem",
        width: "0.5rem",
    },
    "& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb": {
        backgroundColor: "#888",
        // background: theme.palette.grey[200],
        borderRadius: "0.5rem",
    },
    "& .MuiDataGrid-virtualScroller::-webkit-scrollbar-thumb:hover": {
        background: "#555",
        // background: theme.palette.grey[300],
    },
}));

// TODO:
export const HomeSetGrid = styled("div")({
    display: "grid",
    gridTemplateRows: "repeat(auto-fit, minmax(15rem, auto))", // modified
    gridTemplateColumns: "repeat(3, auto)",
    height: "calc(100vh - 20rem)", // add a fixed height to prevent movement of the Pagination component
});

/* Grid View - Card Styling */
export const HomeSetCard = styled(Card)(({ theme }) => ({
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
    },
}));

export const CardContent = styled("div")({
    display: "flex",
    flexDirection: "column",
});

export const CardTitle = styled(Typography)({
    fontWeight: "bold",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
});

export const CardDescription = styled(Typography)({
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: "2",
    WebkitBoxOrient: "vertical",
});

export const CardInfo = styled("div")({
    marginTop: "2rem",
});

export const TermsLabel = styled(Typography)({
    fontWeight: "bold",
});

export const SpacedContainer = styled(SimpleFlexContainer)({
    justifyContent: "space-between",
});

export const CardBottom = styled(SpacedContainer)({});

export const LabelChip = styled(Chip)({});

/* Actions Menu Styling */
// export const
