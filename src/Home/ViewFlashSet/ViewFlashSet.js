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
                    <i className="material-icons-outlined" style={{ fontSize: "2rem", cursor: "pointer" }}>
                        download
                    </i>
                    Download
                </span>

                <span className="material-icons-outlined">
                    <i className="material-icons-outlined" style={{ fontSize: "2rem", cursor: "pointer" }}>
                        email
                    </i>
                </span>
            </div>
        )
    }

    /**
     * Renders the back button
     */
    const renderBackButton = () => {
        return (
            <span className={viewFlashStyles.backButton} onClick={() => setViewFlashSet(false)}>
                <i className="material-icons-outlined" style={{ fontSize: "2rem", cursor: "pointer" }}>
                    arrow_back
                </i>
                Back to Your Flashsets
            </span>
        )
    }

    return (
        <>
            <div className={appStyles.title} style={{ marginTop: "1rem" }}>
                {selectedFlashSet.title}
            </div>
            {renderBackButton()}
            {renderActionBar()}
        </>
    )
}

export default ViewFlashSet;