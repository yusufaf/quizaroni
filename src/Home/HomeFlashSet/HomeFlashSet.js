import React, { useState, useEffect } from "react"

/* Firebase Operations */

import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseApp, database } from "../../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Tooltip } from '@mui/material/';

/* Styling */
import { useTheme } from "../../theme/useTheme";
import * as homeFlashStyles from './HomeFlashSet.module.css';
import * as appStyles from "../../App.module.css";

const HomeFlashSet = props => {
    const { userAuthState } = props;
    const {
        cards,
        creationDate,
        title,
        description,
        label,
        uid
    } = props.flashSet;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    return (
        <div
            className={`${homeFlashStyles.flashSet} ${isDarkMode ? `${appStyles.hoverDark} ${appStyles.darkInput}` : `${appStyles.hoverLight} ${appStyles.lightInput}`}`}
            key={uid}
            // onClick={() => }
        >
            <div className={homeFlashStyles.data}>{title}</div>
            <div className={homeFlashStyles.data}>{description}{description}{description}{description}</div>
            <div className={homeFlashStyles.data}>{creationDate}</div>
            <div className={homeFlashStyles.data}>{label || "N/A"}</div>
        </div>
    )
}

export default HomeFlashSet;