import type {
    Card,
    CardFileMetadata,
    Studyset,
    Timestamp,
    UUID,
} from 'models/studysets';
import { isOpaqueCardFileKey } from 'utilities/cardFiles';
import { defaultStudysetMetadata } from 'utilities/defaultMetadata';
import { buildDuplicate } from 'utilities/duplicateStudyset';

export type Saver = { userUUID: UUID; username?: string };

/**
 * Same rule `toPublicStudyset` serves images by, so the copy holds no file
 * the public page didn't show. Author file names are private (#152), and the
 * source's presigned URL names the source's object, so both are replaced.
 */
const savedFiles = (
    files: CardFileMetadata[],
    sourceUUID: UUID
): CardFileMetadata[] =>
    files
        .filter(
            (file) =>
                isOpaqueCardFileKey(file?.key, sourceUUID) &&
                (file.association === 'term' ||
                    file.association === 'definition')
        )
        .map(({ key, association, size }) => ({
            key,
            association,
            size: typeof size === 'number' ? size : 0,
            signedURL: '',
            name: association === 'term' ? 'Term image' : 'Definition image',
        }));

const toSavedCard = (card: Card, sourceUUID: UUID): Card => ({
    cardUUID: card.cardUUID,
    term: card.term ?? '',
    definition: card.definition ?? '',
    categories: [],
    important: false,
    notes: [],
    files: savedFiles(card.files ?? [], sourceUUID),
});

/**
 * Builds the saver's private copy of someone else's public set (#140). Only
 * what the public page shows is kept: title, description, terms, definitions
 * and publicly served images. Notes, labels, categories, card styling and the
 * author's display settings stay behind.
 *
 * Card files still point at the source's S3 objects; callers must re-key them
 * with `copyCardFiles` before storing the copy (#126).
 */
export const buildPublicCopy = (
    source: Studyset,
    { newUUID, now, saver }: { newUUID: UUID; now: Timestamp; saver: Saver }
): Studyset => {
    const { moderation: _moderation, ...base } = buildDuplicate(
        source,
        newUUID,
        now
    );

    return {
        ...base,
        PK: `userUUID#${saver.userUUID}`,
        userUUID: saver.userUUID,
        username: saver.username || null,
        title: source.title ?? '',
        description: source.description ?? '',
        labels: [],
        categories: [],
        metadata: defaultStudysetMetadata(),
        cards: base.cards.map((card) =>
            toSavedCard(card, source.studysetUUID)
        ),
        copiedFrom: { studysetUUID: source.studysetUUID },
    };
};
