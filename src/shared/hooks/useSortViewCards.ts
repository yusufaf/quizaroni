import { useMemo } from 'react';
import { SortDirection, Studyset, Card } from 'shared/types';
import { SORT_DIRECTIONS } from 'shared/constants';

type UseSortViewCardsProps = {
    sortDirection: SortDirection;
    selectedSort: string;
    studyset: Studyset | undefined;
};

export default function useSortViewCards(props: UseSortViewCardsProps) {
    const { sortDirection, selectedSort, studyset } = props;

    const sortedCards = useMemo(() => {
        const sortModifier = sortDirection === SORT_DIRECTIONS.ASC ? 1 : -1;
        const sortedCards = [...(studyset?.cards ?? [])];
        if (selectedSort) {
            sortedCards.sort((a: Card, b: Card) => {
                if (a[selectedSort] < b[selectedSort]) {
                    return -1 * sortModifier;
                }
                if (a[selectedSort] > b[selectedSort]) {
                    return 1 * sortModifier;
                }
                return 0;
            });
        }

        return sortedCards;
    }, [sortDirection, selectedSort, studyset]);

    return sortedCards;
}
