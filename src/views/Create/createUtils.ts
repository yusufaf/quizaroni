import { v4 as uuidv4 } from "uuid";
import { TODO } from "lib/types";

type DeleteCardParams = {
    index: number;
    createdSetCards: TODO[];
    setStateCallback: TODO;
};
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

type AddCreateCardInputParams = {
    EMPTY_CARD: TODO;
    createdSetCards: TODO[];
    setStateCallback: TODO;
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

type DuplicateCardParams = {
    index: number;
    createdSetCards: TODO[];
    setStateCallback: TODO;
};
/**
 * Handles the duplication of a card
 */
export const handleDuplicateCard = ({
    index,
    createdSetCards,
    setStateCallback
}: DuplicateCardParams) => {
    const duplicateCard = { ...createdSetCards[index] };
    setStateCallback(createdSetCards.concat(duplicateCard));
};

type HandleReverseParams = {
    createdSetCards: TODO[];
    setStateCallback: TODO;
};
/**
 * Handles the reversal of the created set cards
*/
export const handleReverse = ({
    createdSetCards,
    setStateCallback,
}: HandleReverseParams) => {
    setStateCallback([...createdSetCards].reverse());
};


type HandleSwapAllParams = {
    createdSetCards: TODO[];
    setStateCallback: TODO;
};
/**
 * Handles the swapping of all the cards 
*/
export const handleSwapAll = ({
    createdSetCards,
    setStateCallback,
}: HandleSwapAllParams) => {
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