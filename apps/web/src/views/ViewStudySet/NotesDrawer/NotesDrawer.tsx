import {
    Add as AddIcon,
    ExpandMore as ExpandMoreIcon,
    MenuOpen as MenuOpenIcon,
    StickyNote2 as NoteIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Badge,
    Box,
    Chip,
    Divider,
    Fab,
    Tooltip,
    Typography,
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
    useCreateNote,
    useEditNote,
} from 'state/api/studysetsAPI';
import { NOTES_DRAWER_INITIAL_APPEARANCE } from 'shared/constants';
import NotesList from './NotesList';
import { StyledDrawer, CardPreviewText, EmptyStateBox } from './styles';

type Props = {
    selectedStudyset: Studyset;
    isHidden?: boolean;
    onToggle?: (hidden: boolean) => void;
};

const transitionDuration = 1000; //can also use theme.transitions.duration

const NotesDrawer = (props: Props) => {
    const { selectedStudyset, isHidden: externalHidden, onToggle } = props;

    const {
        studysetUUID = '',
        metadata: {
            notesDrawerInitial = '',
            notesDrawerPosition = 'right',
        } = {},
    } = selectedStudyset || {};

    // Use external hidden state if provided, otherwise use internal state
    const [internalHidden, setInternalHidden] = useState<boolean>(
        notesDrawerInitial === NOTES_DRAWER_INITIAL_APPEARANCE.CLOSED
    );

    const hidden = externalHidden !== undefined ? externalHidden : internalHidden;
    const setHidden = (value: boolean) => {
        if (onToggle) {
            onToggle(value);
        } else {
            setInternalHidden(value);
        }
    };
    const [openNotes, setOpenNotes] = useState<OpenCardNotes>(new Set());
    const [currentEditKey, setCurrentEditKey] = useState<string>('');

    const [noteActionsStack, setNoteActionsStack] = useState([]);

    const {
        mutate: createNote,
        isLoading: isCreateNoteLoading,
        isSuccess: isCreateNoteSuccess,
        isError: isCreateNoteError,
    } = useCustomMutation({
        mutation: useCreateNote,
        successMessage: 'Successfully created note',
        errorMessage: 'Error creating note',
    });

    const {
        mutate: editNote,
        isLoading: isEditNoteLoading,
        isSuccess: isEditNoteSuccess,
        isError: isEditNoteError,
    } = useCustomMutation({
        mutation: useEditNote,
        successMessage: 'Successfully edited note',
        errorMessage: 'Error editing note',
    });

    const fabPosition = useMemo(() => {
        if (notesDrawerPosition === 'right') {
            return { right: '1.5rem', top: '5.5rem' };
        }
        return { left: '1.5rem', top: '5.5rem' };
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
                    position: 'fixed',
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
            <SpacedFlexContainer sx={{ mb: '1.5rem', pl: '1rem', pr: '1.5rem', pt: '1rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <NoteIcon sx={{ color: 'primary.main' }} />
                    <BoldTypography variant="h5">Notes</BoldTypography>
                </Box>
                <CloseDialogButton onClose={onClose} />
            </SpacedFlexContainer>

            {selectedStudyset?.cards && selectedStudyset.cards.length > 0 ? (
                <Box sx={{ pl: '0.5rem', pr: '1.5rem', pb: '1rem' }}>
                    {selectedStudyset.cards.map((card: Card, index: number) => {
                        const { cardUUID, term, definition, notes = [] } = card;
                        const noteCount = notes.length;

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
                                sx={{
                                    mb: '0.75rem',
                                    borderRadius: '0.5rem !important',
                                    '&:before': { display: 'none' },
                                    boxShadow: '0 0.125rem 0.375rem rgba(0,0,0,0.1)',
                                    '&.Mui-expanded': {
                                        boxShadow: '0 0.25rem 0.75rem rgba(255,160,0,0.15)',
                                    },
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    aria-controls={`Card ${index + 1} content`}
                                    sx={{
                                        minHeight: '4rem !important',
                                        '& .MuiAccordionSummary-content': {
                                            my: '0.75rem',
                                            overflow: 'hidden',
                                            flexDirection: 'column',
                                            gap: '0.25rem',
                                        },
                                        '& .MuiAccordionSummary-content.Mui-expanded': {
                                            my: '0.75rem',
                                        },
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem', mb: '0.25rem', flexShrink: 0 }}>
                                        <BoldTypography variant="subtitle1" sx={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                                            Card {index + 1}
                                        </BoldTypography>
                                        {noteCount > 0 && (
                                            <Chip
                                                label={`${noteCount} ${noteCount === 1 ? 'note' : 'notes'}`}
                                                size="small"
                                                sx={{
                                                    height: '1.25rem',
                                                    fontSize: '0.75rem',
                                                    bgcolor: 'primary.main',
                                                    color: 'primary.contrastText',
                                                    fontWeight: 600,
                                                    flexShrink: 0,
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <CardPreviewText variant="body2">
                                        {term || 'No term'}
                                    </CardPreviewText>
                                    <CardPreviewText variant="caption" sx={{ fontStyle: 'italic', opacity: 0.7 }}>
                                        {definition || 'No definition'}
                                    </CardPreviewText>
                                </AccordionSummary>
                                <AccordionDetails sx={{ pt: 0 }}>
                                    {noteCount === 0 ? (
                                        <EmptyStateBox>
                                            <NoteIcon sx={{ fontSize: '2rem', opacity: 0.3, mb: '0.5rem' }} />
                                            <Typography variant="body2" color="text.secondary">
                                                No notes yet
                                            </Typography>
                                        </EmptyStateBox>
                                    ) : (
                                        <>
                                            <NotesList
                                                card={card}
                                                currentEditKey={currentEditKey}
                                                handleEditNoteBlur={handleEditNoteBlur}
                                                handleEditingNoteToggle={
                                                    handleEditingNoteToggle
                                                }
                                                studysetUUID={studysetUUID}
                                            />
                                            <Divider
                                                sx={{ width: '100%', margin: '1rem 0' }}
                                            />
                                        </>
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
                </Box>
            ) : (
                <EmptyStateBox sx={{ mt: '2rem' }}>
                    <NoteIcon sx={{ fontSize: '3rem', opacity: 0.2, mb: '1rem' }} />
                    <Typography variant="h6" color="text.secondary">
                        No cards in this study set
                    </Typography>
                </EmptyStateBox>
            )}
        </StyledDrawer>
    );
};

export default NotesDrawer;
