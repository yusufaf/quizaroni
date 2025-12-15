import { Card, Studyset, PrintConfig } from 'shared/types';
import { FORMAT_TERMINOLOGIES, LABEL_TERMINOLOGIES } from 'shared/constants';
import {
    ListHeader,
    ListCard,
    ListCardRow,
    ListCardColumn,
    CategoryChips,
    NoteItem,
    FileImage,
} from '../styles';

type Props = {
    studyset: Studyset;
    cards: Card[];
    settings: PrintConfig;
};

const ListLayout = ({ studyset, cards, settings }: Props) => {
    const { terminology, customTerminology, labelTerminology, customLabelTerminology } =
        studyset.metadata;
    const [term1, term2] =
        (terminology === FORMAT_TERMINOLOGIES.CUSTOM
            ? customTerminology
            : terminology
        )?.split('/') ?? ['Term', 'Definition'];
    const labelText =
        labelTerminology === LABEL_TERMINOLOGIES.CUSTOM
            ? customLabelTerminology
            : labelTerminology;

    return (
        <div className="print-content">
            <ListHeader>
                <h1>{studyset.title}</h1>
                {studyset.description && <p>{studyset.description}</p>}
            </ListHeader>

            {cards.map((card, index) => (
                <ListCard
                    key={card.cardUUID}
                    className="print-card"
                    style={{
                        backgroundColor: settings.showColors
                            ? card.backgroundColor
                            : undefined,
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                        }}
                    >
                        <strong>
                            {labelText} {index + 1}
                        </strong>
                        {card.important && (
                            <span
                                style={{
                                    marginLeft: '0.5rem',
                                    color: 'gold',
                                }}
                            >
                                ⭐
                            </span>
                        )}
                        {settings.includeCategories &&
                            card.categories.length > 0 && (
                                <CategoryChips>
                                    {card.categories.map((cat, i) => (
                                        <span key={i}>{cat}</span>
                                    ))}
                                </CategoryChips>
                            )}
                    </div>

                    <ListCardRow>
                        <ListCardColumn>
                            <strong>{term1}:</strong>
                            <p
                                style={{
                                    color: settings.showColors
                                        ? card.textColor
                                        : undefined,
                                }}
                            >
                                {card.term}
                            </p>
                            {settings.includeFiles &&
                                card.files
                                    .filter((f) => f.association === 'term' && f.signedURL)
                                    .map((file, i) => (
                                        <FileImage
                                            key={i}
                                            src={file.signedURL}
                                            alt={file.name}
                                            onError={(e) => {
                                                e.currentTarget.style.display =
                                                    'none';
                                            }}
                                        />
                                    ))}
                        </ListCardColumn>

                        <ListCardColumn>
                            <strong>{term2}:</strong>
                            <p
                                style={{
                                    color: settings.showColors
                                        ? card.textColor
                                        : undefined,
                                }}
                            >
                                {card.definition}
                            </p>
                            {settings.includeFiles &&
                                card.files
                                    .filter(
                                        (f) =>
                                            f.association === 'definition' &&
                                            f.signedURL
                                    )
                                    .map((file, i) => (
                                        <FileImage
                                            key={i}
                                            src={file.signedURL}
                                            alt={file.name}
                                            onError={(e) => {
                                                e.currentTarget.style.display =
                                                    'none';
                                            }}
                                        />
                                    ))}
                        </ListCardColumn>
                    </ListCardRow>

                    {settings.includeNotes && card.notes.length > 0 && (
                        <div
                            style={{
                                marginTop: '0.75rem',
                                borderTop: '0.0625rem solid #ccc',
                                paddingTop: '0.5rem',
                            }}
                        >
                            <strong>Notes:</strong>
                            <ul>
                                {card.notes.map((note) => (
                                    <NoteItem key={note.noteUUID}>
                                        {note.text}
                                    </NoteItem>
                                ))}
                            </ul>
                        </div>
                    )}
                </ListCard>
            ))}
        </div>
    );
};

export default ListLayout;
