import ScrollToTopFab from 'components/ScrollToTopFab/ScrollToTopFab';
import useBrowserTitle from 'hooks/useBrowserTitle';
import {
    ChangeEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    useCreateStudyset,
    useGetStudyset,
    useUpdateStudyset,
} from 'state/api/studysetsAPI';
import { useGetUser } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import CreateSetHeader from './CreateSetHeader';
import { AddCardButton, AddCardIcon, CreateSetPage } from './CreateSetStyles';
import ImportCardsModal from './ImportCartsModal/ImportCardsModal';
import NewCardInput from './NewCardInput/NewCardInput';
import SetModificationButtons from './SetModificationButtons';
import { Virtuoso } from 'react-virtuoso';
import { EMPTY_CARD } from 'shared/constants';
import { addCard } from 'shared/utilities/createUtils';
import { Create } from '@mui/icons-material';
import NamedColorsDialog from 'components/NamedColorsDialog/NamedColorsDialog';
import { Card, Studyset } from 'shared/types';
import { SimpleFlexContainer, SpacedFlexContainer } from 'styles/AppStyles';
import { Button, SelectChangeEvent, Tooltip, Typography } from '@mui/material';
import NoCardsWarningsIcon from 'components/NoCardsWarningsIcon/NoCardsWarningsIcon';
import { useGlobalStore } from 'state/stores/global';
import { useCreateSetStore } from 'state/stores/createSet';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslation } from 'react-i18next';

