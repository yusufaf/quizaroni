import { useState, useEffect, useRef } from "react"

/* Firebase Operations */
// import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
// import { database } from "../firebase/firebase";

/* Outside Components */
import { Card, IconButton, Typography } from '@mui/material/';
import { ArrowBack, ArrowForward } from '@mui/icons-material/';


/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';

// import {

// } from "../utilities/constants";

const FlashcardsStudy = props => {
    const { userAuthState, selectedFlashSet, } = props;
    const { theme } = useTheme();

    const [currentCard, setCurrentCard] = useState({});
    const [currentCardIndex, setCurrentCardIndex] = useState(0);

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
    // TODO: Increase size of arrow buttons?
    const arrowIconStyling = {
        '&.MuiIconButton-colorPrimary': {
            color: theme.foreground,
        },
    }

    const handleArrowClick = (direction) => {
        const length = Object.keys(selectedFlashSet).length;
        let newCardIndex = currentCardIndex;
        newCardIndex = direction === "FORWARD" ? newCardIndex + 1 : newCardIndex - 1;
        console.log("newCardIndex is now = ", newCardIndex);

        if (currentCardIndex + 1 >= length) {
            // TODO: Display page with "Study Again" button and return to home button
        }
        setCurrentCardIndex(newCardIndex);
    }

    return (
        <div className={viewFlashStyles.studyPage}>
            {/* TODO: In global App stylings: define back arrow */}

            {/* Progress Bar / Info here */}

            <div className={viewFlashStyles.studyElements}>

                <IconButton color="primary"
                    aria-label="arrow backward" component="span"
                    sx={arrowIconStyling}
                    onClick={() => handleArrowClick("BACKWARD")}
                >
                    <ArrowBack />
                </IconButton>
                <Card sx={cardStyling} raised>
                    <Typography variant="h5" sx={{ alignSelf: "center" }}>
                        {/* {currentCard.name} */}
                        Live from Space
                    </Typography>
                </Card>
                <IconButton color="primary" aria-label="arrow forward" component="span"
                    sx={arrowIconStyling}
                    onClick={() => handleArrowClick("FORWARD")}
                >
                    <ArrowForward />
                </IconButton>
            </div>
        </div>
    );
}

export default FlashcardsStudy;