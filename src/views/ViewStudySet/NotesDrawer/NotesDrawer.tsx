import {
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
    MenuOpen as MenuOpenIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    Fab,
    Tooltip,
} from '@mui/material/';
import {
    BoldTypography,
    SimpleFlexContainer,
    SpacedFlexContainer,
} from 'styles/AppStyles';
import CloseDialogButton from 'components/StandardDialogTitle/StandardDialogTitle';
import useCustomMutation from 'hooks/useCustomMutation';
import { Card, OpenCardNotes, Studyset, UUID } from 'shared/types';
import { useMemo, useState } from 'react';
import {
    useCreateNoteMutation,
    useEditNoteMutation,
} from 'state/api/studysetsAPI';
import { NOTES_DRAWER_INITIAL_APPEARANCE } from 'shared/constants';
import NotesList from './NotesList';
import { StyledDrawer } from './styles';

type Props = {
    selectedStudyset: Studyset;
};

const transitionDuration = 1000; //can also use theme.transitions.duration

const NotesDrawer = (props: Props) => {
    const { selectedStudyset } = props;

    const {
        studysetUUID = '',
        metadata: {
            notesDrawerInitial = '',
            notesDrawerPosition = 'right',
        } = {},
    } = selectedStudyset || {};

    // TODO: Doesn't work on initial load as expected
    const [hidden, setHidden] = useState<boolean>(
        notesDrawerInitial === NOTES_DRAWER_INITIAL_APPEARANCE.CLOSED
    );
    const [openNotes, setOpenNotes] = useState<OpenCardNotes>(new Set());
    const [currentEditKey, setCurrentEditKey] = useState<string>('');

    const [noteActionsStack, setNoteActionsStack] = useState([]);

    const {
        mutate: createNote,
        isLoading: isCreateNoteLoading,
        isSuccess: isCreateNoteSuccess,
        isError: isCreateNoteError,
    } = useCustomMutation({
        mutation: useCreateNoteMutation,
        successMessage: 'Successfully created note',
        errorMessage: 'Error creating note',
    });

    const {
        mutate: editNote,
        isLoading: isEditNoteLoading,
        isSuccess: isEditNoteSuccess,
        isError: isEditNoteError,
    } = useCustomMutation({
        mutation: useEditNoteMutation,
        successMessage: 'Successfully edited note',
        errorMessage: 'Error editing note',
    });

    const fabPosition = useMemo(() => {
        if (notesDrawerPosition === 'right') {
            return { right: '2rem' };
        }
        return { left: '2rem' };
    }, [notesDrawerPosition]);

    const onClose = () => {
        setHidden(true);
    };

    /**
     * Toggle the notes for this card being open
     * @returns {void}
     */
    const toggleNotesOpen = (uuid: UUID, isExpanded: boolean) => {
        const newOpenNotes = new Set(openNotes);
        isExpanded ? newOpenNotes.add(uuid) : newOpenNotes.delete(uuid);
        setOpenNotes(newOpenNotes);
    };

    const handleAccordionChange =
        (cardUUID: UUID) =>
        (event: React.SyntheticEvent, isExpanded: boolean) => {
            console.log({ cardUUID, event, isExpanded });
            toggleNotesOpen(cardUUID, isExpanded);
        };

    const handleEditingNoteToggle = (uuid: UUID) => {
        const keyToUse = uuid === currentEditKey ? '' : uuid;
        setCurrentEditKey(keyToUse);
    };

    const handleEditNoteBlur = ({
        cardUUID,
        noteUUID,
        currentValue,
        editedValue,
    }: {
        cardUUID: UUID;
        noteUUID: UUID;
        currentValue: string;
        editedValue: string;
    }) => {
        handleEditingNoteToggle(noteUUID);
        if (currentValue !== editedValue) {
            editNote({
                studysetUUID,
                cardUUID,
                noteUUID,
                text: editedValue,
            });
        }
    };

    return hidden ? (
        <>
            <Fab
                onClick={() => setHidden(false)}
                color="primary"
                size="small"
                aria-label="Open notes drawer"
                title="Open notes drawer"
                sx={{
                    position: 'absolute',
                    ...fabPosition,
                }}
            >
                <MenuOpenIcon fontSize="medium" />
            </Fab>
        </>
    ) : (
        <StyledDrawer
            variant="permanent"
            anchor={notesDrawerPosition}
            open={true}
            transitionDuration={{
                enter: transitionDuration,
                exit: transitionDuration,
            }}
        >
            <SpacedFlexContainer>
                <BoldTypography variant="h5">Notes</BoldTypography>
                <CloseDialogButton onClose={onClose} />
            </SpacedFlexContainer>
            {selectedStudyset?.cards?.map((card: Card, index: number) => {
                const { cardUUID } = card;
                return (
                    <Accordion
                        expanded={openNotes.has(cardUUID)}
                        onChange={handleAccordionChange(cardUUID)}
                        slotProps={{
                            transition: {
                                unmountOnExit: true,
                            },
                        }}
                        key={cardUUID}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMoreIcon />}
                            aria-controls={`Card ${index + 1} content`}
                        >
                            <BoldTypography variant="h6">
                                Card {index + 1}
                            </BoldTypography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <NotesList
                                card={card}
                                currentEditKey={currentEditKey}
                                handleEditNoteBlur={handleEditNoteBlur}
                                handleEditingNoteToggle={
                                    handleEditingNoteToggle
                                }
                                studysetUUID={studysetUUID}
                            />
                            {card.notes.length !== 0 && (
                                <Divider
                                    sx={{ width: '100%', margin: '1rem 0' }}
                                />
                            )}
                            <LoadingButton
                                loading={isCreateNoteLoading}
                                startIcon={<AddIcon />}
                                variant="outlined"
                                onClick={() => {
                                    createNote({
                                        studysetUUID,
                                        cardUUID,
                                    });
                                }}
                                sx={{
                                    width: '100%',
                                }}
                            >
                                Add Note
                            </LoadingButton>
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </StyledDrawer>
    );
};

export default NotesDrawer;
