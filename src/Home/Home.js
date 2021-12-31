import React, { useState, useEffect, useRef } from "react"

/* Firebase Operations */

import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Tooltip } from '@mui/material/';
import LoginMessage from "../LoginMessage/LoginMessage";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as homeStyles from './Home.module.css';
import * as appStyles from "../App.module.css";

/*
    CreateSet Component
*/
const Home = props => {
    const { userAuthState } = props;
    const { isDarkMode, toggleDarkMode, theme } = useTheme();

    const [flashSets, setFlashSets] = useState([]);

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    useEffect(() => {
        retrieveResults();
    }, [userAuthState])

    const retrieveResults = async () => {
        /* Query the database for this user's flashcards */
        const uid = userAuthState.uid;
        const flashCollection = collection(database, "flashcards");

        const queryResult = query(flashCollection, where("uid", "==", uid));

        const querySnapshot = await getDocs(queryResult);
        console.log("querySnapshot = ", querySnapshot);

        let localFlashSets = [];

        querySnapshot.forEach((doc) => {
            /* What metadata do we need for the documents in the flashcards collection */
            const flashSet = doc.data();
            if (flashSet.cards) {
                console.log(flashSet);
                localFlashSets.push(flashSet);
            }
        });
        setFlashSets(localFlashSets);
    }

    const renderFlashSets = () => {
        let localFlashSets = [...flashSets];
        let jsx = []

        console.log("localFlashsets = ", localFlashSets);
        for (const flashSet of localFlashSets) {
            const {cards, creationDate, description, title, uid} = flashSet;            
            // jsx.push(HomeFlashSet flashSet={flashSet}>);
        }

        return jsx;
    }


    return (
        <>
            {!userAuthState ?
                <LoginMessage page="home" />
                :
                (
                    <div className={homeStyles.flashSets} style={{ color: theme.foreground, background: theme.background }}>
                        <div className={appStyles.title}>
                            Your Flashsets
                        </div>
                        {flashSets.length > 0 &&
                            renderFlashSets()
                        }
                    </div>
                )
            }
        </>
    );
}

export default Home;