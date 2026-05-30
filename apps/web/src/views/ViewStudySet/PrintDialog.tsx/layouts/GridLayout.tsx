import { Card, Studyset, PrintConfig } from 'shared/types';
import { FORMAT_TERMINOLOGIES } from 'shared/constants';
import {
    GridContainer,
    GridCard,
    GridCardHeader,
    GridCardContent,
} from '../styles';

type Props = {
    studyset: Studyset;
    cards: Card[];
    settings: PrintConfig;
};

const GridLayout = ({ studyset, cards, settings }: Props) => {
    const { terminology, customTerminology } = studyset.metadata;
    const [term1, term2] = (terminology === FORMAT_TERMINOLOGIES.CUSTOM
        ? customTerminology
        : terminology
    )?.split('/') ?? ['Term', 'Definition'];

    return (
        <div className="print-content">
            <h1 style={{ marginBottom: '1.5rem' }}>{studyset.title}</h1>
            <GridContainer>
                {cards.map((card, index) => (
                    <GridCard
                        key={card.cardUUID}
                        className="print-grid-card"
                        style={{
                            backgroundColor: settings.showColors
                                ? card.backgroundColor
                                : undefined,
                            color: settings.showColors
                                ? card.textColor
                                : undefined,
                        }}
                    >
                        <GridCardHeader>
                            #{index + 1}
                            {card.important && ' ⭐'}
                            {settings.includeCategories &&
                                card.categories.length > 0 && (
                                    <span
                                        style={{
                                            fontSize: '0.75rem',
                                            marginLeft: '0.5rem',
                                        }}
                                    >
                                        ({card.categories.join(', ')})
                                    </span>
                                )}
                        </GridCardHeader>
                        <GridCardContent>
                            <div>
                                <strong>{term1}:</strong> {card.term}
                            </div>
                            <div>
                                <strong>{term2}:</strong> {card.definition}
                            </div>
                            {settings.includeNotes && card.notes.length > 0 && (
                                <div
                                    style={{
                                        fontSize: '0.75rem',
                                        marginTop: '0.25rem',
                                        fontStyle: 'italic',
                                    }}
                                >
                                    Notes:{' '}
                                    {card.notes.map((n) => n.text).join('; ')}
                                </div>
                            )}
                        </GridCardContent>
                    </GridCard>
                ))}
            </GridContainer>
        </div>
    );
};

export default GridLayout;
