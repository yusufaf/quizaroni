import { VolumeUp, Star, StarBorder } from '@mui/icons-material';
import { IconButton, Tooltip, Typography } from '@mui/material';
import useSpeechSynthesis from 'hooks/useSpeechSynthesis';
import { Card, Studyset } from 'shared/types';
import { useRef } from 'react';
import { useTheme } from 'theme/useTheme';
import { DEFAULT_TERMINOLOGY, FORMAT_TERMINOLOGIES } from 'shared/constants';
import { ViewGridCard, GridCardContent, GridCardSection } from './styles';
import { useUpdateStudyset } from 'state/api/studysetsAPI';

type Props = {
    card: Card;
    index: number;
    selectedStudyset: Studyset;
};

const ViewStudySetCardGrid = ({ card, index, selectedStudyset }: Props) => {
    const { muiTheme } = useTheme();
    const { speak, cancel } = useSpeechSynthesis();
    const { mutate: updateStudySet } = useUpdateStudyset();
    const timeoutRef = useRef(null);

    const { cards, studysetUUID } = selectedStudyset;
    const { customTerminology, terminology, contentOnly } = selectedStudyset.metadata;

    const selectedTerminology = terminology ?? DEFAULT_TERMINOLOGY;
    const [terminology1, terminology2] =
        selectedTerminology === FORMAT_TERMINOLOGIES.CUSTOM
            ? customTerminology?.split('/') ?? []
            : selectedTerminology.split('/');

    const handleAudioPlayback = () => {
        const audio = new SpeechSynthesisUtterance();
        audio.text = card.term;
        window.speechSynthesis.speak(audio);
        timeoutRef.current = setTimeout(() => {
            audio.text = card.definition;
            window.speechSynthesis.speak(audio);
        }, 500);
    };

    const markCardAsImportant = async () => {
        let updatedCards = [...cards];
        const indexToUpdate = updatedCards.findIndex(
            (value) => value.cardUUID === card.cardUUID
        );
        if (indexToUpdate === -1) return;

        updatedCards[indexToUpdate] = {
            ...card,
            important: !card.important,
        };
        updateStudySet({
            studysetUUID,
            updates: { cards: updatedCards },
        });
    };

    return (
        <ViewGridCard
            elevation={6}
            sx={{
                backgroundColor: `${
                    card?.backgroundColor && selectedStudyset?.metadata?.backgroundColorVisible
                        ? card.backgroundColor
                        : ''
                }`,
            }}
        >
            <GridCardContent>
                <GridCardSection>
                    {!contentOnly && (
                        <Typography variant="subtitle2" color="primary" fontWeight={600}>
                            {terminology1 ?? 'Term'}
                        </Typography>
                    )}
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor && selectedStudyset?.metadata?.textColorVisible
                                    ? card.textColor
                                    : ''
                            }`,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                        }}
                    >
                        {card.term}
                    </Typography>
                </GridCardSection>
                <GridCardSection>
                    {!contentOnly && (
                        <Typography variant="subtitle2" color="primary" fontWeight={600}>
                            {terminology2 ?? 'Definition'}
                        </Typography>
                    )}
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor && selectedStudyset?.metadata?.textColorVisible
                                    ? card.textColor
                                    : ''
                            }`,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                        }}
                    >
                        {card.definition}
                    </Typography>
                </GridCardSection>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', justifyContent: 'flex-end' }}>
                    <Tooltip title="Play TTS" placement="top">
                        <IconButton onClick={handleAudioPlayback} size="small">
                            <VolumeUp fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Mark as important" placement="top">
                        <IconButton onClick={markCardAsImportant} size="small">
                            {card.important ? (
                                <Star fontSize="small" sx={{ color: muiTheme.palette.primary.main }} />
                            ) : (
                                <StarBorder fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                </div>
            </GridCardContent>
        </ViewGridCard>
    );
};

export default ViewStudySetCardGrid;
