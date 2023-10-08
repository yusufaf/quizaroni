import { LoadingButton } from "@mui/lab";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Fab,
    IconButton,
    Tooltip,
    Typography,
} from "@mui/material/";
import { Card, Note, OpenCardNotes, Studyset, UUID } from "lib/types";
import { StyledDrawer } from "./styles";
import {
    BoldTypography,
    FlexColumn,
    SimpleFlexContainer,
} from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { useState } from "react";
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon,
    MenuOpen as MenuOpenIcon,
} from "@mui/icons-material";
import EditableTextField from "components/EditableTextField/EditableTextField";
import {
    useCreateNoteMutation,
    useDeleteNoteMutation,
    useEditNoteMutation,
} from "state/api/studysets";
import useCustomMutation from "lib/hooks/useCustomMutation";
import { EMPTY_NOTE_PLACEHOLDER, NOTES_DRAWER_INITIAL_APPEARANCE } from "utilities/constants";

type Props = {
    selectedStudyset: Studyset;
};

const transitionDuration = 1000; //can also use theme.transitions.duration

const NotesDrawer = (props: Props) => {
    const { selectedStudyset } = props;

    const { uuid: studysetUUID = "", metadata } = selectedStudyset || {};
    // TODO: Doesn't work on initial load as expected
    const [hidden, setHidden] = useState<boolean>(metadata?.notesDrawerInitial === NOTES_DRAWER_INITIAL_APPEARANCE.CLOSED);
    const [openNotes, setOpenNotes] = useState<OpenCardNotes>(new Set());
    const [currentEditKey, setCurrentEditKey] = useState<string>();

    const [noteActionsStack, setNoteActionsStack] = useState([]);

    const {
        mutate: createNote,
        isLoading: isCreateNoteLoading,
        isSuccess: isCreateNoteSuccess,
        isError: isCreateNoteError,
    } = useCustomMutation({
        mutation: useCreateNoteMutation,
        successMessage: "Successfully created note",
        errorMessage: "Error creating note",
    });

    const {
        mutate: deleteNote,
        isLoading: isDeleteNoteLoading,
        isSuccess: isDeleteNoteSuccess,
        isError: isDeleteNoteError,
    } = useCustomMutation({
        mutation: useDeleteNoteMutation,
        successMessage: "Successfully deleted note",
        errorMessage: "Error deleting note",
    });

    const {
        mutate: editNote,
        isLoading: isEditNoteLoading,
        isSuccess: isEditNoteSuccess,
        isError: isEditNoteError,
    } = useCustomMutation({
        mutation: useEditNoteMutation,
        successMessage: "Successfully edited note",
        errorMessage: "Error editing note",
    });

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
        const keyToUse = uuid === currentEditKey ? "" : uuid;
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
                aria-label="Open notes menu"
                title="Open notes menu"
                sx={{
                    position: "absolute",
                    right: "2rem",
                }}
            >
                <MenuOpenIcon fontSize="medium" />
            </Fab>
        </>
    ) : (
        <StyledDrawer
            variant="persistent"
            anchor="right"
            open={true}
            transitionDuration={{
                enter: transitionDuration,
                exit: transitionDuration,
            }}
        >
            <SimpleFlexContainer>
                <BoldTypography variant="h5">Notes</BoldTypography>
                <CloseDialogButton onClose={onClose} />
            </SimpleFlexContainer>
            {selectedStudyset?.cards?.map((card: Card, index: number) => {
                const { uuid: cardUUID } = card;
                return (
                    <Accordion
                        expanded={openNotes.has(cardUUID)}
                        onChange={handleAccordionChange(cardUUID)}
                        TransitionProps={{ unmountOnExit: true }}
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
                            {card.notes?.map((note: Note, index: number) => {
                                const { uuid } = note;
                                return (
                                    <SimpleFlexContainer
                                        key={uuid}
                                        style={{
                                            gap: "1rem",
                                        }}
                                    >
                                        <EditableTextField
                                            isEditing={currentEditKey === uuid}
                                            value={note.text ?? "EMPTY"}
                                            placeholder={EMPTY_NOTE_PLACEHOLDER}
                                            onBlur={(editedValue: any) =>
                                                handleEditNoteBlur({
                                                    cardUUID,
                                                    noteUUID: uuid,
                                                    currentValue: note.text,
                                                    editedValue,
                                                })
                                            }
                                        />
                                        <SimpleFlexContainer
                                            sx={{
                                                height: "fit-content",
                                            }}
                                        >
                                            <Tooltip
                                                title="Edit this note"
                                                placement="top"
                                            >
                                                <IconButton
                                                    onClick={() =>
                                                        handleEditingNoteToggle(
                                                            uuid
                                                        )
                                                    }
                                                >
                                                    <EditIcon
                                                        fontSize="small"
                                                        color={
                                                            currentEditKey ===
                                                            uuid
                                                                ? "primary"
                                                                : undefined
                                                        }
                                                    />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip
                                                title="Delete this note"
                                                placement="top"
                                            >
                                                <IconButton
                                                    onClick={() =>
                                                        deleteNote({
                                                            studysetUUID,
                                                            cardUUID,
                                                            noteUUID: uuid,
                                                        })
                                                    }
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </SimpleFlexContainer>
                                    </SimpleFlexContainer>
                                );
                            })}
                            <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                sx={{ width: "100%", marginTop: "1rem" }}
                                onClick={() => {
                                    createNote({
                                        studysetUUID,
                                        cardUUID,
                                    });
                                }}
                            >
                                Add Note
                            </Button>
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </StyledDrawer>
    );
};

export default NotesDrawer;
