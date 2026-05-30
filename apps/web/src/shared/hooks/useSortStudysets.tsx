import { useMemo } from 'react';
import { SortDirection, Studyset } from 'shared/types';
import { SORT_DIRECTIONS } from 'shared/constants';

type UseSortStudysetsParams = {
    sortDirection: SortDirection;
    selectedSort: string;
    studysets: Studyset[];
};

const CARDS_LENGTH_PROPERTY = 'numCards';

export default function useSortStudysets(
    props: UseSortStudysetsParams
): Studyset[] {
    const { sortDirection, selectedSort, studysets } = props;

    const sortedStudysets = useMemo(() => {
        const sortModifier = sortDirection === SORT_DIRECTIONS.ASC ? 1 : -1;
        const localSortedStudysets = [...(studysets ?? [])];
        if (selectedSort) {
            localSortedStudysets.sort((a: Studyset, b: Studyset) => {
                const sortValueA =
                    selectedSort === CARDS_LENGTH_PROPERTY
                        ? a.cards.length
                        : a[selectedSort];
                const sortValueB =
                    selectedSort === CARDS_LENGTH_PROPERTY
                        ? b.cards.length
                        : b[selectedSort];
                if (sortValueA < sortValueB) {
                    return -1 * sortModifier;
                }
                if (sortValueA > sortValueB) {
                    return 1 * sortModifier;
                }
                return 0;
            });
        }

        return localSortedStudysets;
    }, [sortDirection, selectedSort, studysets]);

    return sortedStudysets;
}
