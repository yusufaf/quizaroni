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
import { useCreateNoteMutation, useDeleteNoteMutation, useEditNoteMutation } from "state/api/studysets";
import useCustomMutation from "lib/hooks/useCustomMutation";
import { EMPTY_NOTE_PLACEHOLDER } from "utilities/constants";

type Props = {
    open: boolean;
    selectedStudyset: Studyset;
};

const transitionDuration = 1000; //can also use theme.transitions.duration

const NotesDrawer = (props: Props) => {
    const { open, selectedStudyset } = props;

    const { uuid: studySetUUID = "" } = selectedStudyset || {};
    const [hidden, setHidden] = useState<boolean>(false);
    const [openNotes, setOpenNotes] = useState<OpenCardNotes>(new Set());
    const [isEditing, setIsEditing] = useState<boolean>(false);

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

    const handleEditingNoteToggle = (editing: boolean) => {

    }

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
                return (
                    <Accordion
                        expanded={openNotes.has(card.uuid)}
                        onChange={handleAccordionChange(card.uuid)}
                        TransitionProps={{ unmountOnExit: true }}
                        key={card.uuid}
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
                                return (
                                    <SimpleFlexContainer 
                                        key={note.uuid}
                                        style={{
                                            gap: "1rem"
                                        }}
                                    >
                                        <EditableTextField
                                            isEditing={isEditing}
                                            value={note.text ?? "EMPTY"}
                                            setIsEditing={setIsEditing}
                                            placeholder={EMPTY_NOTE_PLACEHOLDER}
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
                                                        setIsEditing(!isEditing)
                                                    }
                                                >
                                                    <EditIcon
                                                        fontSize="small"
                                                        color={
                                                            isEditing
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
                                                <IconButton>
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
                                        cardUUID: card.uuid,
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
