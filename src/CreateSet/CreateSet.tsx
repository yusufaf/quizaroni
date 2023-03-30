import { Button } from "@mui/material";
import {
    addDoc,
    collection,
    getDocs,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useBrowserTitle from "src/lib/hooks/useBrowserTitle";
import { PAGES } from "src/utilities/constants";
import { database } from "../firebase/firebase";
import LoginMessage from "../LoginMessage/LoginMessage";
import { useTheme } from "../theme/useTheme";
import CreateSetHeader from "./CreateSetHeader";
import { AddCardButton, AddCardIcon, CreateSetPage } from "./CreateSetStyles";
import ImportSetModal from "./ImportSetModal/ImportSetModal";
import NewCardInput from "./NewCardInput/NewCardInput";
import { SwapHoriz, Sync as SyncIcon } from "@mui/icons-material";
import { SpacedFlexContainer } from "src/AppStyles";

const EMPTY_CARD = {
    term: "",
    definition: "",
};

const CreateSet = (props) => {
    const { userAuthState } = props;
    const { isDarkMode, theme } = useTheme();
    const navigate = useNavigate();

    /* Flash Set States */
    const [enteredTitle, setEnteredTitle] = useState("");
    const [enteredDescription, setEnteredDescription] = useState("");
    const [enteredLabel, setEnteredLabel] = useState("");
    const [selectedLabel, setSelectedLabel] = useState("");

    const [createdSetCards, setCreatedSetCards] = useState([{ ...EMPTY_CARD }]);

    const [labelOptions, setLabelOptions] = useState([]);

    const [showImportModal, setShowImportModal] = useState<boolean>(false);

    const fileInputRef = useRef(null);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false,
    });

    const createSetDisabled = !enteredTitle || !enteredDescription;

    const [advancedExpanded, setAdvancedExpanded] = useState(false);
    const [blankCardsCount, setBlankCardsCount] = useState(0);

    useBrowserTitle(PAGES.CREATE);

    useEffect(() => {
        renderLabelOptions();
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
    };

    const renderLabelOptions = () => {
        const labelsResult = retrieveLabels();

        labelsResult
            .then((labels) => {
                let blankOption = [<option key={"blank"} />];

                let labelsArray = labels.map((label, index) => {
                    return (
                        <option key={index} value={label}>
                            {label}
                        </option>
                    );
                });

                const combined = [...blankOption, labelsArray];

                setLabelOptions(combined);
            })
            .catch((error) => {
                console.log("Error caught");
            });
    };

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
                    labels: [...userData.labels].push(enteredLabel),
                });
            }
        }
    };

    /* Check that length of createdCardObjects is not 0 */
    const createNewSet = async () => {
        let createdCardObjects = [...createdSetCards];
        let allCardsHaveContent = createdCardObjects.every(
            (card) => card.term.trim() && card.definition.trim()
        );

        if (
            enteredTitle.trim() &&
            enteredDescription.trim() &&
            allCardsHaveContent
        ) {
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
                cards: createdCardObjects,
            });

            // Store the Firebase document ID as the set's "id"
            updateDoc(cardsRef, {
                setID: cardsRef.id,
            });

            if (label) {
                createNewLabel();
            }

            console.log("Successfully created new flash set");
            setTimeout(() => {
                navigate("/");
            }, 1000);
        } else {
            /* TODO: Display an alert that could not create the set, or just have it disabled wiht some state */
        }
    };

    /**
     * Verify that the term or definition input has content before creating study set
     * @param {*} event
     */
    const checkIfInputEmpty = (event) => {
        let updatedErrorText = { ...showErrorText };
        updatedErrorText[event.target.name] = event.target.value === "";
        setShowErrorText(updatedErrorText);
    };

    /* Runs everytime the file selected for the image upload changes */
    const onFileChange = (event, index) => {
        console.log("File chosen = ", event.target.files[0]);
        updateCardValue(index, "file", event.target.files[0]);
    };

    /* Delete the selected card */
    const handleDelete = (index: number) => {
        const newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards.splice(index, 1);
        setCreatedSetCards(newCreatedSetCards);
    };

    /* Adding a new card input box with a term input and description input */
    const addCreateCardInput = () => {
        const newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards.push({ ...EMPTY_CARD });
        setCreatedSetCards(newCreatedSetCards);
    };

    /**
     * Update a given card input's value in the array storing the cards
     */
    const updateCardValue = (index: number, property: string, value: any) => {
        let newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards[index][property] = value;
        setCreatedSetCards(newCreatedSetCards);
    };

    const onColorChange = (event: any, property: string, index: number) => {
        updateCardValue(index, property, event.hex);
    };

    const handleSwap = (index: number) => {
        const newCreatedSetCards = [...createdSetCards];
        let selectedCard = newCreatedSetCards[index];
        const { term, definition } = selectedCard;
        selectedCard = {
            ...selectedCard,
            term: definition,
            definition: term,
        };
        newCreatedSetCards[index] = selectedCard;
        setCreatedSetCards(newCreatedSetCards);
    };

    const handleSwapAll = () => {
        const newCreatedSetCards = createdSetCards.map((card) => {
            const { definition, term } = card;
            return {
                ...card,
                term: definition,
                definition: term,
            };
        });
        setCreatedSetCards(newCreatedSetCards);
    };

    const handleDuplicateCard = (index: number) => {
        const newCreatedSetCards = [...createdSetCards];
        const duplicateCard = { ...newCreatedSetCards[index] };
        setCreatedSetCards(newCreatedSetCards.concat(duplicateCard));
    };

    const handleReverse = () => {
        setCreatedSetCards([...createdSetCards].reverse());
    };

    /**
     * Render the JSX for all the card inputs
       Re-compute the JSX array when the "createdSetCards" prop changes. 
    */

    const cardInputs = useMemo(() => {
        return createdSetCards.map((_, index: number) => {
            const cardValues = createdSetCards[index];
            const props = {
                createdSetCards,
                fileInputRef,
                handleDelete,
                onColorChange,
                onFileChange,
                setCreatedSetCards,
                updateCardValue,
                handleSwap,
                handleDuplicateCard,
                index,
                cardValues,
                key: index,
            };
            return <NewCardInput {...props} />;
        });
    }, [createdSetCards]);

    /* Create Set Inputs */
    const onTitleChange = (e) => {
        setEnteredTitle(e.target.value);
    };

    const onDescriptionChange = (e) => {
        setEnteredDescription(e.target.value);
    };

    const onLabelChange = (e) => {
        setEnteredLabel(e.target.value);
    };

    const onSelectedLabelChange = (e) => {
        setSelectedLabel(e.target.value);
    };

    /* Advanced Section Functions */

    const toggleAdvancedSection = () => {
        setAdvancedExpanded(!advancedExpanded);
    };

    const onBlankInputsChange = (e) => {
        const newValue = e.target.value;
        setBlankCardsCount(newValue);
    };

    const onBlankInputsSubmit = () => {
        const newCreatedSetCards = [...createdSetCards];
        for (let i = 0; i < blankCardsCount; i++) {
            newCreatedSetCards.push({ ...EMPTY_CARD });
        }
        setCreatedSetCards(newCreatedSetCards);
        /* Clear the blank cards count input */
        setBlankCardsCount(0);
    };

    const advancedSectionProps = {
        blankCardsCount,
        expanded: advancedExpanded,
        onToggleExpanded: toggleAdvancedSection,
        onBlankInputsChange: onBlankInputsChange,
        onBlankInputsSubmit: onBlankInputsSubmit,
    };

    const headerProps = {
        advancedSectionProps,
        createNewSet,
        description: enteredDescription,
        label: enteredLabel,
        onDescriptionChange,
        onLabelChange,
        onSelectedLabelChange,
        onTitleChange,
        selectedLabel,
        setShowImportModal,
        title: enteredTitle,
    };

    if (!userAuthState) {
        return <LoginMessage page="createSet" />;
    }

    return (
        <>
            <CreateSetPage>
                <CreateSetHeader {...headerProps} />
                <SpacedFlexContainer style={{ gap: "2rem" }}>
                    <Button
                        variant="outlined"
                        startIcon={<SwapHoriz fontSize="medium" />}
                        onClick={handleSwapAll}
                    >
                        Swap All
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<SyncIcon fontSize="medium" />}
                        onClick={handleReverse}
                    >
                        Reverse Cards
                    </Button>
                </SpacedFlexContainer>
                {cardInputs}
                <AddCardButton variant="contained" onClick={addCreateCardInput}>
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
};

export default CreateSet;
