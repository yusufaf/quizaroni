import { useMemo } from 'react';
import { DEFAULT_CATEGORIES } from 'shared/constants';
import { Card } from 'shared/types';

type UseFilterViewCardsProps = {
    selectedTab: string;
    sortedViewFlashCards: Card[];
};

export default function useFilterViewCards(props: UseFilterViewCardsProps) {
    const { selectedTab, sortedViewFlashCards } = props;

    const filteredViewFlashCards = useMemo(() => {
        switch (selectedTab) {
            case DEFAULT_CATEGORIES.ALL:
                return sortedViewFlashCards;
            case DEFAULT_CATEGORIES.IMPORTANT:
                return [...sortedViewFlashCards].filter((value) => {
                    return value.important;
                });
            default:
                return [...sortedViewFlashCards].filter((value) => {
                    return (value.categories ?? []).includes(selectedTab);
                });
        }
    }, [selectedTab, sortedViewFlashCards]);

    return filteredViewFlashCards;
}
