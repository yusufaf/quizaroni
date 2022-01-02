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
        viewFlashset,
        setViewFlashset,
        selectedFlashSet,
        setSelectedFlashSet,
        userAuthState 
    } = props;
    
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    return (
        <div>

        </div>
    )
}

export default ViewFlashSet;