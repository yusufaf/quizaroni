import ScrollToTopFab from "components/ScrollToTopFab/ScrollToTopFab";
import useBrowserTitle from "lib/hooks/useBrowserTitle";
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
    useCreateStudysetMutation,
    useGetStudysetQuery,
    useUpdateStudysetMutation,
} from "state/api/studysetsAPI";
import {
    selectAuthenticated,
    selectNamedColorsDialogProps,
} from "state/slices/globalSlice";
import { useTheme } from "theme/useTheme";
import {
    CREATE_PAGE_PROPS,
    CREATE_PAGE_TYPES,
    DEFAULT_USER_DATA,
    DEFAULT_USER_RESPONSE,
    PAGES,
} from "utilities/constants";
import LoginMessage from "views/LoginMessage/LoginMessage";
import CreateSetHeader from "./CreateSetHeader";
import {
    AddCardButton,
    AddCardIcon,
    PageMainButton,
    CreateSetPage,
} from "./CreateSetStyles";
import ImportSetModal from "./ImportSetModal/ImportSetModal";
import NewCardInput from "./NewCardInput/NewCardInput";
import SetModificationButtons from "./SetModificationButtons";
import { Virtuoso } from "react-virtuoso";
import { EMPTY_CARD } from "utilities/constants";
import { addCard } from "utilities/createUtils";
import { Create } from "@mui/icons-material";
import {
    selectShowImportModal,
    setShowImportModal,
    selectAdvancedSectionProps,
    setAdvancedSectionProps,
} from "state/slices/createSetSlice";
import NamedColorsDialog from "components/NamedColorsDialog/NamedColorsDialog";
import { Card, Studyset } from "lib/types";
import { SimpleFlexContainer, SpacedFlexContainer } from "common/AppStyles";
import { SelectChangeEvent, Tooltip, Typography } from "@mui/material";
import { useGetUserQuery } from "state/api/usersAPI";
import NoCardsWarningsIcon from "components/NoCardsWarningsIcon/NoCardsWarningsIcon";

