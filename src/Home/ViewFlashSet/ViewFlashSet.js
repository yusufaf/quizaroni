import React, { useState, useEffect } from "react"

/* Firebase Operations */
import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseApp, database } from "../../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Tooltip } from '@mui/material/';

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
       const {cards} = selectedFlashSet;

        return cards.map((card, index) => {
           console.log("card = ", card);
           
        })
    }

    return (
        <>
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
            {renderSetCards()}
        </>
    )
}

export default ViewFlashSet;