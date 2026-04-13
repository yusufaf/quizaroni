import { Tooltip, IconButton } from '@mui/material';
import { SimpleFlexContainer, FlexColumn } from 'styles/AppStyles';
import EditableTextField from 'components/EditableTextField/EditableTextField';
import useCustomMutation from 'hooks/useCustomMutation';
import { Card, Note } from 'shared/types';
import { useDeleteNote } from 'state/api/studysetsAPI';
import { EMPTY_NOTE_PLACEHOLDER } from 'shared/constants';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation();
    const [noteBeingDeleted, setNoteBeingDeleted] = useState<string>('');
    const { cardUUID } = useMemo(() => card, [card]);

    const {
        mutate: deleteNote,
        isLoading: isDeleteNoteLoading,
        isSuccess: isDeleteNoteSuccess,
        isError: isDeleteNoteError,
    } = useCustomMutation({
        mutation: useDeleteNote,
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
        <FlexColumn sx={{ gap: '0.75rem' }}>
            {card.notes.map((note: Note, index: number) => {
                const { noteUUID } = note;
                const isEditing = currentEditKey === noteUUID;
                const isDeleting =
                    isDeleteNoteLoading && noteUUID === noteBeingDeleted;

                return (
                    <SimpleFlexContainer
                        key={noteUUID}
                        sx={{
                            gap: '0.5rem',
                            p: '0.75rem',
                            bgcolor: 'background.paper',
                            borderRadius: '0.5rem',
                            border: '0.0625rem solid',
                            borderColor: isEditing ? 'primary.main' : 'divider',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                borderColor: 'primary.light',
                                boxShadow:
                                    '0 0.125rem 0.375rem rgba(0,0,0,0.05)',
                            },
                        }}
                    >
                        <EditableTextField
                            isEditing={isEditing}
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
                            style={{
                                '& .MuiInput-underline:after': {
                                    borderBottomColor: '#ffa000',
                                },
                                '& .MuiInput-underline:hover:not(.Mui-disabled):before':
                                    {
                                        borderBottomColor: '#ffa000',
                                    },
                            }}
                        />
                        <SimpleFlexContainer
                            sx={{
                                height: 'fit-content',
                                gap: '0.25rem',
                            }}
                        >
                            <Tooltip
                                title={
                                    isEditing
                                        ? t('notesDrawer.saveNote')
                                        : t('notesDrawer.editNote')
                                }
                                placement="top"
                            >
                                <IconButton
                                    onClick={() =>
                                        handleEditingNoteToggle(noteUUID)
                                    }
                                    size="small"
                                    sx={{
                                        color: isEditing
                                            ? 'primary.main'
                                            : 'text.secondary',
                                        '&:hover': {
                                            color: 'primary.main',
                                            bgcolor: 'rgba(255,160,0,0.08)',
                                        },
                                    }}
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip
                                title={t('notesDrawer.deleteNote')}
                                placement="top"
                            >
                                <IconButton
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteNote(noteUUID)}
                                    size="small"
                                    sx={{
                                        color: 'text.secondary',
                                        '&:hover': {
                                            color: 'error.main',
                                            bgcolor: 'rgba(211,47,47,0.08)',
                                        },
                                    }}
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
