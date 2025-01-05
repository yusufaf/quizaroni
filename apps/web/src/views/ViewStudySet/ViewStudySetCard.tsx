import { Star, StarBorder, VolumeUp } from '@mui/icons-material';
import { IconButton, Popover, Tooltip, Typography } from '@mui/material/';
import { BoldTypography, SimpleFlexContainer } from 'styles/AppStyles';
import useSpeechSynthesis from 'hooks/useSpeechSynthesis';
import { Card, Studyset } from 'shared/types';
import { useRef, useState } from 'react';
import { useTheme } from 'theme/useTheme';
import {
    DEFAULT_TERMINOLOGY,
    FORMAT_TERMINOLOGIES,
    LABEL_TERMINOLOGIES,
} from 'shared/constants';
import {
    CategoryChip,
    CategoryChips,
    ViewCardContainer,
    ViewCardInfo,
    ViewFlashCardActions,
    ViewFlashsetCard,
} from './styles';
import CategoriesPopover from './CategoriesPopover';
import { useUpdateStudysetMutation } from 'state/api/studysetsAPI';

type Props = {
    card: Card;
    index: number;
    selectedStudyset: Studyset;
};

const ViewStudySetCard = ({ card, index, selectedStudyset }: Props) => {
    const { muiTheme } = useTheme();
    const { speak, cancel } = useSpeechSynthesis();

    const [updateStudySet] = useUpdateStudysetMutation();

    const timeoutRef = useRef(null);

    const { categories = [] } = card;
    const { cards, studysetUUID } = selectedStudyset;
    const {
        customTerminology,
        customLabelTerminology,
        labelTerminology,
        terminology,
        contentOnly,
    } = selectedStudyset.metadata;

    const selectedTerminology = terminology ?? DEFAULT_TERMINOLOGY;
    const [terminology1, terminology2] =
        selectedTerminology === FORMAT_TERMINOLOGIES.CUSTOM
            ? customTerminology?.split('/') ?? []
            : selectedTerminology.split('/');
    const selectedLabelTerminology =
        labelTerminology ?? LABEL_TERMINOLOGIES.CARD;
    const currentLabelTerminology =
        selectedLabelTerminology === LABEL_TERMINOLOGIES.CUSTOM
            ? customLabelTerminology ?? ''
            : selectedLabelTerminology;

    // TODO: Adjust to clear timeout / reset if clicked multiple times
    const handleAudioPlayback = () => {
        // if (timeoutRef.current) {
        //     clearTimeout(timeoutRef.current)
        // }
        const audio = new SpeechSynthesisUtterance();
        audio.text = card.term;
        window.speechSynthesis.speak(audio);
        // Wait half a second before speaking of definition
        timeoutRef.current = setTimeout(() => {
            audio.text = card.definition;
            window.speechSynthesis.speak(audio);
        }, 500);
        // timeoutRef.current = "";
    };

    /**
     * Marks a card as important
     */
    const markCardAsImportant = async () => {
        let updatedCards = [...cards];
        const indexToUpdate = updatedCards.findIndex(
            (value) => value.cardUUID === card.cardUUID
        );
        if (indexToUpdate === -1) {
            return;
        }

        updatedCards[indexToUpdate] = {
            ...card,
            important: !card.important,
        };
        updateStudySet({
            studysetUUID,
            updates: {
                cards: updatedCards,
            },
        });
    };

    return (
        <ViewFlashsetCard
            elevation={6}
            key={index}
            style={{
                backgroundColor: `${
                    card?.backgroundColor &&
                    selectedStudyset?.metadata?.backgroundColorVisible
                        ? card.backgroundColor
                        : ''
                }`,
            }}
            tabIndex={index}
        >
            {!contentOnly && (
                <SimpleFlexContainer>
                    <BoldTypography variant="h5">
                        {currentLabelTerminology} {index + 1}
                    </BoldTypography>
                    <CategoryChips>
                        {categories.length > 3 ? (
                            <CategoriesPopover categories={categories} />
                        ) : (
                            <>
                                {categories.map(
                                    (category: string, index: number) => (
                                        <CategoryChip
                                            key={index}
                                            label={category}
                                            variant="outlined"
                                            title={category}
                                        />
                                    )
                                )}
                            </>
                        )}
                    </CategoryChips>
                    <ViewFlashCardActions>
                        <Tooltip title="Play TTS" placement="top">
                            <IconButton onClick={handleAudioPlayback}>
                                <VolumeUp />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Mark as important" placement="top">
                            <IconButton onClick={markCardAsImportant}>
                                {card.important ? (
                                    <Star
                                        sx={{
                                            color: muiTheme.palette.other.gold,
                                        }}
                                    />
                                ) : (
                                    <StarBorder />
                                )}
                            </IconButton>
                        </Tooltip>
                    </ViewFlashCardActions>
                </SimpleFlexContainer>
            )}
            <ViewCardContainer>
                <ViewCardInfo>
                    {!contentOnly && (
                        <Typography variant="h6" color="primary">
                            {terminology1 ?? 'Term'}
                        </Typography>
                    )}
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor &&
                                selectedStudyset?.metadata?.textColorVisible
                                    ? card.textColor
                                    : ''
                            }`,
                        }}
                    >
                        {card.term}
                    </Typography>
                    {/* TODO: Term image */}
                </ViewCardInfo>
                <ViewCardInfo>
                    {!contentOnly && (
                        <Typography variant="h6" color="primary">
                            {terminology2 ?? 'Definition'}
                        </Typography>
                    )}
                    <Typography
                        sx={{
                            color: `${
                                card?.textColor &&
                                selectedStudyset?.metadata?.textColorVisible
                                    ? card.textColor
                                    : ''
                            }`,
                        }}
                    >
                        {card.definition}
                    </Typography>
                    {/* TODO: Definition image */}
                </ViewCardInfo>
            </ViewCardContainer>
        </ViewFlashsetCard>
    );
};

export default ViewStudySetCard;
