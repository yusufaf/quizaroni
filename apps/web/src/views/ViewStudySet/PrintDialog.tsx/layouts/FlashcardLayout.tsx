import { Card, Studyset, PrintConfig } from 'shared/types';
import { FORMAT_TERMINOLOGIES } from 'shared/constants';
import {
    FlashcardPage,
    FlashcardContent,
    FlashcardTitle,
    FlashcardText,
    CategoryList,
    NotesList,
    FileAttachment,
} from '../styles';

type Props = {
    studyset: Studyset;
    cards: Card[];
    settings: PrintConfig;
};

const FlashcardLayout = ({ studyset, cards, settings }: Props) => {
    const { terminology, customTerminology } = studyset.metadata;
    const [term1, term2] = (terminology === FORMAT_TERMINOLOGIES.CUSTOM
        ? customTerminology
        : terminology
    )?.split('/') ?? ['Term', 'Definition'];

    return (
        <div className="print-content">
            {cards.map((card) => (
                <div key={card.cardUUID}>
                    <FlashcardPage
                        className="print-page"
                        style={{
                            backgroundColor: settings.showColors
                                ? card.backgroundColor
                                : undefined,
                            color: settings.showColors
                                ? card.textColor
                                : undefined,
                        }}
                    >
                        <FlashcardTitle>{term1}</FlashcardTitle>
                        <FlashcardContent>
                            <FlashcardText>{card.term}</FlashcardText>

                            {settings.includeFiles &&
                                card.files
                                    .filter(
                                        (f) =>
                                            f.association === 'term' &&
                                            f.signedURL
                                    )
                                    .map((file, i) => (
                                        <FileAttachment
                                            key={i}
                                            src={file.signedURL}
                                            alt={file.name}
                                            onError={(e) => {
                                                e.currentTarget.style.display =
                                                    'none';
                                            }}
                                        />
                                    ))}

                            {settings.includeCategories &&
                                card.categories.length > 0 && (
                                    <CategoryList>
                                        {card.categories.map((cat, i) => (
                                            <span key={i}>{cat}</span>
                                        ))}
                                    </CategoryList>
                                )}
                        </FlashcardContent>
                    </FlashcardPage>

                    <FlashcardPage
                        className="print-page"
                        style={{
                            backgroundColor: settings.showColors
                                ? card.backgroundColor
                                : undefined,
                            color: settings.showColors
                                ? card.textColor
                                : undefined,
                        }}
                    >
                        <FlashcardTitle>{term2}</FlashcardTitle>
                        <FlashcardContent>
                            <FlashcardText>{card.definition}</FlashcardText>

                            {settings.includeFiles &&
                                card.files
                                    .filter(
                                        (f) =>
                                            f.association === 'definition' &&
                                            f.signedURL
                                    )
                                    .map((file, i) => (
                                        <FileAttachment
                                            key={i}
                                            src={file.signedURL}
                                            alt={file.name}
                                            onError={(e) => {
                                                e.currentTarget.style.display =
                                                    'none';
                                            }}
                                        />
                                    ))}

                            {settings.includeNotes && card.notes.length > 0 && (
                                <NotesList>
                                    <strong>Notes:</strong>
                                    {card.notes.map((note) => (
                                        <li key={note.noteUUID}>{note.text}</li>
                                    ))}
                                </NotesList>
                            )}
                        </FlashcardContent>
                    </FlashcardPage>
                </div>
            ))}
        </div>
    );
};

export default FlashcardLayout;
