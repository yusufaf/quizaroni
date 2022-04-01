import { useState, useEffect, useRef } from "react"

/* Firebase Operations */
// import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
// import { database } from "../firebase/firebase";

/* Outside Components */
import { Card, Typography } from '@mui/material/';

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';

// import {

// } from "../utilities/constants";

const FlashcardsStudy = props => {
    const { userAuthState, selectedFlashSet, } = props;
    const { isDarkMode, theme } = useTheme();

    const [currentCard, setCurrentCard] = useState({});

    // TODO: Makestyles here?
    const cardStyling = { display: 'flex', minHeight: "20rem", minWidth: "30rem", justifyContent: "center" }

    const handleArrowClick = (direction) => {

    }

    return (
        <div className={viewFlashStyles.studyPage}>
            {/* TODO: In global App stylings: define back arrow */}

            {/* Progress Bar / Info here */}

            <div className={viewFlashStyles.bruh}>
                <div class={`material-icons ${viewFlashStyles.directionArrow}`}
                    onClick={() => handleArrowClick("backward")}
                >
                    arrow_backward
                </div>
                <Card sx={cardStyling}>
                    <Typography variant="h5" sx={{ alignSelf: "center" }}>
                        Live From Space
                    </Typography>
                </Card>

                <div class={`material-icons ${viewFlashStyles.directionArrow}`}
                    onClick={() => handleArrowClick("forward")}
                >
                    arrow_forward

                </div>
            </div>
        </div>
    );
}

export default FlashcardsStudy;