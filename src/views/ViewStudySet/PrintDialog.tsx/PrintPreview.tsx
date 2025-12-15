import { Studyset, PrintConfig } from 'shared/types';
import { PRINT_LAYOUTS } from 'shared/constants';
import FlashcardLayout from './layouts/FlashcardLayout';
import ListLayout from './layouts/ListLayout';
import GridLayout from './layouts/GridLayout';
import { EmptyStateContainer } from './styles';

type Props = {
    studyset: Studyset | undefined;
    settings: PrintConfig;
};

const PrintPreview = ({ studyset, settings }: Props) => {
    if (!studyset || !studyset.cards) {
        return (
            <EmptyStateContainer>
                <p>Unable to load studyset data.</p>
            </EmptyStateContainer>
        );
    }

    const cards = settings.importantOnly
        ? studyset.cards.filter((card) => card.important)
        : studyset.cards;

    if (cards.length === 0) {
        return (
            <EmptyStateContainer>
                <p>
                    No cards to print.{' '}
                    {settings.importantOnly &&
                        'Try disabling "Important Only" filter.'}
                </p>
            </EmptyStateContainer>
        );
    }

    switch (settings.layout) {
        case PRINT_LAYOUTS.FLASHCARD:
            return (
                <FlashcardLayout
                    studyset={studyset}
                    cards={cards}
                    settings={settings}
                />
            );
        case PRINT_LAYOUTS.LIST:
            return (
                <ListLayout
                    studyset={studyset}
                    cards={cards}
                    settings={settings}
                />
            );
        case PRINT_LAYOUTS.GRID:
            return (
                <GridLayout
                    studyset={studyset}
                    cards={cards}
                    settings={settings}
                />
            );
        default:
            return (
                <ListLayout
                    studyset={studyset}
                    cards={cards}
                    settings={settings}
                />
            );
    }
};

export default PrintPreview;
