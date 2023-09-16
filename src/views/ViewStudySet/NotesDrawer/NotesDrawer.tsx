import { LoadingButton } from "@mui/lab";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Typography,
} from "@mui/material/";
import { Card, OpenCardNotes, Studyset, UUID } from "lib/types";
import { StyledDrawer } from "./styles";
import { BoldTypography, SimpleFlexContainer } from "common/AppStyles";
import CloseDialogButton from "components/CloseDialogButton/CloseDialogButton";
import { useState } from "react";
import {
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";

type Props = {
    open: boolean;
    selectedStudyset: Studyset;
};

const transitionDuration = 1000; //can also use theme.transitions.duration

const NotesDrawer = (props: Props) => {
    const { open, selectedStudyset } = props;

    const { uuid: studySetUUID = "" } = selectedStudyset || {};
    const [notesDrawerHidden, setNotesDrawerHidden] = useState<boolean>(false);
    const [openNotes, setOpenNotes] = useState<OpenCardNotes>(new Set());

    const onClose = () => {};

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

    return (
        <StyledDrawer
            // sx={{
            //     width: drawerWidth,
            //     flexShrink: 0,
            //     "& .MuiDrawer-paper": {
            //         width: drawerWidth,
            //         boxSizing: "border-box",
            //     },
            // }}
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
                            <Typography>
                                Nulla facilisi. Phasellus sollicitudin nulla et
                                quam mattis feugiat. Aliquam eget maximus est,
                                id dignissim quam.
                            </Typography>
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
