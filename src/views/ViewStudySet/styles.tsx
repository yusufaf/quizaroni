import { styled } from "@mui/system";
import { Box, Card, FormControl, Paper, Tabs, Typography } from "@mui/material";
import { BasePage, SimpleFlexContainer, SpacedFlexContainer } from "src/AppStyles";


export const ViewFlashsetPage = styled(BasePage)({
    height: "100%",
    // display: "grid",
    // justifyItems: "center",
    // alignItems: "center",
    display: "grid",
    flexDirection: "column",
    // justifyContent: "center",
    // alignItems: "center",
    gap: "2rem",
    padding: "0rem 22rem"
})

export const ViewFlashsetPaper = styled(Paper)({
})

export const ViewFlashsetContainer = styled(Box)({
    gridRow: "1",
    height: "25rem",
    // width: "70rem",
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
    width: "10rem"
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

/* 
.studySection {
    padding-left: 1rem;
}

.studyOptions {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: 15rem 15rem;
    grid-template-rows: auto auto;
}

.studyButton {
    font-size: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    user-select: none;
    cursor: pointer;

    padding: 0.75rem 0.5rem;
    border-radius: 0.25rem;
}

.firstCard {
    margin-top: 10rem;
}

.viewFlashCard {
    position: relative;
    width: 70rem;
    right: 1.5rem;
    padding: 1rem 1.25rem 1.25rem 1.25rem;
    border-radius: 0.75rem;
    margin-bottom: 2.5rem;
}

.cardHeader {
    display: flex;
    align-items: center;
}

.viewCardContainer {
    display: flex;
    gap: 25rem;
    margin-top: 0.5rem;
}

.viewCardTerm,
.viewCardDefinition {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    flex-wrap: wrap;
    flex-grow: 1;
}

.backButtonContainer {
    display: flex;
    align-items: center;
}
*/