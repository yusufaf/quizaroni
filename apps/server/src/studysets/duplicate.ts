import type { Db } from '../db';
import { studyset } from '../db/schema';
import { isPlainObject } from '../users/metadata';
import {
    ownedRow,
    type Row,
    type StudysetView,
    StudysetTooLargeError,
    toView,
    viewBytes,
} from './store';
import {
    type FileCopy,
    MAX_STUDYSET_BYTES,
    planCardFileCopies,
    studysetUUIDOfKey,
} from './updates';

export const MAX_BATCH_DUPLICATES = 50;

// A private copy: every card and note gets a new id, as the Lambda's
// buildDuplicate did, and only the set's own columns carry over.
export function buildDuplicate(
    source: Row,
    newUUID: string,
    now: Date,
    newId: () => string = () => crypto.randomUUID()
): Row {
    const s = structuredClone(source);
    return {
        studysetUUID: newUUID,
        ownerId: s.ownerId,
        username: s.username,
        title: `${s.title} Copy`,
        description: s.description,
        categories: s.categories,
        labels: s.labels,
        cards: s.cards.map((card) => ({
            ...card,
            cardUUID: newId(),
            notes: (Array.isArray(card.notes) ? card.notes : []).map(
                (note: unknown) =>
                    isPlainObject(note) ? { ...note, noteUUID: newId() } : note
            ),
        })),
        metadata: { ...s.metadata, publiclyViewable: false },
        favorited: false,
        lastViewed: now,
        createdAt: now,
        updatedAt: now,
        subject: null,
        isPublic: false,
        publishedAt: null,
        featuredAt: null,
        hiddenAt: null,
        saveCount: 0,
        copiedFrom: null,
    };
}

// All or nothing: one id the caller doesn't own fails the whole batch.
export function duplicateStudysets(
    db: Db,
    ownerId: string,
    studysetUUIDs: string[],
    now = new Date()
):
    | { status: 'ok'; studysets: StudysetView[]; fileCopies: FileCopy[] }
    | { status: 'not_found' } {
    return db.transaction(
        (tx) => {
            const sources: Row[] = [];
            for (const id of studysetUUIDs) {
                const row = ownedRow(tx, ownerId, id);
                if (!row) return { status: 'not_found' as const };
                sources.push(row);
            }
            const studysets: StudysetView[] = [];
            const fileCopies: FileCopy[] = [];
            for (const source of sources) {
                const copy = buildDuplicate(source, crypto.randomUUID(), now);
                // An unsafe stored key stays as it is and is never copied.
                const planned = planCardFileCopies(
                    copy.cards,
                    copy.studysetUUID,
                    (key) => studysetUUIDOfKey(key) !== undefined
                );
                const row: Row = { ...copy, cards: planned.cards };
                if (viewBytes(row) > MAX_STUDYSET_BYTES) {
                    throw new StudysetTooLargeError();
                }
                tx.insert(studyset).values(row).run();
                studysets.push(toView(row));
                fileCopies.push(...planned.copies);
            }
            return { status: 'ok' as const, studysets, fileCopies };
        },
        { behavior: 'immediate' }
    );
}
