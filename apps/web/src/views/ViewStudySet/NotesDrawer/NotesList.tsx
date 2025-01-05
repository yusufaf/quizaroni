import { Tooltip, IconButton } from '@mui/material';
import { SimpleFlexContainer, FlexColumn } from 'styles/AppStyles';
import EditableTextField from 'components/EditableTextField/EditableTextField';
import useCustomMutation from 'hooks/useCustomMutation';
import { Card, Note } from 'shared/types';
import { useDeleteNoteMutation } from 'state/api/studysetsAPI';
import { EMPTY_NOTE_PLACEHOLDER } from 'shared/constants';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';

interface NoteListProps {
    card: Card;
    currentEditKey: string;
    handleEditNoteBlur: (params: any) => void;
    handleEditingNoteToggle: (noteUUID: string) => void;
    studysetUUID: string;
}

const NoteList = ({
    card,
    currentEditKey,
    handleEditNoteBlur,
    handleEditingNoteToggle,
    studysetUUID = '',
}: NoteListProps) => {
    const [noteBeingDeleted, setNoteBeingDeleted] = useState<string>('');
    const { cardUUID } = useMemo(() => card, [card]);

    const {
        mutate: deleteNote,
        isLoading: isDeleteNoteLoading,
        isSuccess: isDeleteNoteSuccess,
        isError: isDeleteNoteError,
    } = useCustomMutation({
        mutation: useDeleteNoteMutation,
        successMessage: 'Successfully deleted note',
        errorMessage: 'Error deleting note',
        onSuccess: () => {
            setNoteBeingDeleted('');
        },
        onError: () => {
            setNoteBeingDeleted('');
        },
    });

    const handleDeleteNote = (noteUUID: string) => {
        setNoteBeingDeleted(noteUUID);

        deleteNote({
            studysetUUID,
            cardUUID,
            noteUUID,
        });
    };

    return (
        <FlexColumn>
            {card.notes.map((note: Note, index: number) => {
                const { noteUUID } = note;
                return (
                    <SimpleFlexContainer key={noteUUID} style={{ gap: '1rem' }}>
                        <EditableTextField
                            isEditing={currentEditKey === noteUUID}
                            value={note.text ?? 'EMPTY'}
                            placeholder={EMPTY_NOTE_PLACEHOLDER}
                            onBlur={(editedValue: any) =>
                                handleEditNoteBlur({
                                    cardUUID: card.cardUUID,
                                    noteUUID,
                                    currentValue: note.text,
                                    editedValue,
                                })
                            }
                        />
                        <SimpleFlexContainer
                            sx={{
                                height: 'fit-content',
                            }}
                        >
                            <Tooltip title="Edit this note" placement="top">
                                <IconButton
                                    onClick={() =>
                                        handleEditingNoteToggle(noteUUID)
                                    }
                                >
                                    <EditIcon
                                        fontSize="small"
                                        color={
                                            currentEditKey === noteUUID
                                                ? 'primary'
                                                : undefined
                                        }
                                    />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete this note" placement="top">
                                <IconButton
                                    disabled={
                                        isDeleteNoteLoading &&
                                        noteUUID === noteBeingDeleted
                                    }
                                    onClick={() => handleDeleteNote(noteUUID)}
                                >
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </SimpleFlexContainer>
                    </SimpleFlexContainer>
                );
            })}
        </FlexColumn>
    );
};

export default NoteList;
