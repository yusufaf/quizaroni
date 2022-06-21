import { useState, useEffect, useRef } from "react"

/* Firebase Operations */
import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { database } from "../firebase/firebase";

/* Outside Components */
import { useNavigate } from "react-router-dom";
import { Alert, AlertTitle, Button, IconButton, Modal, Tooltip, Typography } from '@mui/material/';
import { Create, UploadFile } from "@mui/icons-material";
import NewCardInput from "./NewCardInput/NewCardInput";
import LoginMessage from "../LoginMessage/LoginMessage";

/* Styling */
import { useTheme } from "../theme/useTheme";
import * as createSetStyles from './CreateSet.module.css';
import * as appStyles from "../App.module.css";
import {
    SUCCESS,
    SUCCESS_U,
    ERROR,
    ERROR_U,
    CREATE_SET
} from "../utilities/constants";
import { updateBrowserTitle } from "../utilities/functions";

const CreateSet = props => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();

    /* React-Router function for switching routes */
    let navigate = useNavigate();

    /* Flash Set States */
    const [enteredTitle, setEnteredTitle] = useState("");
    const [enteredDescription, setEnteredDescription] = useState("");
    const [enteredLabel, setEnteredLabel] = useState("");
    const [selectedLabel, setSelectedLabel] = useState("");

    const [createdSetCards, setCreatedSetCards] = useState([{ term: "", definition: "" }]);

    const [labelOptions, setLabelOptions] = useState([]);

    const [showImportModal, setShowImportModal] = useState(false);

    // Store a reference to the HTML file <input>
    const fileInputRef = useRef(null);

    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("");

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false
    })

    const createSetDisabled = !enteredTitle || !enteredDescription;

    useEffect(() => {
        renderLabelOptions();
        updateBrowserTitle("Create");
    }, []);

    /**
     * Retrieve the user's existing labels for the dropdown
     */
    const retrieveLabels = async () => {
        if (userAuthState) {
            const { uid } = userAuthState;
            const usersCollection = collection(database, "users");
            const queryResult = query(usersCollection, where("uid", "==", uid));
            const querySnapshot = await getDocs(queryResult);

            const userDoc = querySnapshot.docs[0];
            if (userDoc) {
                const userData = userDoc.data();
                return userData.labels;
            }
        }
    }

    const renderLabelOptions = () => {
        const labelsResult = retrieveLabels();

        labelsResult.then(labels => {
            let blankOption = [
                <option key={"blank"} />
            ];

            let labelsArray = labels.map((label, index) => {
                return <option key={index} value={label}>
                    {label}
                </option>
            });

            const combined = [...blankOption, labelsArray];

            setLabelOptions(combined);
        })
            .catch((error) => {
                console.log("Error caught");
            });
    }

    const createNewLabel = async () => {
        /* Check database if this label already exists */
        const { uid } = userAuthState;
        const usersCollection = collection(database, "users");
        const queryResult = query(usersCollection, where("uid", "==", uid));
        const querySnapshot = await getDocs(queryResult);

        const userDoc = querySnapshot.docs[0];
        if (userDoc) {
            const userData = userDoc.data();
            const userRef = userDoc.ref;
            /* Add label if it doesn't already exist for current user 
                TODO: Test if this works
            */
            if (!userData.labels.includes(enteredLabel)) {
                updateDoc(userRef, {
                    labels: [...userData.labels].push(enteredLabel)
                });
            }
        }
    }

    /* Check that length of createdCardObjects is not 0 */
    const createNewSet = async () => {
        let createdCardObjects = [...createdSetCards];
        let allCardsHaveContent = createdCardObjects.every((card) => card.term.trim() && card.definition.trim());

        if (enteredTitle.trim() && enteredDescription.trim() && allCardsHaveContent) {
            const creationDate = new Date().toLocaleDateString();
            const lastViewedDate = new Date().toLocaleDateString();
            const label = enteredLabel || "";
            const { uid } = userAuthState;

            const flashCollection = collection(database, "flashcards");

            const cardsRef = await addDoc(flashCollection, {
                title: enteredTitle,
                description: enteredDescription,
                uid,
                creationDate,
                lastViewed: lastViewedDate,
                label,
                cards: createdCardObjects
            });

            // Store the Firebase document ID as the set's "id"
            updateDoc(cardsRef, {
                setID: cardsRef.id
            })

            if (label) {
                createNewLabel();
            }

            console.log("Successfully created new flash set");

            setShowAlert(true);
            setAlertType(SUCCESS);
            setTimeout(() => {
                setShowAlert(false);
                navigate("/");
            }, 1000);
        }
        else {
            /* TODO: Display an alert that could not create the set, or just have it disabled wiht some state */
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
     * @param {*} property 
     * @param {*} value 
     */
    const updateCardValue = (index, property, value) => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards[index][property] = value;
        setCreatedSetCards(newCreatedSetCards);
    }

    /**
     * 
     * @returns 
     */
    const onColorChange = (event, index) => {
        updateCardValue(index, "textColor", event.hex);
    }

    /**
     * Render the JSX for all the card inputs
     */
    const renderCreateCards = () => {
        let props = {
            createdSetCards,
            fileInputRef,
            handleDelete,
            onColorChange,
            onFileChange,
            setCreatedSetCards,
            updateCardValue,
        };
        return createdSetCards.map((_, index) => {
            props.index = index;
            return <NewCardInput key={index} {...props} />
        })
    }

    if (!userAuthState) {
        return <LoginMessage page="createSet" />;
    }

    return (
        <>
            <div className={createSetStyles.createPage}>
                <div className={createSetStyles.createContainer}
                    style={{ color: theme.foreground, background: theme.background }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: "bold"
                        }}
                    >
                        {CREATE_SET.TITLE}
                    </Typography>
                    <div className={createSetStyles.inputContainer}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                color: "orange",
                                fontWeight: "bold"
                            }}
                        >
                            Title
                        </Typography>
                        {/* <label className={createSetStyles.inputLabel}>Title</label> */}
                        <input
                            className={`${createSetStyles.labelInput} ${isDarkMode ? `${appStyles.darkInput}` : `${appStyles.lightInput}`}`}
                            placeholder={CREATE_SET.TITLE_PLACE}
                            onChange={e => setEnteredTitle(e.target.value)}
                        />
                        <Typography
                            variant="subtitle1"
                            sx={{
                                color: "orange",
                                fontWeight: "bold"
                            }}
                        >
                            Description
                        </Typography>
                        {/* <label className={createSetStyles.inputLabel}>Description</label> */}
                        <textarea
                            className={`${createSetStyles.descInput} ${isDarkMode ? `${createSetStyles.dark} ${appStyles.darkInput}` : `${appStyles.lightInput}`}`}
                            placeholder={CREATE_SET.DESC_PLACE}
                            onChange={e => setEnteredDescription(e.target.value)}
                        />
                        <Typography
                            variant="subtitle1"
                            sx={{
                                color: "orange",
                                fontWeight: "bold"
                            }}
                        >
                            Label
                        </Typography>
                        {/* <label className={createSetStyles.inputLabel}>Label</label> */}
                        <div className={createSetStyles.labelInputContainer}>
                            <input
                                className={`${createSetStyles.labelInput} ${isDarkMode ? `${appStyles.darkInput}` : `${appStyles.lightInput}`}`}
                                placeholder={CREATE_SET.LABEL_PLACE}
                                onChange={e => setEnteredLabel(e.target.value)}
                                disabled={selectedLabel !== ""}
                            />
                            <span>or select an existing one</span>
                            <select
                                className={`${createSetStyles.labelDropdown} ${isDarkMode ? `${appStyles.darkInput}` : `${appStyles.lightInput}`}`
                                }
                                onChange={(e) => setSelectedLabel(e.target.value)}
                                disabled={enteredLabel !== ""}
                            >
                                {labelOptions}
                            </select>
                        </div>
                    </div>
                    <div>
                        <Button
                            variant="contained"
                            onClick={() => createNewSet()}
                            sx={{
                                backgroundColor: "orange",
                                color: theme.foreground,
                                fontWeight: "bold",
                                position: "absolute",
                                right: "2rem",
                                top: "2rem",
                                "&:hover": {
                                    background: "rgb(253, 187, 63)",
                                }
                            }}
                            disabled={createSetDisabled}
                        >
                            <Create
                                sx={{
                                    marginRight: "0.5rem"
                                }}
                            />
                            Create Set
                        </Button>
                        {/* {createSetDisabled
                            &&
                            <Typography>
                                yo
                            </Typography>
                        } */}
                    </div>

                    <IconButton
                        onClick={() => setShowImportModal(true)}
                    >
                        <UploadFile
                            fontSize="large"
                            sx={{
                                color: theme.foreground
                            }}
                        />
                    </IconButton>
                    <Typography variant="subtitle1"
                        component="span"
                    >
                        Import cards
                    </Typography>
                </div>
                {renderCreateCards()}

                <Button
                    variant="contained"
                    onClick={() => {
                        addCreateCardInput();
                    }}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        backgroundColor: "orange",
                        color: theme.foreground,
                        fontWeight: "bold",
                        position: "absolute",
                        right: "2rem",
                        top: "2rem",
                        "&:hover": {
                            background: "rgb(253, 187, 63)",
                        }
                    }}
                >
                    <i
                        className={`material-icons ${createSetStyles.addIcon}`}>
                        add_circle_outline
                    </i>
                    Add Card
                </Button>

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

            <Modal
                open={showImportModal}
                onClose={() => setShowImportModal(false)}
            >
                <div className={createSetStyles.importModal}
                    style={{ color: theme.foreground, background: theme.background }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: "bold"
                        }}
                    >
                        Import cards
                    </Typography>
                    {/* Option to enter the cards like Quizlet has */}
                    <textarea
                        className={`${createSetStyles.descInput} ${isDarkMode ? `${createSetStyles.dark} ${appStyles.darkInput}` : `${appStyles.lightInput}`}`}
                        placeholder="Enter a description for your new study set"
                        onChange={e => setEnteredDescription(e.target.value)}
                    />
                </div>
            </Modal>

            {showAlert &&
                <Alert
                    className={appStyles.alert}
                    severity={alertType}
                >
                    <AlertTitle>
                        <b>{alertType === SUCCESS ? SUCCESS_U : ERROR_U}</b>
                    </AlertTitle>
                    {alertType === SUCCESS ? "Set successfully created!" : "Could not create set"}
                </Alert>
            }
        </>
    );
}

export default CreateSet;