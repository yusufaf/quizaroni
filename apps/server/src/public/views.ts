import {
    buildTermPreviews,
    type ExploreSetSummary,
    isSubjectId,
    normalizeText,
    truncateText,
} from '@quizaroni/shared-types';
import { fileURL, isCardFileKey } from '../files/keys';
import type { studyset } from '../db/schema';
import { isPlainObject, type JsonObject } from '../users/metadata';

type Row = typeof studyset.$inferSelect;

export type PublicCardFile = JsonObject & {
    key: string;
    association: 'term' | 'definition';
};

// The only files a public page shows: term and definition images stored
// under the set itself.
export function publicCardFiles(
    card: JsonObject,
    studysetUUID: string
): PublicCardFile[] {
    if (!Array.isArray(card.files)) return [];
    return card.files.filter(
        (file: unknown): file is PublicCardFile =>
            isPlainObject(file) &&
            isCardFileKey(file.key) &&
            file.key.split('/')[0] === studysetUUID &&
            (file.association === 'term' || file.association === 'definition')
    );
}

export function publicFileKeys(
    row: Pick<Row, 'studysetUUID' | 'cards'>
): Set<string> {
    const keys = new Set<string>();
    for (const card of row.cards) {
        if (!isPlainObject(card)) continue;
        for (const file of publicCardFiles(card, row.studysetUUID)) {
            keys.add(file.key);
        }
    }
    return keys;
}

export type PublicStudyset = {
    title: string;
    description: string;
    username: string | null;
    subject: string | null;
    publishedAt: string | null;
    updatedAt: string | null;
    cards: {
        term: string;
        definition: string;
        files: { association: 'term' | 'definition'; signedURL: string }[];
    }[];
};

const textOf = (value: unknown) => (typeof value === 'string' ? value : '');

// Built field by field from an allowlist, never spread, so nothing new on the
// stored row (owner id, notes, labels, file names) can reach a visitor.
export function toPublicStudyset(row: Row): PublicStudyset {
    return {
        title: row.title,
        description: row.description,
        username: row.username || null,
        subject: row.subject ?? null,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
        cards: row.cards.filter(isPlainObject).map((card) => ({
            term: textOf(card.term),
            definition: textOf(card.definition),
            files: publicCardFiles(card, row.studysetUUID).map((file) => ({
                association: file.association,
                signedURL: fileURL(file.key),
            })),
        })),
    };
}

export const SUMMARY_PREVIEW_COUNT = 5;
export const SUMMARY_PREVIEW_CHARS = 120;
export const SUMMARY_DESCRIPTION_CHARS = 200;
export const SUMMARY_TITLE_CHARS = 200;

const shortText = (value: unknown, maxChars: number): string =>
    truncateText(normalizeText(value), maxChars);

// An Explore card: text previews only, so no file data, notes or owner ids.
export function toSummary(
    row: Pick<
        Row,
        | 'studysetUUID'
        | 'title'
        | 'description'
        | 'subject'
        | 'cards'
        | 'username'
        | 'publishedAt'
        | 'updatedAt'
    >
): ExploreSetSummary {
    return {
        studysetUUID: row.studysetUUID,
        title: shortText(row.title, SUMMARY_TITLE_CHARS),
        description: shortText(row.description, SUMMARY_DESCRIPTION_CHARS),
        subject: isSubjectId(row.subject) ? row.subject : 'other',
        termCount: row.cards.filter(isPlainObject).length,
        previews: buildTermPreviews(
            row.cards,
            SUMMARY_PREVIEW_COUNT,
            SUMMARY_PREVIEW_CHARS
        ),
        username: row.username || null,
        publishedAt: row.publishedAt?.toISOString() ?? '',
        updatedAt: row.updatedAt.toISOString(),
    };
}
