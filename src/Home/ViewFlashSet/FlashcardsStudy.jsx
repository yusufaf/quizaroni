import { useState } from "react"

/* Firebase Operations */
// import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
// import { database } from "../firebase/firebase";

/* Outside Components */
import {
    Button,
    Card,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    LinearProgress,
    Tooltip,
    Typography
} from '@mui/material/';
import { ArrowBack, ArrowForward, VolumeUp } from '@mui/icons-material/';


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

    const [currentCardSide, setCurrentCardSide] = useState(false);

    // TODO: Intended to keep track of the number of cards the user has clicked on and actually flipped/viewed
    const [cardsStudied, setCardsStudied] = useState(0);

    

    const [showWarningModal, setShowWarningModal] = useState(false);

    console.log("showWarningModal is = ", showWarningModal);

    const cardStyling = {
        display: 'flex',
        minHeight: "30rem",
        minWidth: "60rem",
        justifyContent: "center",
        "&.MuiCard-root": {
            color: theme.foreground,
            backgroundColor: theme.background,
            transition: "0.5s ease",
        }
    }

    const warningStyling = {
        "& .MuiPaper-root": {
            backgroundColor: theme.background,
        }
    }

    const typographyStyling = {
        "&.MuiTypography-root": {
            color: theme.foreground
        }
    }

    const retrieveTextStyling = (color, fontSize = "1.5rem") => {
        return {
            color,
            fontSize
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

    const handleMainBackArrow = () => {
        setShowWarningModal(true)
    }

    const handleCloseWarning = () => {
        setShowWarningModal(false);
    }

    const handleAudioPlayback = () => {
        // if (timeoutRef.current) {
        //     clearTimeout(timeoutRef.current)
        // }
        const audio = new SpeechSynthesisUtterance();
        audio.text = currentCard.term;
        window.speechSynthesis.speak(audio);
        // Wait half a second before speaking of definition
        timeoutRef.current = setTimeout(() => {
            audio.text = currentCard.definition;
            window.speechSynthesis.speak(audio);
        }, 500)
        // timeoutRef.current = "";
    }

    return (
        <div className={viewFlashStyles.studyPage}>
            {/* TODO: In global App stylings: define back arrow */}
            <IconButton color="primary"
                aria-label="arrow backward" component="span"
                sx={arrowIconStyling}
                onClick={() => handleMainBackArrow()}
            >
                <ArrowBack fontSize="large" />
            </IconButton>
            <Dialog
                open={showWarningModal}
                onClose={handleCloseWarning}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                sx={warningStyling}
            >
                <DialogTitle id="alert-dialog-title"
                    sx={retrieveTextStyling(theme.foreground, "1.75rem")}
                >
                    {"Stop studying this set?"}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="alert-dialog-description"
                        sx={retrieveTextStyling(theme.foreground, "1.5rem")}
                    >
                        You haven't finished studying all the cards in this set, are you sure you want to exit?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWarning} >Cancel</Button>
                    <Button onClick={() => {
                        handleCloseWarning();
                        setSelectedStudyMode("")
                    }} autoFocus>
                        Yes
                    </Button>
                </DialogActions>
            </Dialog>
            <Typography
                variant="h6"
                component="span"
                sx={typographyStyling}
            >
                Exit Study
            </Typography>

            {/* Progress Bar / Info here */}
            <Typography
                variant="h5"
                sx={{ ...typographyStyling, marginBottom: "1rem" }}
            >
                Progress
            </Typography>
            <LinearProgress variant="determinate" value={0} />
            <div className={viewFlashStyles.studyElements}>
                {/* TODO: Figure out how to adjust the font size of the Tooltip */}
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
                    onClick={() => setCurrentCardSide(!currentCardSide)}
                >
                    {/* Action Buttons in top right corner of current card */}
                    <Typography variant="h4" sx={{
                        alignSelf: "center",
                    }}>
                        
                        {currentCard.term}
                    </Typography>

                    <div className={viewFlashStyles.cardActions}>
                        <Tooltip
                            title="Play TTS"
                            placement="top"
                        >
                            <IconButton
                                onClick={handleAudioPlayback}
                            >
                                <VolumeUp />
                            </IconButton>
                        </Tooltip>
                    </div>
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