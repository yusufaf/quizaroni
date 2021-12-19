import React, { useState, useEffect, useRef } from "react"
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Tooltip } from '@mui/material/';
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
    const [enteredLabel, setEnteredLabel] = useState("");


    // Array of objects?
    const [createdSetCards, setCreatedSetCards] = useState([{ term: "", definition: "" }]);

    /* Alert Popup */
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false
    })

    
    const createNewSet = () => {
        // Iterate over array of card objects
        // Check that every() object has a nonempty term and definition
        let createdCardObjects = [...createdSetCards];
        
        // Could call trim() to ensure that there's some content
        let allCardsHaveContent = createdCardObjects.every( (card, index) => {
            return card.term.trim() && card.definition.trim();
          });

        console.log("allCardsHaveContent = ", allCardsHaveContent);
        // Label as optional, not required
        if (enteredTitle.trim() && enteredDescription.trim() && allCardsHaveContent) {

        }

    }

    const checkIfInputEmpty = event => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    }

    // Delete the selected card, indices will realign
    const handleDelete = (index) => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards.splice(index, 1);
        setCreatedSetCards(newCreatedSetCards);
    }

    // Adding a new card input box with a term input and description input
    const addCreateCardInput = () => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards.push({
            term: "",
            definition: ""
        })
        setCreatedSetCards(newCreatedSetCards);
    }

    const updateCardValue = (index, type, value) => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards[index][type] = value; 

        console.log("newCreatedSetCards = ", newCreatedSetCards);
        setCreatedSetCards(newCreatedSetCards);
    }

    // Render the JSX of all the card inputs
    const renderCreateCards = () => {
        let jsx = [];

        for (const [index, val] of createdSetCards.entries()) {
            jsx.push(
                <div className={index === 0 ? `${createSetStyles.newCard} ${createSetStyles.firstCard}` : `${createSetStyles.newCard}`}>
                    <div className={createSetStyles.newCardHeader}>
                        <span><b>Card {index + 1}</b></span>
                        <Tooltip
                            title="Delete this card"
                            placement="bottom"
                            arrow={true}
                        >
                            <span className={createSetStyles.deleteCard} onClick={() => handleDelete(index)}>
                                <i className="material-icons-outlined" style={{fontSize: "2rem"}}>
                                    delete
                                </i>
                            </span>
                        </Tooltip>
                        <Tooltip
                            title="Upload an image"
                            placement="bottom"
                            arrow={true}
                        >
                            <span className={createSetStyles.uploadImage}>
                                <i className="material-icons-outlined" style={{fontSize: "2rem"}} >
                                    image
                                </i>
                            </span>
                        </Tooltip>
                    </div>
                    <div className={createSetStyles.newCardInputs}>
                        <div className={createSetStyles.newCardTerm}>
                            <label className={createSetStyles.inputLabel}>Term</label>
                            <input
                                className={createSetStyles.newCardInput}
                                placeholder="Enter a term"
                                onChange={(e) => updateCardValue(index, "term", e.target.value)}
                            />
                        </div>
                        <div className={createSetStyles.newCardDefinition}>
                            <label className={createSetStyles.inputLabel}>Definition</label>
                            <input
                                className={createSetStyles.newCardInput}
                                placeholder="Enter a definition"
                                onChange={(e) => updateCardValue(index, "definition", e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )
        }

        return jsx;
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
                    {/* ${createSetStyles.disabled} */}
                    <div className={`${createSetStyles.createSet} `}
                        onClick={() => createNewSet()}
                    >
                        <b>Create Set</b>
                    </div>
                </div>
                {/* Individual Card Inputs */}
                {renderCreateCards()}

                <div className={createdSetCards.length !== 0 ? `${createSetStyles.addCard}` : `${createSetStyles.addCard} ${createSetStyles.noInputs}`}
                    onClick={() => {
                        addCreateCardInput();
                    }}>
                    <i
                        className={`material-icons ${createSetStyles.addIcon}`}>
                        add_circle_outline
                    </i>
                    <span><b>ADD CARD</b></span>
                </div>
            </div>
        </>
    );
}

export default CreateSet;