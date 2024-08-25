import { Tooltip, IconButton } from '@mui/material';
import { SimpleFlexContainer, FlexColumn } from 'common/AppStyles';
import EditableTextField from 'components/EditableTextField/EditableTextField';
import useCustomMutation from 'lib/hooks/useCustomMutation';
import { Card, Note } from 'lib/types';
import { useDeleteNoteMutation } from 'state/api/studysetsAPI';
import { EMPTY_NOTE_PLACEHOLDER } from 'utilities/constants';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useMemo } from 'react';

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
    });

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
                                    onClick={() =>
                                        deleteNote({
                                            studysetUUID,
                                            cardUUID,
                                            noteUUID,
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
        </FlexColumn>
    );
};

export default NoteList;
