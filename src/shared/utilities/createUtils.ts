import type { TODO, Card } from 'shared/types';
import { EMPTY_CARD } from '../constants';
import { Dispatch, SetStateAction } from 'react';

type CommonCardUtility = {
    createdSetCards: TODO[];
    setStateCallback: TODO;
};

type CardUtilityWithIndex = CommonCardUtility & {
    index: number;
};

type ActionsStackBaseProps = {
    actionsStack: TODO[];
    setActionsStack: Dispatch<SetStateAction<TODO[]>>;
};

export const generateEmptyCard = (): Card => {
    return { ...EMPTY_CARD, cardUUID: crypto.randomUUID() };
};

type DeleteCardParams = ActionsStackBaseProps & CardUtilityWithIndex;
/**
 * Handles the deletion of a card from the created set.
 */
export const deleteCard = ({
    index,
    createdSetCards,
    setStateCallback,
    actionsStack,
    setActionsStack,
}: DeleteCardParams): void => {
    const newCreatedSetCards = [...createdSetCards];
    const cardBeingDeleted = newCreatedSetCards[index];
    console.log({ cardBeingDeleted });
    newCreatedSetCards.splice(index, 1);
    setStateCallback(newCreatedSetCards);

    const newActionsStack = [...actionsStack].concat({
        actionType: 'deleteCard',
        undoCallback: (createdSetCards: TODO[], setStateCallback: TODO) => {
            const newCreatedSetCards = [...createdSetCards];
            console.log({
                newCreatedSetCards,
                originalUUID: cardBeingDeleted.uuid,
            });
            newCreatedSetCards.splice(index, 0, cardBeingDeleted);
            setStateCallback(newCreatedSetCards);
        },
    });
    setActionsStack(newActionsStack);
};

type AddCreateCardInputParams = CommonCardUtility & {
    EMPTY_CARD: TODO;
};
/**
 * Handles the addition of a new card input
 */
export const addCreateCardInput = ({
    createdSetCards,
    EMPTY_CARD,
    setStateCallback,
}: AddCreateCardInputParams): void => {
    const newEmptyCard = { ...EMPTY_CARD, uuid: crypto.randomUUID() };
    setStateCallback(createdSetCards.concat(newEmptyCard));
};

type DuplicateCardParams = CardUtilityWithIndex;
/**
 * Handles the duplication of a card
 */
export const duplicateCard = ({
    index,
    createdSetCards,
    setStateCallback,
}: DuplicateCardParams): void => {
    const duplicateCard = { ...createdSetCards[index] };
    setStateCallback([...createdSetCards].concat(duplicateCard));
};

/**
 * Handles the reversal of the created set cards
 */
export const handleReverse = ({
    createdSetCards,
    setStateCallback,
}: CommonCardUtility) => {
    setStateCallback([...createdSetCards].reverse());
};

type SwapCardParams = CardUtilityWithIndex;
/**
 * Handles the swapping of a card's term and definition
 * @param index
 */
export const swapCard = ({
    createdSetCards,
    setStateCallback,
    index,
}: SwapCardParams): void => {
    const newCreatedSetCards = [...createdSetCards];
    const selectedCard = newCreatedSetCards[index];
    newCreatedSetCards[index] = {
        ...selectedCard,
        term: selectedCard.definition,
        definition: selectedCard.term,
    };
    setStateCallback(newCreatedSetCards);
};

/**
 * Handles the swapping of all the cards
 */
export const swapAllCards = ({
    createdSetCards,
    setStateCallback,
}: CommonCardUtility): void => {
    const swappedCards = createdSetCards.map((card) => {
        const { definition, term } = card;
        return {
            ...card,
            term: definition,
            definition: term,
        };
    });
    setStateCallback(swappedCards);
};

type AddCardParams = ActionsStackBaseProps & {
    createdSetCards: TODO[];
    setStateCallback: TODO;
    index?: number;
};
/**
 * Adds a card
 */
export const addCard = ({
    index,
    createdSetCards,
    setStateCallback,
    actionsStack = [],
    setActionsStack,
}: AddCardParams): void => {
    const newCreatedSetCards = [...createdSetCards];
    const indexToUse =
        index !== undefined ? index + 1 : newCreatedSetCards.length;
    const cardToAdd = generateEmptyCard();
    newCreatedSetCards.splice(indexToUse, 0, cardToAdd);
    setStateCallback(newCreatedSetCards);

    const newActionsStack = [...actionsStack].concat({
        actionType: 'addCard',
        undoCallback: (createdSetCards: TODO[], setStateCallback: TODO) => {
            const newCreatedSetCards = [...createdSetCards].filter(
                (value) => value.UUID !== cardToAdd.cardUUID
            );
            console.log({
                newCreatedSetCards,
                originalUUID: cardToAdd.cardUUID,
            });
            setStateCallback(newCreatedSetCards);
        },
    });
    setActionsStack(newActionsStack);
};

/* ==== Actions Stack ==== */
