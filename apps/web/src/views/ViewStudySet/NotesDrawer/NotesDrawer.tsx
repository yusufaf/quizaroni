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
import { Card, OpenCardNotes, Studyset, UUID } from "lib/types";
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
                    right: "2rem"
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
                            <SimpleFlexContainer>
                                <EditableTextField
                                    isEditing={isEditing}
                                    value="testtesttesttesttesttesttesttesttesttesttesttesttesttesttest"
                                    setIsEditing={setIsEditing}
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
                            <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                sx={{ width: "100%" }}
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
