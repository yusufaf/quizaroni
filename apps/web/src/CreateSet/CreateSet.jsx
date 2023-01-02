import { useState, useEffect, useRef } from "react"
import { collection, addDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { database } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Modal, Select, TextField, Tooltip, Typography } from '@mui/material/';
import {
    AddCircleOutline,
    Create,
    UploadFile,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import NewCardInput from "./NewCardInput/NewCardInput";
import LoginMessage from "../LoginMessage/LoginMessage";
import ImportSetModal from "./ImportSetModal/ImportSetModal";
import { useTheme } from "../theme/useTheme";
import {
    SUCCESS,
    SUCCESS_U,
    ERROR,
    ERROR_U,
    CREATE_SET,
    PAGES
} from "src/utilities/constants";
import { updateBrowserTitle } from "src/utilities/functions";
import {
    CreateSetPage,
    CreateSetPaper,
    CreateSetContainer,
    CreateSetInputsContainer,
    DescriptionInput,
    TitleInput,
    LabelInputContainer,
    LabelInput,
    AddCardButton,
    LabelSelect,
    CreateSetButton,
    AddCardIcon,
    AdvancedSection,
    BlankInputsContainer
} from "./CreateSetStyles";
import { BoldHeading, SimpleFlexContainer } from 'src/AppStyles';
import HeaderAdvancedSection from "./HeaderAdvancedSection";

const CreateSet = props => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();
    const navigate = useNavigate();

    /* Flash Set States */
    const [enteredTitle, setEnteredTitle] = useState("");
    const [enteredDescription, setEnteredDescription] = useState("");
    const [enteredLabel, setEnteredLabel] = useState("");
    const [selectedLabel, setSelectedLabel] = useState("");

    const [createdSetCards, setCreatedSetCards] = useState([{ term: "", definition: "" }]);

    const [labelOptions, setLabelOptions] = useState([]);

    const [showImportModal, setShowImportModal] = useState(false);

    const fileInputRef = useRef(null);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false
    })

    const createSetDisabled = !enteredTitle || !enteredDescription;

    const [advancedExpanded, setAdvancedExpanded] = useState(false);
    const [blankCardsCount, setBlankCardsCount] = useState(0);
    // Could do an object for the state instead


    useEffect(() => {
        renderLabelOptions();
        updateBrowserTitle(PAGES.CREATE);
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
            setTimeout(() => {
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
        const newCreatedSetCards = [...createdSetCards];
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

    const toggleAdvancedSection = () => {
        setAdvancedExpanded(!advancedExpanded);
    }

    const onBlankInputsChange = (e) => {
        const newValue = e.target.value;
        setBlankCardsCount(newValue);
    }

    const onBlankInputsSubmit = (e) => {
        let newCreatedSetCards = [...createdSetCards];
        const newInput = {
            term: "",
            definition: ""
        };
        for (let i = 0; i < blankCardsCount; i++) {
            newCreatedSetCards.push(newInput);
        }
        setCreatedSetCards(newCreatedSetCards);
        setBlankCardsCount(0);
    }


    if (!userAuthState) {
        return <LoginMessage page="createSet" />;
    }

    return (
        <>
            <CreateSetPage>

                <CreateSetPaper elevation={6}>
                    <CreateSetContainer>
                        <BoldHeading variant="h5">
                            {CREATE_SET.TITLE}
                        </BoldHeading>
                        <CreateSetInputsContainer>
                            <BoldHeading
                                variant="subtitle1"
                                color={theme.palette.primary.main}
                            >
                                Title
                            </BoldHeading>
                            <TitleInput
                                variant="standard"
                                placeholder={CREATE_SET.TITLE_PLACEHOLDER}
                                // label="Title"
                                value={enteredTitle}
                                onChange={e => setEnteredTitle(e.target.value)}
                                size="small"
                            />
                            <BoldHeading
                                variant="subtitle1"
                                color={theme.palette.primary.main}
                            >
                                Description
                            </BoldHeading>
                            <DescriptionInput
                                variant="outlined"
                                placeholder={CREATE_SET.DESC_PLACEHOLDER}
                                value={enteredDescription}
                                onChange={e => setEnteredDescription(e.target.value)}
                                multiline
                                maxRows={4}
                            />
                            <BoldHeading
                                variant="subtitle1"
                                color={theme.palette.primary.main}
                            >
                                Label
                            </BoldHeading>
                            <LabelInputContainer>
                                <LabelInput
                                    variant="standard"
                                    size="small"
                                    placeholder={CREATE_SET.LABEL_PLACEHOLDER}
                                    onChange={e => setEnteredLabel(e.target.value)}
                                    disabled={selectedLabel !== ""}
                                />
                                <Typography component="span">or select an existing one</Typography>
                                <FormControl variant="standard">
                                    <InputLabel>Label</InputLabel>
                                    <LabelSelect
                                        value={selectedLabel}
                                        // @ts-ignore
                                        onChange={(e) => setSelectedLabel(e.target.value)}
                                    >
                                        {/* TODO: Always leave an empty option so they don't have to pick one */}
                                        {/* Width of 10rem for the MenuItem */}
                                        <MenuItem value={10} sx={{ width: "10rem" }} >
                                            <Typography variant="inherit" noWrap>
                                                TenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTenTen
                                            </Typography>
                                        </MenuItem>
                                    </LabelSelect>
                                </FormControl>
                                {/* TODO: Map labelOptions to MenuItem */}
                            </LabelInputContainer>
                            <CreateSetButton
                                variant="contained"
                                onClick={() => createNewSet()}
                                size="large"
                                disabled={createSetDisabled}
                                startIcon={<Create />}
                            >
                                Create Set
                            </CreateSetButton>
                        </CreateSetInputsContainer>
                        <SimpleFlexContainer>
                            <IconButton
                                onClick={() => setShowImportModal(true)}
                            >
                                <UploadFile
                                    fontSize="large"
                                />
                            </IconButton>
                            <Typography>
                                Import Cards
                            </Typography>
                        </SimpleFlexContainer>
                        <HeaderAdvancedSection
                            blankCardsCount={blankCardsCount}
                            expanded={advancedExpanded}
                            onToggleExpanded={toggleAdvancedSection}
                            onBlankInputsChange={onBlankInputsChange}
                            onBlankInputsSubmit={onBlankInputsSubmit}
                        />
                    </CreateSetContainer>
                </CreateSetPaper>

                {renderCreateCards()}
                <AddCardButton
                    variant="contained"
                    onClick={() => {
                        addCreateCardInput();
                    }}
                >
                    <AddCardIcon />
                    Add Card
                </AddCardButton>
            </CreateSetPage>
            <ImportSetModal
                open={showImportModal}
                onClose={() => setShowImportModal(false)}
            />
        </>
    );
}

export default CreateSet;