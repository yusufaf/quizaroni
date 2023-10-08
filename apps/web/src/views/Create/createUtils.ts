import { v4 as uuidv4 } from "uuid";
import { TODO } from "lib/types";

type CardUtilityParams = {
    createdSetCards: TODO[];
    setStateCallback: TODO;
};

type CardUtilityParamsWithIndex = CardUtilityParams & {
    index: number;
};

type DeleteCardParams = CardUtilityParamsWithIndex;
/**
 * Handles the deletion of a card from the created set.
 */
export const deleteCard = ({
    index,
    createdSetCards,
    setStateCallback,
}: DeleteCardParams) => {
    const newCreatedSetCards = [...createdSetCards];
    newCreatedSetCards.splice(index, 1);
    setStateCallback(newCreatedSetCards);
};

type AddCreateCardInputParams = CardUtilityParams & {
    EMPTY_CARD: TODO;
};
/**
 * Handles the addition of a new card input
 */
export const addCreateCardInput = ({
    createdSetCards,
    EMPTY_CARD,
    setStateCallback,
}: AddCreateCardInputParams) => {
    const newEmptyCard = { ...EMPTY_CARD, uuid: uuidv4() };
    setStateCallback(createdSetCards.concat(newEmptyCard));
};

type DuplicateCardParams = CardUtilityParamsWithIndex;
/**
 * Handles the duplication of a card
 */
export const handleDuplicateCard = ({
    index,
    createdSetCards,
    setStateCallback,
}: DuplicateCardParams) => {
    const duplicateCard = { ...createdSetCards[index] };
    setStateCallback(createdSetCards.concat(duplicateCard));
};

/**
 * Handles the reversal of the created set cards
 */
export const handleReverse = ({
    createdSetCards,
    setStateCallback,
}: CardUtilityParams) => {
    setStateCallback([...createdSetCards].reverse());
};

/**
 * Handles the swapping of all the cards
 */
export const handleSwapAll = ({
    createdSetCards,
    setStateCallback,
}: CardUtilityParams) => {
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

type AddCardBelowParams = CardUtilityParamsWithIndex & {
    EMPTY_CARD: TODO;
};
/**
 *
 */
const handleAddCardBelow = ({
    index,
    createdSetCards,
    setStateCallback,
    EMPTY_CARD,
}: AddCardBelowParams) => {
    const newCreatedSetCards = [...createdSetCards];
    newCreatedSetCards.splice(index + 1, 0, { ...EMPTY_CARD });
    setStateCallback(newCreatedSetCards);
};
