import {
    Button,
    Card,
    Chip,
    DialogContent,
    FormControl,
    Paper,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import { styled } from "@mui/system";
import {
    BasePage,
    BoldTypography,
    SimpleFlexContainer,
    SpacedFlexContainer,
} from "common/AppStyles";

export const ViewStudysetPage = styled(BasePage)({
    height: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    padding: "0rem 22rem 2rem 22rem",
});

export const ViewFlashsetPaper = styled(Paper)({});

export const ViewStudysetContainer = styled("div")({
    gridRow: "1",
    height: "25rem",
    padding: "1rem 1.25rem",
    borderRadius: "0.75rem",
});

export const ViewStudysetHeader = styled("div")({
    display: "grid",
    gridTemplateColumns: "30rem auto",
    height: "100%",
});

export const StudysetInfo = styled("div")(({ theme }) => ({
    height: "100%",
    paddingRight: "0.5rem",
    borderRight: `0.1rem solid ${theme.palette.text.primary}`,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
}));

export const StudysetDescription = styled(Typography)(({ theme }) => ({
    flex: 1,
    margin: "1rem 0",
    maxHeight: "10rem",
    overflowY: "auto",
    overflowX: "hidden",
    "&::-webkit-scrollbar": {
        width: "0.5rem",
    },
    "&::-webkit-scrollbar-thumb": {
        background: theme.palette.grey[500],
        borderRadius: "0.25rem",
    },
}));

export const StudyModesSection = styled("section")({
    padding: "0 1rem"
})

export const StudyModeGrid = styled("div")({
    height: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gridTemplateRows: "repeat(2, auto)",
    gap: "1rem",
});

export const StudyModePaper = styled(Paper)(({ theme }) => ({
    fontSize: "1.25rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    userSelect: "none",
    cursor: "pointer",
    "&: hover": {
        background: theme.palette.action.hover,
        transition: "0.2s ease",
    },
}));

export const StudyModeTitle = styled(BoldTypography)({
    fontSize: "1.25rem",
});

export const CategoryTab = styled(Tab)({
    textTransform: "none",
});

export const CategoryTabs = styled(Tabs)({
    maxWidth: "25rem",
});

export const CardFiltersContainer = styled(SpacedFlexContainer)({
    display: "flex",
    alignItems: "center",
    // justifyContent: "flex-end",
});

export const SortCardsDropdown = styled(FormControl)({
    width: "14rem",
});

/* Actions Section */
export const ActionButtonsRow = styled(Paper)({
    display: "flex",
    gap: "0.5rem",
    borderRadius: "0.75rem",
    paddingLeft: "0.5rem",
});

/* Cards */

export const ViewFlashsetCard = styled(Card)({
    // width: "70rem",
    padding: "1rem 1.25rem 1.25rem 1.25rem",
    borderRadius: "0.75rem",
    transition: "0.2s ease",
});

export const CategoryChips = styled(SimpleFlexContainer)({
    marginLeft: "1rem",
    gap: "0.5rem",
});

export const CategoryChip = styled(Chip)({
    maxWidth: "10rem",
});

export const ViewFlashCardActions = styled("div")({
    marginLeft: "auto",
});

export const ViewCardContainer = styled("div")({
    display: "flex",
    gap: "25rem",
    marginTop: "0.5rem",
});

export const ViewCardInfo = styled("div")({
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    flexWrap: "wrap",
    flexGrow: "1",
    width: "10rem",
    wordWrap: "break-word",
});

export const ViewCardText = styled(Typography)({});

export const NoCardsMessage = styled(BoldTypography)({});

export const UpdateCardsButton = styled(Button)({
    alignSelf: "center",
    width: "25%",
    textTransform: "none",
    fontSize: "1rem",
});

// Download Dialog
export const DownloadDialogContent = styled(DialogContent)({
    display: "flex",
    flexDirection: "column",
});
