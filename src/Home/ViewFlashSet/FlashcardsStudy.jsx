import { useState } from "react"

/* Firebase Operations */
// import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
// import { database } from "../firebase/firebase";

/* Outside Components */
import { Card, IconButton, LinearProgress, Tooltip, Typography } from '@mui/material/';
import { ArrowBack, ArrowForward, } from '@mui/icons-material/';


/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';

// import {

// } from "../utilities/constants";

const FlashcardsStudy = props => {
    const { userAuthState, selectedFlashSet, setSelectedStudyMode } = props;
    const { theme } = useTheme();

    const [currentCard, setCurrentCard] = useState(selectedFlashSet.cards[0]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    // TODO: Intended to keep track of the number of cards the user has clicked on and actually flipped/viewed
    const [cardsStudied, setCardsStudied] = useState(0);

    const [showWarningModal, setShowWarningModal] = useState(false);

    console.log("selectedFlashSet = ", selectedFlashSet);

    // TODO: Makestyles here?
    const cardStyling = {
        display: 'flex',
        minHeight: "25rem",
        minWidth: "50rem",
        justifyContent: "center",
        "&.MuiCard-root": {
            color: theme.foreground,
            backgroundColor: theme.background,
            transition: "0.5s ease",
        }
    }
    const arrowIconStyling = {
        "&:hover": {
        },
        '&.MuiIconButton-colorPrimary': {
            color: theme.foreground,
        },
    }

    const handleArrowClick = (direction) => {
        const length = selectedFlashSet.cards.length;
        let newCardIndex = currentCardIndex;
        newCardIndex = direction === "FORWARD" ? newCardIndex + 1 : newCardIndex - 1;

        if (newCardIndex < 0 || newCardIndex >= length) {
            return;
            // TODO: Display page with "Study Again" button and return to home button
        }

        setCurrentCardIndex(newCardIndex);
        const { cards } = selectedFlashSet;
        setCurrentCard(cards[newCardIndex]);
    }

    return (
        <div className={viewFlashStyles.studyPage}>
            {/* TODO: In global App stylings: define back arrow */}
            <IconButton color="primary"
                aria-label="arrow backward" component="span"
                sx={arrowIconStyling}
                onClick={() => setSelectedStudyMode("")}
            >
                <ArrowBack fontSize="large" />
            </IconButton>
            <Typography
                variant="h6"
                component="span"
                sx={{
                    "&.MuiTypography-root": {
                        color: theme.foreground
                    }
                }}
            >
                Exit Study
            </Typography>

            {/* Progress Bar / Info here */}
            <LinearProgress variant="determinate" value={0} />
            <div className={viewFlashStyles.studyElements}>
                <Tooltip
                    title="Go to previous card"
                >
                    <IconButton color="primary"
                        aria-label="arrow backward" component="span"
                        sx={arrowIconStyling}
                        onClick={() => handleArrowClick("BACKWARD")}
                    >

                        <ArrowBack fontSize="large" />
                    </IconButton>
                </Tooltip>
                <Card sx={cardStyling} raised
                    onClick={() => alert("bruh")}
                >
                    {/* Action Buttons in top right corner of current card */}
                    <Typography variant="h5" sx={{ alignSelf: "center" }}>
                        {currentCard.term}
                    </Typography>
                </Card>
                <Tooltip
                    title="Go to next card"
                >
                    <IconButton color="primary" aria-label="arrow forward" component="span"
                        sx={arrowIconStyling}
                        onClick={() => handleArrowClick("FORWARD")}
                    >
                        <ArrowForward fontSize="large" />
                    </IconButton>
                </Tooltip>
            </div>
        </div >
    );
}

export default FlashcardsStudy;