type Props = {
    pageType?: "Create" | "Edit";
};
const CreateSet = ({ pageType = "Create" }: Props) => {
    const pageProps = CREATE_PAGE_PROPS[pageType];

    /* Hooks / Redux */
    const { id: studysetUUID } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const authenticated = useSelector(selectAuthenticated);

    const { data: { user: {username = "", userUUID = ""} } = DEFAULT_USER_RESPONSE } = useGetUserQuery();
    const namedColorsDialogProps = useSelector(selectNamedColorsDialogProps);
    const { blankCardsCount, expanded } = useSelector(
        selectAdvancedSectionProps
    );

    const {
        data: selectedStudySet,
        isLoading: isStudySetLoading,
        isSuccess: isStudySetSuccess,
        isError: isStudySetError,
    } = useGetStudysetQuery(
        { studysetUUID: studysetUUID ?? "" },
        {
            skip: !studysetUUID,
        }
    );

    const [createStudySet] = useCreateStudysetMutation();
    const [updateStudySet] = useUpdateStudysetMutation();

    /* Local State */
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [enteredLabel, setEnteredLabel] = useState<string | null>(null);
    const [selectedLabel, setSelectedLabel] = useState<string>("");
    const [createdSetCards, setCreatedSetCards] = useState<Card[]>([
        { ...EMPTY_CARD },
    ]);
    const [actionsStack, setActionsStack] = useState<any[]>([]);

    const mainButtonDisabled = useMemo(() => !title, [title]);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false,
    });

    useBrowserTitle(pageType);

    /* ==== Actions Stack ==== */
    const handleUndoAction = useCallback(() => {
        const newActionsStack = [...actionsStack];
        const lastAction = newActionsStack.pop();
        console.log("ENTERED HANDLEUNDO", {
            newActionsStack,
            lastAction,
            createdSetCards,
        });
        if (!lastAction) {
            return newActionsStack;
        }
        const { undoCallback } = lastAction;
        undoCallback(createdSetCards, setCreatedSetCards);

        return newActionsStack;
    }, [createdSetCards, actionsStack]);

    /* */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.altKey && event.key === "z") {
                handleUndoAction();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [handleUndoAction]);

    /* Loading values for editing a studyset */
    useEffect(() => {
        console.log("editing stuff ", { isStudySetSuccess, selectedStudySet });
        if (isStudySetSuccess && selectedStudySet) {
            const { label, title, description, cards } = selectedStudySet;
            setEnteredLabel(label);
            setTitle(title);
            setDescription(description);
            setCreatedSetCards(cards);
        }
    }, [selectedStudySet]);

    /**
     * Create a new studyset
     */
    const createNewSet = () => {
        const cards = [...createdSetCards];

        // TODO: Re-visit allowing user to create study set with no cards
        // if (cards.length === 0) {
        //     return;
        // }

        // const allCardsHaveContent = createdCardObjects.every(
        //     (card) => card.term.trim() && card.definition.trim()
        // );

        const timestamp = new Date().getTime();
        const label = (enteredLabel ?? selectedLabel) || null;
        const metadata = {};

        const studySet = {
            cards,
            createdAt: timestamp,
            description,
            label,
            lastViewed: timestamp,
            metadata,
            title,
            username,
            userUUID,
        };

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
    };

    /**
     * Update studyset with new changes
     */
    const saveChanges = () => {
        console.log({ selectedStudySet, title, description });

        // TODO: Fix typing with cards array

        // @ts-ignore
        let studyset: Studyset = {
            ...selectedStudySet,
            // cards: createdSetCards,
            title,
            description,
        };

        updateStudySet({ studyset })
            .unwrap()
            .then((response: any) => {
                console.log({ response });
                toast.success("Successfully updating study set", {
                    position: toast.POSITION.BOTTOM_LEFT,
                });
                navigate(`/view/${studysetUUID}`);
            })
            .catch((error) => {
                console.log({ error });
                toast.error("Error updating study set", {
                    position: toast.POSITION.BOTTOM_LEFT,
                });
            });
    };

    const handleMainButton = () => {
        switch (pageType) {
            case CREATE_PAGE_TYPES.CREATE:
                createNewSet();
                return;
            case CREATE_PAGE_TYPES.EDIT:
                saveChanges();
                return;
        }
    };

    /**
     * Update a given card input's value in the array storing the cards
     */
    const updateCardValue = (index: number, property: string, value: any) => {
        const newCreatedSetCards = [...createdSetCards];
        const newCard = { ...newCreatedSetCards[index] };
        newCard[property] = value;
        newCreatedSetCards[index] = newCard;
        setCreatedSetCards(newCreatedSetCards);
    };

    const onColorChange = (event: any, property: string, index: number) => {
        updateCardValue(index, property, event.hex);
    };

    /**
     * Render the JSX for all the card inputs
       Re-compute the JSX array when the "createdSetCards" prop changes. 
    */
    const cardInputs = useMemo(() => {
        return createdSetCards.map((_, index: number) => {
            const cardValues = createdSetCards[index];
            const props = {
                actionsStack,
                cardValues,
                createdSetCards,
                index,
                key: cardValues.uuid,
                onColorChange,
                setActionsStack,
                setCreatedSetCards,
                updateCardValue,
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

    const onLabelChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEnteredLabel(e.target.value);
    };

    const onSelectedLabelChange = (e: SelectChangeEvent) => {
        const newSelectedLabelValue = e.target.value;
        if (newSelectedLabelValue !== "") {
            setEnteredLabel(e.target.value);
        }
        setSelectedLabel(e.target.value);
    };
    
    const handleAddCard = () => {
        addCard({
            createdSetCards,
            setStateCallback: setCreatedSetCards,
            actionsStack,
            setActionsStack,
        })
    }

    /* Advanced Section Functions */

    const onBlankInputsSubmit = () => {
        const newCreatedSetCards = [...createdSetCards];
        for (let i = 0; i < blankCardsCount; i++) {
            newCreatedSetCards.push({ ...EMPTY_CARD });
        }
        setCreatedSetCards(newCreatedSetCards);
        /* Clear the blank cards count input */
        dispatch(
            setAdvancedSectionProps({
                blankCardsCount: 0,
                expanded,
            })
        );
    };

    const headerProps = {
        advancedSectionProps: {
            onBlankInputsSubmit,
        },
        handleMainButton,
        description,
        label: enteredLabel,
        onDescriptionChange,
        onLabelChange,
        onSelectedLabelChange,
        onTitleChange,
        selectedLabel,
        title,
        pageType,
        mainButtonDisabled,
    };

    if (!authenticated) {
        return <LoginMessage page="createSet" />;
    }

    return (
        <>
            <CreateSetPage>
                <CreateSetHeader {...headerProps} />
                <SpacedFlexContainer>
                    <SimpleFlexContainer style={{ gap: "0.5rem" }}>
                        <Typography variant="h6">
                            Number of cards in this study set:{" "}
                            {createdSetCards.length ?? "N/A"}
                        </Typography>
                        {!createdSetCards.length && <NoCardsWarningsIcon />}
                    </SimpleFlexContainer>
                    <SetModificationButtons
                        studysetCards={createdSetCards}
                        setCardsCallback={setCreatedSetCards}
                    />
                </SpacedFlexContainer>
                {/* TODO: Virtual Scroll */}
                {cardInputs}
                <AddCardButton
                    variant="contained"
                    onClick={handleAddCard}
                >
                    <AddCardIcon />
                    Add Card
                </AddCardButton>
                <PageMainButton
                    variant="contained"
                    onClick={handleMainButton}
                    size="large"
                    disabled={mainButtonDisabled}
                    startIcon={<Create />}
                    sx={{
                        display: "flex",
                        marginLeft: "auto",
                        alignSelf: "flex-end",
                    }}
                >
                    {pageProps.BUTTON}
                </PageMainButton>
            </CreateSetPage>
            <ImportSetModal />
            {namedColorsDialogProps.open && <NamedColorsDialog />}
            <ScrollToTopFab />
        </>
    );
};

export default CreateSet;
