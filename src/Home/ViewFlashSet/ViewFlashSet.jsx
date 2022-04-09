import { useEffect, useState, useRef } from "react"
/* Firebase Operations */
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { firebaseApp, database } from "../../firebase/firebase";

/* Outside Components */
import { Alert, AlertTitle, Chip, FormControlLabel, IconButton, Menu, MenuItem, Switch, Paper, Tooltip, Typography } from '@mui/material/';
import { Add, ArrowBack, Download, EditNotifications, MenuOpen } from '@mui/icons-material/';

import ViewFlashCard from "./ViewFlashCard";

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';
import * as appStyles from "../../App.module.css";

import FLASH_CARDS_IMG from "../../resources/images/flash-card.png";
import { STUDY_MODES, VIEW_SET } from "../../utilities/constants";
import FlashcardsStudy from "./FlashcardsStudy";
const { BACKGROUND, TEXT } = VIEW_SET;

const ViewFlashSet = props => {
    const {
        setViewFlashSet,
        selectedFlashSet,
        setSelectedFlashSet,
        userAuthState
    } = props;

    console.log("selectedFlashSet = ", selectedFlashSet)

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const controlAnchorRef = useRef(null);

    const [showNotificationsModal, setShowNotificationsModal] = useState(false);
    const [showControlMenu, setShowControlMenu] = useState(false);
    const [disableTextColor, setDisableTextColor] = useState(false);
    const [disableBackgroundColor, setDisableBackgroundColor] = useState(false);
    const [studySetViewable, setStudySetViewable] = useState(false);

    const [selectedStudyMode, setSelectedStudyMode] = useState("");

    // TODO: Increase size of arrow buttons?
    const arrowIconStyling = {
        '&.MuiIconButton-colorPrimary': {
            color: theme.foreground,
        },
    }

    /* Update the title of the page to include the title of the set */
    useEffect(() => {
        const { title } = selectedFlashSet;
        document.title = `Quizaroni | ${title}`
        return () => {
            document.title = `Quizaroni`;
        }
    }, [])


    const handleDisableColorToggle = async (type) => {
        const { uid } = userAuthState;
        const { setID } = selectedFlashSet;

        const flashCollection = collection(database, "flashcards");
        const queryResult = query(flashCollection,
            where("setID", "==", setID)
        );
        const docSnap = await getDocs(queryResult);
        const flashDoc = docSnap.docs[0];

        if (type === TEXT) {
            setDisableTextColor(!disableTextColor)
            if (flashDoc) {
                const docRef = flashDoc.ref;
                updateDoc(docRef, {
                    disableTextColor: !disableTextColor
                });
            }
        }
        else if (type === BACKGROUND) {
            setDisableBackgroundColor(!disableBackgroundColor)
            if (flashDoc) {
                const docRef = flashDoc.ref;
                updateDoc(docRef, {
                    disableBackgroundColor: !disableBackgroundColor
                });
            }
        }
    }


    /* TODO: Using a library like React-pdf? Otherwise just creating a text file w/ comma sep values */
    const handleDownloadSet = () => {

        /* Initial implementation of the following text file structure:
            Card {index}:
                term: ""
                definition: ""
        */
        const anchor = document.createElement("a");
        const cards = selectedFlashSet.cards;
        const mappedCards = cards.map((card, index) => ({ [`Card ${index + 1}`]: { term: card.term, definition: card.definition } }));
        const cleanedCards = Object.assign({}, ...mappedCards);

        const file = new Blob([JSON.stringify(cleanedCards, null, 2)], { type: 'text/plain' });
        anchor.href = URL.createObjectURL(file);
        const { title: setTitle } = selectedFlashSet;
        anchor.download = `${setTitle}_Set.txt`;
        document.body.appendChild(anchor); // Required for this to work in FireFox
        anchor.click();
    }

    /* TODO: Future future task.
    Ideally: Displaying a modal where a checkbox whether you want a reminder to study this flashset 
    */
    const handleEmailReminders = () => {

    }

    const renderActionBar = () => {
        return (
            <>
                <div style={{ marginTop: "1rem" }}>
                    <IconButton
                        onClick={() => handleDownloadSet()}
                        sx={{
                            padding: "0.75rem"
                        }}
                    >
                        <Download
                            sx={{
                                color: theme.foreground
                            }}
                        />
                    </IconButton>
                    <Typography
                        component="span"
                    >
                        Download
                    </Typography>
                </div>
                <div>
                    <IconButton
                        onClick={() => setShowNotificationsModal(true)}
                        sx={{
                            padding: "0.75rem"
                        }}
                    >
                        <EditNotifications
                            sx={{
                                color: theme.foreground
                            }}
                        />
                    </IconButton>
                    <Typography
                        component="span"
                    >
                        Manage Notifications
                    </Typography>
                </div>
                <div
                    ref={controlAnchorRef}
                >
                    <IconButton
                        onClick={() => setShowControlMenu(true)}
                        sx={{
                            padding: "0.75rem"
                        }}
                    >
                        <MenuOpen
                            sx={{
                                color: theme.foreground
                            }}
                        />
                    </IconButton>

                    <Typography
                        component="span"
                    >
                        Control Menu
                    </Typography>
                </div>
                <Menu
                    open={showControlMenu}
                    onClose={() => setShowControlMenu(false)}
                    anchorEl={controlAnchorRef.current}
                >
                    <MenuItem>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={disableTextColor}
                                    onChange={() => handleDisableColorToggle("TEXT")}
                                />
                            } label={
                                <Typography
                                    sx={{
                                        color: disableTextColor ? "red" : "green"
                                    }}
                                >
                                    {`Text Color: ${disableTextColor ? "Disabled" : "Enabled"}`}
                                </Typography>
                            }
                        />
                    </MenuItem>
                    <MenuItem>
                        <FormControlLabel
                            control={
                                <Switch
                                    size="small"
                                    checked={disableBackgroundColor}
                                    onChange={() => handleDisableColorToggle("BACKGROUND")}
                                />
                            }
                            label={
                                <Typography
                                    sx={{
                                        color: disableBackgroundColor ? "red" : "green"
                                    }}
                                >
                                    {`Background Color: ${disableBackgroundColor ? "Disabled" : "Enabled"}`}
                                </Typography>
                            }
                        />
                    </MenuItem>
                    <MenuItem>
                        <FormControlLabel control={
                            <Switch
                                size="small"
                                checked={studySetViewable}
                                onChange={() => setStudySetViewable(!studySetViewable)}
                            />
                        } label={`Viewable: ${studySetViewable ? "Public" : "Private"}`}
                        />
                    </MenuItem>
                </Menu>
            </>
        )
    }

    /**
    * Render the JSX for all the flash sets
    */
    const renderSetCards = () => {
        console.log("selectedFlashSet in renderSetCards = ", selectedFlashSet);
        const { cards } = selectedFlashSet;

        return cards.map((card, index) => {
            return <ViewFlashCard
                key={index}
                cardInfo={card}
                index={index}
                disableTextColor={disableTextColor}
                disableBackgroundColor={disableBackgroundColor}
            />
        })
    }

    /* TODO: Fix the spacing between the ViewContainer and the (first) ViewCards */
    return (
        <div className={viewFlashStyles.viewPage}>
            {
                selectedStudyMode === STUDY_MODES.FLASHCARDS ?
                    (
                        <FlashcardsStudy
                            selectedFlashSet={selectedFlashSet}
                            userAuthState={userAuthState}
                            setSelectedStudyMode={setSelectedStudyMode}
                        />
                    )
                    :
                    (
                        <div className={viewFlashStyles.viewContainer}
                            style={{ color: theme.foreground, background: theme.background }}
                        >
                            <div className={viewFlashStyles.header}>

                                <div className={`${viewFlashStyles.setInfo} ${isDarkMode ? viewFlashStyles.darkBorder : viewFlashStyles.lightBorder}`}
                                >
                                    <IconButton color="primary"
                                        aria-label="arrow backward" component="span"
                                        sx={arrowIconStyling}
                                        onClick={() => setViewFlashSet(false)}
                                    >
                                        <ArrowBack />
                                    </IconButton>

                                    <span>
                                        Back to Your Flashsets
                                    </span>

                                    <Typography
                                        variant="h5"
                                        sx={{
                                            fontWeight: "bold"
                                        }}
                                    >
                                        {selectedFlashSet.title}
                                    </Typography>

                                    <Chip label={selectedFlashSet.label ? selectedFlashSet.label : "No label selected"} variant="outlined"
                                        sx={{
                                            height: "2.5rem",
                                            color: theme.foreground
                                        }}
                                    />
                                    <Tooltip
                                        title="Create label"
                                        placement="right"
                                    >
                                        <IconButton color="primary"
                                            aria-label="arrow backward" component="span"
                                            sx={arrowIconStyling}
                                        >
                                            <Add />
                                        </IconButton>
                                    </Tooltip>

                                    {/*  */}
                                    <Typography
                                        variant="body1"
                                    >
                                        {selectedFlashSet.description}
                                    </Typography>
                                    {renderActionBar()}
                                </div>
                                <div className={viewFlashStyles.studySection}>
                                    <div className={appStyles.title}>
                                        Study
                                    </div>
                                    <div className={viewFlashStyles.studyOptions}>
                                        <div className={`${viewFlashStyles.studyButton} ${isDarkMode ? appStyles.hoverDark : appStyles.hoverLight}`}
                                            onClick={() => setSelectedStudyMode(STUDY_MODES.FLASHCARDS)}
                                        >
                                            <img src={FLASH_CARDS_IMG} height={32} width={32} />
                                            <span>Flashcards </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Typography
                                variant="h6"
                            >
                                Number of cards in this study set: {selectedFlashSet.cards.length}
                            </Typography>
                            {renderSetCards()}
                        </div>
                    )
            }
        </div>
    )
}

export default ViewFlashSet;