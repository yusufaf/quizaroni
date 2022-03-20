import { useState, useEffect, useRef } from "react"

/* Firebase Operations */
import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { database } from "../firebase/firebase";

/* Outside Components */
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Modal, Tooltip } from '@mui/material/';

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as appStyles from "../App.module.css";
// import {

// } from "../utilities/constants";

const FlashcardsStudy = props => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    

    return (
        <>
        </>
    );
}

export default FlashcardsStudy;