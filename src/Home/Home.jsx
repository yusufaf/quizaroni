import React, { useState, useEffect, useRef } from "react"
import { useSelector, useDispatch } from 'react-redux'
// import { setUserAuthState } from "../reducers/userAuthState";

/* Firebase Operations */

import { collection, query, where, getDocs } from "firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Tooltip } from '@mui/material/';
import LoginMessage from "../LoginMessage/LoginMessage";
import HomeFlashSet from "./HomeFlashSet/HomeFlashSet";
import ViewFlashSet from "./ViewFlashSet/ViewFlashSet";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as homeStyles from './Home.module.css';
import * as appStyles from "../App.module.css";

/*
    Home Component
*/
const Home = props => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    const reduxUserAuthState = useSelector((state) => state.userAuthState);

    let originalFlashSets;

    const [flashSets, setFlashSets] = useState([]);
    const [enteredSearch, setEnteredSearch] = useState("");

    const [viewFlashSet, setViewFlashSet] = useState(false);
    const [selectedFlashSet, setSelectedFlashSet] = useState({});

    const viewSetProps = {
        viewFlashSet,
        setViewFlashSet,
        selectedFlashSet,
        setSelectedFlashSet,
        userAuthState
    };

    const homeSetProps = {
        setViewFlashSet,
        setSelectedFlashSet,
        userAuthState,
    }

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    // Store a reference to the HTML file <input>
    const fileInput = useRef(null);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* */
    useEffect(() => {
        retrieveResults();
    }, [userAuthState])

    useEffect(() => {
        let searchTerm = enteredSearch.toLowerCase();
        let newFlashSets = flashSets.filter(flashSet => {
            let { title, description } = flashSet;
            title = title.toLowerCase();
            description = description.toLowerCase();
            return title.includes(searchTerm) || description.toLowerCase().includes(searchTerm);
        })

        /* Display a message when the search didn't have any results? */
        newFlashSets.length === 0 ? setFlashSets(originalFlashSets) : setFlashSets(newFlashSets);
    }, [enteredSearch])

    /* Retrieve the created flashsets for the signed-in user */
    const retrieveResults = async () => {
        if (userAuthState) {
            /* Query the database for this user's flashcards */
            const uid = userAuthState.uid;
            const flashCollection = collection(database, "flashcards");

            const queryResult = query(flashCollection, where("uid", "==", uid));

            const querySnapshot = await getDocs(queryResult);
            console.log("querySnapshot = ", querySnapshot);

            let localFlashSets = [];

            querySnapshot.forEach((doc) => {
                /* What metadata do we need for the documents in the flashcards collection? */
                const flashSet = doc.data();
                if (flashSet.cards) {
                    console.log("FlashSet found in database = ", flashSet);
                    localFlashSets.push(flashSet);
                }
            });
            originalFlashSets = localFlashSets;
            setFlashSets(localFlashSets);
        }
    }

    /* Render the search bar for the "Your Flashsets" page */
    const renderSearchBar = () => {
        return (
            <div className={homeStyles.searchContainer}>
                <input
                    className={`${homeStyles.search} ${isDarkMode ? appStyles.darkInput : appStyles.lightInput}`}
                    placeholder="Search for a study set"
                    onChange={e => setEnteredSearch(e.target.value)}
                />
            </div>
        )
    }

    /**
     * Renders the the header for the "Your Flashsets" page
     */
    const renderHeader = () => {
        return (
            <div className={homeStyles.header}>
                <span>Title</span>
                <span>Description</span>
                <span>Created on</span>
                <span style={{ marginRight: "7rem" }}>Label</span>
            </div>
        )
    }

    /**
     * Renders the flashsets for the "Your Flashsets" page
     */
    const renderFlashSets = () => {
        let localFlashSets = [...flashSets];

        return localFlashSets.map((flashSet, index) => {
            return <HomeFlashSet
                key={index}
                flashSet={flashSet}
                {...homeSetProps}
            />
        })
    }


    return (
        <>
            {!userAuthState ?
                <LoginMessage page="home" />
                :
                <>
                    {/* ViewFlashset rendered right here? */}
                    {viewFlashSet && Object.keys(selectedFlashSet).length !== 0 ?
                        <ViewFlashSet {...viewSetProps} />
                        :
                        (
                            <div className={homeStyles.flashSets} style={{ color: theme.foreground, background: theme.background }}>
                                <div className={appStyles.title}>
                                    Your Flashsets
                                </div>
                                {renderSearchBar()}
                                {renderHeader()}
                                {/* TODO: Review */}
                                {!viewFlashSet && flashSets?.length > 0 &&
                                    (
                                        <>
                                            {renderFlashSets()}
                                        </>
                                    )
                                }
                            </div>
                        )
                    }
                    {/* Message if no flash sets have bene created */}
                    {/* flashSets.length === 0 */}
                </>
            }
        </>
    );
}

export default Home;