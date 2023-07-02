import ScrollToTopFab from "components/ScrollToTopFab/ScrollToTopFab";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import { InitialCard } from "lib/types";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
    useCreateStudysetMutation,
    useGetStudysetQuery,
} from "state/api/studysets";
import {
    selectAuthenticated,
    selectCognitoUser,
    selectUserData,
} from "state/slices/globalSlice";
import { useTheme } from "theme/useTheme";
import { CREATE_PAGE_TYPES, PAGES } from "utilities/constants";
import { v4 as uuidv4 } from "uuid";
import LoginMessage from "views/LoginMessage/LoginMessage";
import CreateSetHeader from "./CreateSetHeader";
import { AddCardButton, AddCardIcon, CreateSetPage } from "./CreateSetStyles";
import ImportSetModal from "./ImportSetModal/ImportSetModal";
import NewCardInput from "./NewCardInput/NewCardInput";
import SetModificationButtons from "./SetModificationButtons";

const EMPTY_CARD: InitialCard = {
    term: "",
    definition: "",
    uuid: uuidv4(),
};

type Props = {
    pageType?: string;
};

const CreateSet = (props: Props) => {
    const { pageType = "Create" } = props;

    const isCreatePage = pageType === CREATE_PAGE_TYPES.CREATE;
    const isEditPage = pageType === CREATE_PAGE_TYPES.EDIT;

    /* Hooks / Redux */
    const { id: studySetUUID } = useParams();
    const { isDarkMode, theme } = useTheme();
    const navigate = useNavigate();

    const authenticated = useSelector(selectAuthenticated);
    const cognitoUser = useSelector(selectCognitoUser);
    const userData = useSelector(selectUserData);

    const {
        data: selectedStudySet,
        isLoading: isStudySetLoading,
        isSuccess: isStudySetSuccess,
        isError: isStudySetError,
    } = useGetStudysetQuery(studySetUUID ?? "", {
        skip: !studySetUUID,
    });

    const [createStudySet] = useCreateStudysetMutation();

    useEffect(() => {
        if (isStudySetSuccess && selectedStudySet) {
            const { label, title, description, cards } = selectedStudySet;
            setEnteredLabel(label);
            setTitle(title);
            setDescription(description);
            setCreatedSetCards(cards);
        }
    }, [selectedStudySet]);

    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [enteredLabel, setEnteredLabel] = useState<string>("");
    const [selectedLabel, setSelectedLabel] = useState<string>("");
    const [createdSetCards, setCreatedSetCards] = useState([{ ...EMPTY_CARD }]);

    const [labelOptions, setLabelOptions] = useState([]);

    const [showImportModal, setShowImportModal] = useState<boolean>(false);

    const fileInputRef = useRef(null);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false,
    });

    const createSetDisabled = !title || !description;

    const [advancedExpanded, setAdvancedExpanded] = useState(false);
    const [blankCardsCount, setBlankCardsCount] = useState(0);

    useBrowserTitle(PAGES.CREATE);

    /**

    /* Check that length of createdCardObjects is not 0 */
    const createNewSet = async () => {
        try {
            const cards = [...createdSetCards];

            if (cards.length === 0) {
                return;
            }

            // const allCardsHaveContent = createdCardObjects.every(
            //     (card) => card.term.trim() && card.definition.trim()
            // );

            const createdAt = new Date().getTime();
            const lastViewed = new Date().getTime();
            const label = enteredLabel || "";
            // const { username } = cognitoUser;
            const { username, uuid: userUUID } = userData;
            const metadata = {};

            const studySet = {
                cards,
                createdAt,
                description,
                label,
                lastViewed,
                metadata,
                title,
                username,
                userUUID,
            };

            console.log({ cards, cognitoUser, studySet });
            // if (label) {
            //     createNewLabel();
            // }

            console.log("Successfully created new flash set");

            createStudySet(studySet)
                .unwrap()
                .then((response: any) => {
                    console.log({ response });
                    toast.success("Successfully created new study set", {
                        position: toast.POSITION.BOTTOM_LEFT,
                    });
                    const { studySet } = response;
                    const { uuid } = studySet;
                    navigate(`/view/${uuid}`);
                })
                .catch((error) => {
                    console.log({ error });
                    toast.error("Error creating new study set", {
                        position: toast.POSITION.BOTTOM_LEFT,
                    });
                });
        } catch (error) {}
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
        newCreatedSetCards.push({ ...EMPTY_CARD, uuid: uuidv4() });
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

    const handleDuplicateCard = (index: number) => {
        const newCreatedSetCards = [...createdSetCards];
        const duplicateCard = { ...newCreatedSetCards[index] };
        setCreatedSetCards(newCreatedSetCards.concat(duplicateCard));
    };

    const handleAddCardBelow = (index: number) => {
        const newCreatedSetCards = [...createdSetCards];
        newCreatedSetCards.splice(index + 1, 0, { ...EMPTY_CARD });
        setCreatedSetCards(newCreatedSetCards);
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
                handleAddCardBelow,
                index,
                cardValues,
                key: index,
            };
            return <NewCardInput {...props} />;
        });
    }, [createdSetCards]);

    /* Create Set Inputs */
    const onTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const onDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
        setDescription(e.target.value);
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

    const onBlankInputsChange = (e: any) => {
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
        onBlankInputsChange,
        onBlankInputsSubmit,
    };

    const headerProps = {
        advancedSectionProps,
        createNewSet,
        description: description,
        label: enteredLabel,
        onDescriptionChange,
        onLabelChange,
        onSelectedLabelChange,
        onTitleChange,
        selectedLabel,
        setShowImportModal,
        title: title,
        pageType,
    };

    if (!authenticated) {
        return <LoginMessage page="createSet" />;
    }

    return (
        <>
            <CreateSetPage>
                <CreateSetHeader {...headerProps} />
                <SetModificationButtons
                    studysetCards={createdSetCards}
                    setCardsCallback={setCreatedSetCards}
                    setShowImportModal={setShowImportModal}
                />
                {/* TODO: Virtual Scroll */}
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
            <ScrollToTopFab />
        </>
    );
};

export default CreateSet;
