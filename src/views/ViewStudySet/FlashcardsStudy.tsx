import { useEffect, useState } from "react"
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
import { useTheme } from "theme/useTheme";
import { ViewFlashCardActions } from "./ViewFlashSetStyles";
import ConfirmDialog from "components/StudysetConfirmDialog/StudysetConfirmDialog";
import {
    StudyElements
} from "./StudyModeStyles";

type Props = {
    
}

const FlashcardsStudy = (props: Props) => {
    const { theme } = useTheme();

    // const [currentCard, setCurrentCard] = useState(selectedFlashSet.cards[0]);
    const [currentCard, setCurrentCard] = useState("");

    const [currentCardIndex, setCurrentCardIndex] = useState(0);

    const [currentCardSide, setCurrentCardSide] = useState(false);

    // TODO: Intended to keep track of the number of cards the user has clicked on and actually flipped/viewed
    const [cardsStudied, setCardsStudied] = useState(0);

    useEffect(() => {
        console.log("currentCard = ", currentCard)
    }, [currentCard])

    const [showWarningModal, setShowWarningModal] = useState(false);

    console.log("showWarningModal is = ", showWarningModal);

    const cardStyling = {
        display: 'flex',
        minHeight: "30rem",
        minWidth: "60rem",
        justifyContent: "center",
        "&.MuiCard-root": {
            transition: "0.2s ease",
        }
    }

    const typographyStyling = {
        "&.MuiTypography-root": {
            color: theme.foreground
        }
    }

    const handleArrowClick = (direction) => {
        // const length = selectedFlashSet.cards.length;
        // let newCardIndex = currentCardIndex;
        // newCardIndex = direction === "FORWARD" ? newCardIndex + 1 : newCardIndex - 1;

        // if (newCardIndex < 0 || newCardIndex >= length) {
        //     return;
        //     // TODO: Display page with "Study Again" button and return to home button
        // }

        // setCurrentCardIndex(newCardIndex);
        // const { cards } = selectedFlashSet;
        // console.log("New card = ", cards[newCardIndex]);
        // setCurrentCard(cards[newCardIndex]);

    }

    const handleMainBackArrow = () => {
        setShowWarningModal(true)
    }

    const handleCloseWarning = () => {
        setShowWarningModal(false);
    }

    const handleConfirm = () => {
        handleCloseWarning();
        // setSelectedStudyMode("")
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
        <div>
            {/* TODO: In global App stylings: define back arrow */}
            <IconButton 
                color="primary"
                aria-label="arrow backward" 
                component="span"
                onClick={() => handleMainBackArrow()}
            >
                <ArrowBack fontSize="large" />
            </IconButton>
            <ConfirmDialog
                open={showWarningModal}
                onClose={handleCloseWarning}
                title="Stop studying this set?"
                dialogMessage="You haven't finished studying all the cards in this set, are you sure you want to exit?"
                onConfirm={handleConfirm}
                cancelButtonText="No"
                confirmButtonText="Yes"
            />
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
            <StudyElements>
                {/* TODO: Figure out how to adjust the font size of the Tooltip */}
                <Tooltip
                    title={<Typography fontSize="1rem">Go to previous card</Typography>}
                >
                    <IconButton 
                    color="primary"
                        aria-label="arrow backward" 
                        component="span"
                        onClick={() => handleArrowClick("BACKWARD")}
                    >
                        <ArrowBack fontSize="large" />
                    </IconButton>
                </Tooltip>
                <Card
                    sx={cardStyling}
                    raised
                    onClick={() => setCurrentCardSide(!currentCardSide)}
                >
                    {/* Action Buttons in top right corner of current card */}
                    <Typography
                        variant="h4"
                        sx={{
                            alignSelf: "center",
                        }}
                    >
                        {currentCard.term}
                    </Typography>
                    {/* <div className={viewFlashStyles.cardActions}>
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
                    </div> */}
                </Card>
                <Tooltip
                    title={<Typography fontSize="1rem">Go to next card</Typography>}
                >
                    <IconButton
                        color="primary"
                        aria-label="arrow forward"
                        component="span"
                        onClick={() => handleArrowClick("FORWARD")}
                    >
                        <ArrowForward fontSize="large" />
                    </IconButton>
                </Tooltip>
            </StudyElements>
        </div >
    );
}

export default FlashcardsStudy;