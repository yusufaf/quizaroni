import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    if (!studyset || !studyset.cards) {
        return (
            <EmptyStateContainer>
                <p>{t('dialogs.print.loadFailed')}</p>
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
                    {settings.importantOnly
                        ? t('dialogs.print.noCardsImportantOnly')
                        : t('dialogs.print.noCards')}
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
