import {
    AutoAwesome,
    DragIndicator,
    Star,
    StarBorder,
    VolumeUp,
} from '@mui/icons-material';
import { IconButton, Popover, Tooltip, Typography } from '@mui/material/';
import { useTranslation } from 'react-i18next';
import { useAIChatStore } from 'state/stores/aiChat';
import { BoldTypography, SimpleFlexContainer } from 'styles/AppStyles';
import useSpeechSynthesis from 'hooks/useSpeechSynthesis';
import { Card, Studyset } from 'shared/types';
import { useGetUser } from 'state/api/usersAPI';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'theme/useTheme';
import {
    DEFAULT_TERMINOLOGY,
    FORMAT_TERMINOLOGIES,
    LABEL_TERMINOLOGIES,
} from 'shared/constants';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    CategoryChip,
    CategoryChips,
    ViewCardContainer,
    ViewCardInfo,
    ViewFlashCardActions,
    ViewFlashsetCard,
} from './styles';
import CategoriesPopover from './CategoriesPopover';
import { useUpdateStudyset } from 'state/api/studysetsAPI';
import ImageGallery from 'components/ImageGallery/ImageGallery';

type Props = {
    card: Card;
    index: number;
    selectedStudyset: Studyset;
};

const ViewStudySetCard = ({ card, index, selectedStudyset }: Props) => {
    const { muiTheme } = useTheme();
    const { t } = useTranslation('ai');
    const { setOpen, setMode, setQueuedPrompt } = useAIChatStore();
    const { cancel } = useSpeechSynthesis();
    const { data: userData = DEFAULT_USER_RESPONSE } = useGetUser();
    const ttsVoice = userData.user?.metadata?.ttsVoice;

    const { mutate: updateStudySet } = useUpdateStudyset();

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
            ? (customTerminology?.split('/') ?? [])
            : selectedTerminology.split('/');
    const selectedLabelTerminology =
        labelTerminology ?? LABEL_TERMINOLOGIES.CARD;
    const currentLabelTerminology =
        selectedLabelTerminology === LABEL_TERMINOLOGIES.CUSTOM
            ? (customLabelTerminology ?? '')
            : selectedLabelTerminology;

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
            }
            cancel();
            window.speechSynthesis.cancel();
        };
    }, [cancel]);

    const getSelectedVoice = (): SpeechSynthesisVoice | null => {
        if (!ttsVoice || !window.speechSynthesis) return null;
        return (
            window.speechSynthesis
                .getVoices()
                .find((v) => v.voiceURI === ttsVoice) || null
        );
    };

    const handleAudioPlayback = () => {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        cancel();
        window.speechSynthesis.cancel();

        const voice = getSelectedVoice();

        const termUtterance = new SpeechSynthesisUtterance();
        termUtterance.text = card.term;
        if (voice) termUtterance.voice = voice;
        window.speechSynthesis.speak(termUtterance);

        timeoutRef.current = setTimeout(() => {
            const definitionUtterance = new SpeechSynthesisUtterance();
            definitionUtterance.text = card.definition;
            if (voice) definitionUtterance.voice = voice;
            window.speechSynthesis.speak(definitionUtterance);
            timeoutRef.current = null;
        }, 500);
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

    /**
     * Opens the AI panel in Explain mode focused on this specific card.
     */
    const explainWithAI = () => {
        setOpen(true);
        setMode('explain');
        setQueuedPrompt({
            content: `Explain this flashcard in depth:\nTerm: "${card.term}"\nDefinition: "${card.definition}"`,
            mode: 'explain',
            cardContext: { term: card.term, definition: card.definition },
        });
    };

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card.cardUUID });

    const sortableStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <ViewFlashsetCard
            ref={setNodeRef}
            style={sortableStyle}
            elevation={6}
            key={index}
            sx={{
                backgroundColor:
                    card?.backgroundColor &&
                    selectedStudyset?.metadata?.backgroundColorVisible
                        ? card.backgroundColor
                        : undefined,
            }}
            tabIndex={index}
        >
            {!contentOnly && (
                <SimpleFlexContainer>
                    {selectedStudyset?.metadata?.cardIndexVisible !== false && (
                        <BoldTypography variant="h5">
                            {currentLabelTerminology} {index + 1}
                        </BoldTypography>
                    )}
                    <CategoryChips
                        hasIndex={
                            selectedStudyset?.metadata?.cardIndexVisible !==
                            false
                        }
                    >
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
                        <Tooltip title="Drag to reorder" placement="top">
                            <IconButton
                                {...attributes}
                                {...listeners}
                                sx={{
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                }}
                            >
                                <DragIndicator />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Play TTS" placement="top">
                            <IconButton onClick={handleAudioPlayback}>
                                <VolumeUp />
                            </IconButton>
                        </Tooltip>
                        <Tooltip
                            title={t('aiChat.actions.explainCard')}
                            placement="top"
                        >
                            <IconButton onClick={explainWithAI}>
                                <AutoAwesome />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Mark as important" placement="top">
                            <IconButton onClick={markCardAsImportant}>
                                {card.important ? (
                                    <Star
                                        sx={{
                                            color: muiTheme.palette.primary
                                                .main,
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
                            color:
                                card?.textColor &&
                                selectedStudyset?.metadata?.textColorVisible
                                    ? card.textColor
                                    : undefined,
                        }}
                    >
                        {card.term}
                    </Typography>
                    <ImageGallery
                        files={
                            card.files?.filter(
                                (f) => f.association === 'term'
                            ) || []
                        }
                        maxHeight="7rem"
                    />
                </ViewCardInfo>
                <ViewCardInfo>
                    {!contentOnly && (
                        <Typography variant="h6" color="primary">
                            {terminology2 ?? 'Definition'}
                        </Typography>
                    )}
                    <Typography
                        sx={{
                            color:
                                card?.textColor &&
                                selectedStudyset?.metadata?.textColorVisible
                                    ? card.textColor
                                    : undefined,
                        }}
                    >
                        {card.definition}
                    </Typography>
                    <ImageGallery
                        files={
                            card.files?.filter(
                                (f) => f.association === 'definition'
                            ) || []
                        }
                        maxHeight="7rem"
                    />
                </ViewCardInfo>
            </ViewCardContainer>
        </ViewFlashsetCard>
    );
};

export default ViewStudySetCard;
