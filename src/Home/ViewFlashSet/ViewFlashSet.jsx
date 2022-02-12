import { useState, useEffect } from "react"

/* Firebase Operations */
import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseApp, database } from "../../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Tooltip } from '@mui/material/';

import ViewFlashCard from "./ViewFlashCard";

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as viewFlashStyles from './ViewFlashSet.module.css';
import * as appStyles from "../../App.module.css";

const ViewFlashSet = props => {
    const {
        viewFlashSet,
        setViewFlashSet,
        selectedFlashSet,
        setSelectedFlashSet,
        userAuthState
    } = props;

    console.log("props = ", props);

    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const [showReminderModal, setShowReminderModal] = useState(false);

    const handleDownloadSet = () => {

    }

    /* Ideally: Displaying a modal where a checkbox whether you want a reminder to study this flashset */
    const handleEmailReminders = () => {

    }

    const renderActionBar = () => {
        return (
            <div className={viewFlashStyles.actionBar}>
                <span>
                    <i className={`material-icons-outlined ${appStyles.clickIcon}`}>
                        download
                    </i>
                    Download
                </span>

                <span className="material-icons-outlined">
                    <i className={`material-icons-outlined ${appStyles.clickIcon}`}>
                        email
                    </i>
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
            return <ViewFlashCard key={index} cardInfo={card} index={index} />
        })
    }

    return (
        <div className={viewFlashStyles.viewPage}>
            <div className={viewFlashStyles.viewContainer}
                style={{ color: theme.foreground, background: theme.background }}
            >
                <div className={appStyles.title} style={{ marginTop: "1rem" }}>
                    {selectedFlashSet.title}
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