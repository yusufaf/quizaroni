import { useEffect, useState } from "react"

/* Firebase Operations */
import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { firebaseApp, database } from "../../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, FormControlLabel, Switch, Tooltip } from '@mui/material/';

import ViewFlashCard from "./ViewFlashCard";

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';
import * as appStyles from "../../App.module.css";

const ViewFlashSet = props => {
    const {
        setViewFlashSet,
        selectedFlashSet,
        setSelectedFlashSet,
        userAuthState
    } = props;

    console.log("props = ", props);

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const [showReminderModal, setShowReminderModal] = useState(false);
    const [disableTextColor, setDisableTextColor] = useState(false);
    const [disableBackgroundColor, setDisableBackgroundColor] = useState(false);


    /* Update the title of the page to include the title of the set*/
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

        if (type === "TEXT") {
            setDisableTextColor(!disableTextColor)
            if (flashDoc) {
                const docRef = flashDoc.ref;
                updateDoc(docRef, {
                    disableTextColor: !disableTextColor
                });
            }
        }
        else if (type === "BACKGROUND") {
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
            <div className={viewFlashStyles.actionBar}>
                <span className={viewFlashStyles.download} >
                    <i className={`material-icons-outlined ${appStyles.clickIcon}`}
                        onClick={() => handleDownloadSet()}
                    >
                        download
                    </i>
                    Download
                </span>

                <span className="material-icons-outlined">
                    <i className={`material-icons-outlined ${appStyles.clickIcon}`}>
                        email
                    </i>
                </span>
                {/* TODO: Replace these br tags with spacing in CSS */}
                <br></br>
                <span>
                    <FormControlLabel control={
                        <Switch
                            size="small"
                            checked={disableTextColor}
                            onChange={() => handleDisableColorToggle("TEXT")}
                        />
                    } label="Disable Text Color"
                    />
                </span>
                <br></br>
                <span>
                    <FormControlLabel control={
                        <Switch
                            size="small"
                            checked={disableBackgroundColor}
                            onChange={() => handleDisableColorToggle("BACKGROUND")}
                        />
                    } label="Disable Background Color"
                    />
                </span>

            </div>
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
            <div className={viewFlashStyles.viewContainer}
                style={{ color: theme.foreground, background: theme.background }}
            >
                <div className={appStyles.title} style={{ marginTop: "1rem" }}>
                    {selectedFlashSet.title}
                </div>

                <div>
                    {selectedFlashSet.description}
                </div>

                <span className={viewFlashStyles.backButton} onClick={() => setViewFlashSet(false)}>
                    <i className={`material-icons-outlined ${appStyles.clickIcon}`}>
                        arrow_back
                    </i>
                    Back to Your Flashsets
                </span>
                {renderActionBar()}
                <div className={viewFlashStyles.cardCount}>
                    Number of cards in this study set: {selectedFlashSet.cards.length}
                </div>
                {renderSetCards()}
            </div>
        </div>

    )
}

export default ViewFlashSet;