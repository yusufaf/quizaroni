import React, { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle } from '@mui/material/';
// import { Visibility, VisibilityOff } from '@mui/icons-material/';

import * as createSetStyles from './CreateSet.module.css';
/*
    CreateSet Component
*/
const CreateSet = props => {

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    /* Flash Set States */
    const [enteredTitle, setEnteredTitle] = useState("");
    const [enteredDescription, setEnteredDescription] = useState("");

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        emailInput: false,
        passInput: false
    })


    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    return (
        <>
            <div className={createSetStyles.createPage}>
                <div className={createSetStyles.createContainer}>
                    <div className={createSetStyles.title}>
                        Create a new flash card set
                    </div>
                    <div className={createSetStyles.inputContainer}>
                        <label className={createSetStyles.inputLabel}>Title</label>
                        <input
                            className={createSetStyles.titleInput}
                            placeholder="Enter a title for your new study set"
                        />
                        <label className={createSetStyles.inputLabel}>Description</label>
                        <textarea
                            className={createSetStyles.descInput}
                            placeholder="Enter a description for your new study set"
                        />
                        <label className={createSetStyles.inputLabel}>Label</label>
                        <div className={createSetStyles.labelInputContainer}>
                            <input
                                className={createSetStyles.labelInput}
                                placeholder="Enter a label for your new study set"
                            />
                            <span> or select an existing one </span>
                            <select className={createSetStyles.labelDropdown}>
                                <option></option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className={`${createSetStyles.newCard} ${createSetStyles.firstCard}`}>
                    <div className={createSetStyles.cardIndex}>
                        <b>Card #1</b>
                    </div>

                    {/* checking if the term or description inputs are empty, same thing as login applied here  */}
                    <div className={createSetStyles.newCardInputs}>
                        <div className={createSetStyles.newCardTerm}>
                            <label className={createSetStyles.inputLabel}>Term</label>
                            <input
                                className={createSetStyles.newCardInput}
                                placeholder="Enter a term"
                            />
                        </div>
                        <div className={createSetStyles.newCardDefinition}>
                            <label className={createSetStyles.inputLabel}>Definition</label>
                            <input
                                className={createSetStyles.newCardInput}
                                placeholder="Enter a definition"
                            />
                        </div>
                    </div>
                </div>

                <div className={`${createSetStyles.newCard}`}>
                    <div className={createSetStyles.cardIndex}>
                        <b>Card #2</b>
                    </div>

                    {/* checking if the term or description inputs are empty, same thing as login applied here  */}
                    <div className={createSetStyles.newCardInputs}>
                        <div className={createSetStyles.newCardTerm}>
                            <label className={createSetStyles.inputLabel}>Term</label>
                            <input
                                className={createSetStyles.newCardInput}
                                placeholder="Enter a term"
                            />
                        </div>
                        <div className={createSetStyles.newCardDefinition}>
                            <label className={createSetStyles.inputLabel}>Definition</label>
                            <input
                                className={createSetStyles.newCardInput}
                                placeholder="Enter a definition"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}

export default CreateSet;