type Props = {};
const CreateSet = (props: Props) => {
    /* Hooks / Redux */
    const { id: studysetUUID } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const { namedColorsDialogProps } = useGlobalStore();
    const { advancedSectionProps, setAdvancedSectionProps } =
        useCreateSetStore();

    const { data: userData = DEFAULT_USER_RESPONSE } = useGetUser();
    const { username = '', userUUID = '' } = userData.user ?? {};
    const { blankCardsCount, expanded } = advancedSectionProps;

    const {
        data: studysetResponse,
        isLoading: isStudySetLoading,
        isSuccess: isStudySetSuccess,
        isError: isStudySetError,
    } = useGetStudyset({ studysetUUID: studysetUUID ?? '' });
    const selectedStudyset = studysetResponse?.studyset ?? ({} as Studyset);

    const { mutate: createStudyset } = useCreateStudyset();
    const { mutate: updateStudyset } = useUpdateStudyset();

    /* Local State */
    const [title, setTitle] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [createdSetCards, setCreatedSetCards] = useState<Card[]>([
        { ...EMPTY_CARD, cardUUID: crypto.randomUUID() },
    ]);
    const [actionsStack, setActionsStack] = useState<any[]>([]);

    const mainButtonDisabled = useMemo(() => !title, [title]);

    /* User Input Error Checking */
    const [showErrorText, setShowErrorText] = useState({
        titleInput: false,
        descInput: false,
    });

    const [showImportModal, setShowImportModal] = useState<boolean>(false);

    useBrowserTitle('Edit');

    /* #region Drag and Drop */
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setCreatedSetCards((items) => {
                const oldIndex = items.findIndex(
                    (item) => item.cardUUID === active.id
                );
                const newIndex = items.findIndex(
                    (item) => item.cardUUID === over.id
                );

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };
    // #endregion

    /* ==== Actions Stack ==== */
    const handleUndoAction = useCallback(() => {
        const newActionsStack = [...actionsStack];
        const lastAction = newActionsStack.pop();
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
            if (event.ctrlKey && event.altKey && event.key === 'z') {
                handleUndoAction();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleUndoAction]);

    /* Loading values for editing a studyset */
    useEffect(() => {
        if (isStudySetSuccess && selectedStudyset) {
            const { cards, description, labels, title } = selectedStudyset;
            setCreatedSetCards(cards);
            setDescription(description);
            setSelectedLabels(labels || []);
            setTitle(title);
        }
    }, [selectedStudyset]);

    /**
     * Update studyset with new changes
     */
    const saveChanges = () => {
        if (!studysetUUID) {
            toast.error(t('create.missingStudysetId'), {
                position: toast.POSITION.BOTTOM_LEFT,
            });
            return;
        }

        const updatedStudyset: Studyset = {
            ...selectedStudyset,
            cards: createdSetCards,
            title,
            description,
            labels: selectedLabels,
        };

        updateStudyset(
            { studysetUUID, updates: updatedStudyset },
            {
                onSuccess: () => {
                    toast.success(t('create.successUpdate'), {
                        position: toast.POSITION.BOTTOM_LEFT,
                    });
                    navigate(`/view/${studysetUUID}`);
                },
                onError: () => {
                    toast.error(t('create.errorUpdate'), {
                        position: toast.POSITION.BOTTOM_LEFT,
                    });
                },
            }
        );
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
        return createdSetCards
            .map((_, index: number) => {
                const card = createdSetCards[index];
                if (!card) {
                    return null;
                }
                const props = {
                    actionsStack,
                    card,
                    createdSetCards,
                    index,
                    onColorChange,
                    setActionsStack,
                    setCreatedSetCards,
                    updateCardValue,
                };
                return <NewCardInput key={card.cardUUID} {...props} />;
            })
            .filter((Boolean) => Boolean);
    }, [createdSetCards]);

    /* Create Set Inputs */
    const onTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setTitle(e.target.value);
    };

    const onDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
        setDescription(e.target.value);
    };

    const onLabelsChange = (newLabels: string[]) => {
        setSelectedLabels(newLabels);
    };

    const handleAddCard = () => {
        addCard({
            createdSetCards,
            setStateCallback: setCreatedSetCards,
            actionsStack,
            setActionsStack,
        });
    };

    const handleImportCards = (importedCards: Card[]) => {
        // Append imported cards to existing cards
        setCreatedSetCards([...createdSetCards, ...importedCards]);
    };

    /* Advanced Section Functions */

    const onBlankInputsSubmit = () => {
        const newCreatedSetCards = [...createdSetCards];
        for (let i = 0; i < blankCardsCount; i++) {
            newCreatedSetCards.push({ ...EMPTY_CARD });
        }
        setCreatedSetCards(newCreatedSetCards);
        /* Clear the blank cards count input */
        setAdvancedSectionProps({
            blankCardsCount: 0,
            expanded,
        });
    };

    const headerProps = {
        advancedSectionProps: {
            onBlankInputsSubmit,
        },
        saveChanges,
        description,
        labels: selectedLabels,
        onDescriptionChange,
        onLabelsChange,
        onTitleChange,
        title,
        mainButtonDisabled,
    };

    return (
        <>
            <CreateSetPage className="create-set-page">
                <CreateSetHeader {...headerProps} />
                <SpacedFlexContainer>
                    <SimpleFlexContainer style={{ gap: '0.5rem' }}>
                        <Typography variant="h6">
                            {t('create.cardCount', {
                                count: createdSetCards.length ?? 0,
                            })}
                        </Typography>
                        {!createdSetCards.length && <NoCardsWarningsIcon />}
                    </SimpleFlexContainer>
                    <SetModificationButtons
                        studysetCards={createdSetCards}
                        setCardsCallback={setCreatedSetCards}
                        setShowImportModal={setShowImportModal}
                    />
                </SpacedFlexContainer>
                {/* TODO: Virtual Scroll */}
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={createdSetCards.map((card) => card.cardUUID)}
                        strategy={verticalListSortingStrategy}
                    >
                        {cardInputs}
                    </SortableContext>
                </DndContext>
                <AddCardButton variant="contained" onClick={handleAddCard}>
                    <AddCardIcon />
                    {t('create.addCard')}
                </AddCardButton>
                <Button
                    variant="contained"
                    onClick={saveChanges}
                    size="large"
                    disabled={mainButtonDisabled}
                    startIcon={<Create />}
                    sx={{
                        display: 'flex',
                        marginLeft: 'auto',
                        alignSelf: 'flex-end',
                    }}
                >
                    {t('create.saveChanges')}
                </Button>
            </CreateSetPage>
            {showImportModal && (
                <ImportCardsModal
                    setShowImportModal={setShowImportModal}
                    onImportCards={handleImportCards}
                />
            )}
            {namedColorsDialogProps.open && <NamedColorsDialog />}
            <ScrollToTopFab />
        </>
    );
};

export default CreateSet;
