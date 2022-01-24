import React, { useState, useEffect, useRef } from "react"

/* Firebase Operations */
import { collection, addDoc } from "firebase/firestore";
import { firebaseApp, database } from "../firebase/firebase";

/* Outside Components */
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Tooltip } from '@mui/material/';
import NewCardInput from "./NewCardInput/NewCardInput";
import LoginMessage from "../LoginMessage/LoginMessage";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as createSetStyles from './CreateSet.module.css';
import * as appStyles from "../App.module.css";
import * as C from "../utilities/constants";

/*
    CreateSet Component
*/
const CreateSet = props => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    /* Flash Set States */
    const [enteredTitle, setEnteredTitle] = useState("");
    const [enteredDescription, setEnteredDescription] = useState("");
    const [enteredLabel, setEnteredLabel] = useState("");

    const [createSetEnabled, setCreateSetEnabled] = useState(false);
    const [createdSetCards, setCreatedSetCards] = useState([{ term: "", definition: "" }]);

    // Store a reference to the HTML file <input>
    const fileInputRef = useRef(null);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false
    })

    /* Check that length of createdCardObjects is not 0 */
    const createNewSet = async () => {
        let createdCardObjects = [...createdSetCards];

        /* trim() on each input to ensure that there's some content */
        let allCardsHaveContent = createdCardObjects.every((card) => card.term.trim() && card.definition.trim());

        /* Label as optional, not required */
        if (enteredTitle.trim() && enteredDescription.trim() && allCardsHaveContent) {
            const creationDate = new Date().toLocaleDateString();
            const label = enteredLabel || "";
            const uid = userAuthState.uid;

            const flashCollection = collection(database, "flashcards");
            const cardsRef = await addDoc(flashCollection, {
                title: enteredTitle,
                description: enteredDescription,
                uid,
                creationDate,
                label,
                cards: createdCardObjects
            });
            console.log("Successfully created new flash set");

            setShowAlert(true);
            setAlertType("error");
            setTimeout(() => {
                setShowAlert(false);
                // Redirect user to their home page after
                navigate("/");
            }, 1000);
        }
        else {
            /* Display an alert that could not create the set, or just have it disabled wiht some state */
        }
    }

    /**
     * Verify that the term or definition input has content before creating study set
     * @param {*} event 
     */
    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    /* Runs everytime the file selected for the image upload changes */
    const onFileChange = (event, index) => {
        console.log("File chosen = ", event.target.files[0]);
        updateCardValue(index, "file", event.target.files[0]);
    }

    /**
     * Delete the selected card
     * @param {*} index 
     */
    const handleDelete = (index) => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards.splice(index, 1);
        setCreatedSetCards(newCreatedSetCards);
    }

    /* Adding a new card input box with a term input and description input */
    const addCreateCardInput = () => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards.push({
            term: "",
            definition: ""
        })
        setCreatedSetCards(newCreatedSetCards);
    }

    /**
     * Update a given card input's value in the array storing the cards
     * @param {*} index 
     * @param {*} type 
     * @param {*} value 
     */
    const updateCardValue = (index, type, value) => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards[index][type] = value;

        console.log("newCreatedSetCards = ", newCreatedSetCards);
        setCreatedSetCards(newCreatedSetCards);
    }

    /**
     * 
     * @returns 
     */
    const onColorChange = (event) => {
        // console.log("color = ", color);
        console.log("event = ", event);
    }

    /**
     * Render the JSX for all the card inputs
     */
    const renderCreateCards = () => {
        let jsx = [];
        for (const [index, value] of createdSetCards.entries()) {
            const props = {
                createdSetCards,
                fileInputRef,
                handleDelete,
                index,
                onColorChange,
                onFileChange,
                setCreatedSetCards,
                updateCardValue,
            };
            jsx.push(<NewCardInput key={index} {...props} />)
        }
        return jsx;
    }

    return (
        <>
            {!userAuthState ?
                <LoginMessage page="createSet" />
                :
                (
                    <div className={createSetStyles.createPage}>
                        <div className={createSetStyles.createContainer}
                            style={{ color: theme.foreground, background: theme.background }}
                        >
                            <div className={createSetStyles.title}>
                                Create a new flash card set
                            </div>
                            <div className={createSetStyles.inputContainer}>
                                <label className={createSetStyles.inputLabel}>Title</label>
                                <input
                                    className={`${createSetStyles.labelInput} ${isDarkMode ? `${appStyles.darkInput}` : `${appStyles.lightInput}`}`}                                    
                                    placeholder="Enter a title for your new study set"
                                    onChange={e => setEnteredTitle(e.target.value)}
                                />
                                <label className={createSetStyles.inputLabel}>Description</label>
                                <textarea
                                    className={`${createSetStyles.descInput} ${isDarkMode ? `${createSetStyles.dark} ${appStyles.darkInput}` : `${appStyles.lightInput}`}`}
                                    placeholder="Enter a description for your new study set"
                                    onChange={e => setEnteredDescription(e.target.value)}
                                />
                                <label className={createSetStyles.inputLabel}>Label</label>
                                <div className={createSetStyles.labelInputContainer}>
                                    <input
                                        className={`${createSetStyles.labelInput} ${isDarkMode ? `${appStyles.darkInput}` : `${appStyles.lightInput}`}`}
                                        placeholder="Enter a label for your new study set"
                                        onChange={e => setEnteredLabel(e.target.value)}
                                    />
                                    <span>or select an existing one</span>
                                    <select className={`${createSetStyles.labelDropdown} ${isDarkMode ? `${appStyles.darkInput}` : `${appStyles.lightInput}`}`}
                                    >
                                        {/* renderLabelOptions() - Specific to a user */}
                                        <option></option>
                                    </select>
                                </div>
                            </div>
                            {/* ${createSetStyles.disabled} */}
                            <button
                                tabIndex="0"
                                className={`${createSetStyles.createSet}`}
                                onClick={() => createNewSet()}
                            >
                                Create Set
                            </button>
                        </div>
                        {/* Individual Card Inputs */}
                        {renderCreateCards()}

                        <button
                            className={createdSetCards.length !== 0 ? `${createSetStyles.addCard}` : `${createSetStyles.addCard} ${createSetStyles.noInputs}`}
                            onClick={() => {
                                addCreateCardInput();
                            }}>
                            <i
                                className={`material-icons ${createSetStyles.addIcon}`}>
                                add_circle_outline
                            </i>
                            Add Card
                        </button>
                    </div>
                )
            }

            {showAlert &&
                <Alert
                    className={appStyles.alert}
                    severity={alertType}
                >
                    <AlertTitle>
                        <b>{alertType === C.SUCCESS ? C.SUCCESS_U : C.ERROR_U}</b>
                    </AlertTitle>
                    {alertType === C.SUCCESS ? "Successfully logged in!" : "Could not login, check email and password"}
                </Alert>
            }
        </>
    );
}

export default CreateSet;