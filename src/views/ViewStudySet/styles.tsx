import { styled } from "@mui/system";
import { Box, Card, FormControl, Paper, Tabs, Typography, Tab, Chip, DialogContent } from "@mui/material";
import { BasePage, BoldTypography, SimpleFlexContainer, SpacedFlexContainer } from "common/AppStyles";

export const ViewStudysetPage = styled(BasePage)({
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    padding: "0rem 22rem 2rem 22rem"
})

export const ViewFlashsetPaper = styled(Paper)({
})

export const ViewStudysetContainer = styled(Box)({
    gridRow: "1",
    height: "25rem",
    // width: "70rem",
    padding: "1rem 1.25rem",
    borderRadius: "0.75rem",
})

export const ViewStudysetHeader = styled(Box)({
    display: "grid",
    gridTemplateColumns: "30rem auto",
})

export const StudysetInfo = styled("div")(({ theme }) => ({
    borderRight: `0.1rem solid ${theme.palette.text.primary}`,
    overflowY: "auto",
}));

export const StudyModeGrid = styled(Box)({
    marginTop: "1rem",
    display: "grid",
    gridTemplateColumns: "15rem 15rem",
    gridTemplateRows: "auto auto",
})

export const CategoryTab = styled(Tab)({
    textTransform: "none",
})

export const CategoryTabs = styled(Tabs)({
    maxWidth: "25rem",
})

export const CardCount = styled(Typography)({
    justifySelf: "left",
})

export const CardFiltersContainer = styled(SpacedFlexContainer)({
    display: "flex",
    alignItems: "center",
    // justifyContent: "flex-end",
})

export const SortCardsDropdown = styled(FormControl)({
    width: "14rem"
})

/* Actions Section */
export const ActionButtonsRow = styled(Paper)({
    display: "flex",
    gap: "0.5rem",
    borderRadius: "0.75rem",
    paddingLeft: "0.5rem",
})


/* Cards */

export const ViewFlashsetCard = styled(Card)({
    // width: "70rem",
    padding: "1rem 1.25rem 1.25rem 1.25rem",
    borderRadius: "0.75rem",
    transition: "0.2s ease",
})

export const CategoryChips = styled(SimpleFlexContainer)({
    marginLeft: "1rem",
    gap: "0.5rem"
});

export const CategoryChip = styled(Chip)({
    maxWidth: "10rem",
});

export const ViewFlashCardActions = styled("div")({
    marginLeft: "auto"
})

export const ViewCardContainer = styled("div")({
    display: "flex",
    gap: "25rem",
    marginTop: "0.5rem",
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

export const ViewCardText = styled(Typography)({

});

export const NoCardsMessage = styled(BoldTypography)({});


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

// Download Dialog
export const DownloadDialogContent = styled(DialogContent)({
    display: "flex",
    flexDirection: "column",
});