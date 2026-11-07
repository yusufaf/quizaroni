import type { Db } from '../db';
import type { JsonObject } from '../users/metadata';
import { type Conn, ownedRow, type Row, writeOwned } from './store';

type NotFound = { status: 'not_found'; what: 'studyset' | 'card' | 'note' };
type NoteResult<T = object> = ({ status: 'ok' } & T) | NotFound;

const notesOf = (card: JsonObject): JsonObject[] =>
    Array.isArray(card.notes) ? (card.notes as JsonObject[]) : [];

// Notes live on their card inside the set, so every note change is a card
// write through the owner-checked, size-capped set write.
function changeCards(
    db: Db,
    ownerId: string,
    studysetUUID: string,
    now: Date,
    change: (row: Row, tx: Conn) => JsonObject[] | NotFound
): { status: 'ok' } | NotFound {
    return db.transaction(
        (tx) => {
            const row = ownedRow(tx, ownerId, studysetUUID);
            if (!row) return { status: 'not_found', what: 'studyset' } as const;
            const cards = change(row, tx);
            if (!Array.isArray(cards)) return cards;
            const result = writeOwned(
                tx,
                row,
                { fields: { cards }, metadata: {} },
                now
            );
            // The card files are the ones the set already holds.
            if (result.status !== 'ok') throw new Error('note write refused');
            return { status: 'ok' } as const;
        },
        { behavior: 'immediate' }
    );
}

const cardMissing = (row: Row, cardUUID: string): NotFound | undefined =>
    row.cards.some((card) => card.cardUUID === cardUUID)
        ? undefined
        : { status: 'not_found', what: 'card' };

export function createNote(
    db: Db,
    ownerId: string,
    studysetUUID: string,
    cardUUID: string,
    now = new Date(),
    noteUUID: string = crypto.randomUUID()
): NoteResult<{ noteUUID: string }> {
    const result = changeCards(db, ownerId, studysetUUID, now, (row) => {
        const missing = cardMissing(row, cardUUID);
        if (missing) return missing;
        const note = { noteUUID, text: '', createdAt: now.toISOString() };
        return row.cards.map((card) =>
            card.cardUUID === cardUUID
                ? { ...card, notes: [...notesOf(card), note] }
                : card
        );
    });
    return result.status === 'ok' ? { status: 'ok', noteUUID } : result;
}

export function editNote(
    db: Db,
    ownerId: string,
    input: {
        studysetUUID: string;
        cardUUID: string;
        noteUUID: string;
        text: string;
    },
    now = new Date()
): NoteResult {
    return changeCards(db, ownerId, input.studysetUUID, now, (row) => {
        const missing = cardMissing(row, input.cardUUID);
        if (missing) return missing;
        let found = false;
        const cards = row.cards.map((card) => {
            if (card.cardUUID !== input.cardUUID) return card;
            return {
                ...card,
                notes: notesOf(card).map((note) => {
                    if (note.noteUUID !== input.noteUUID) return note;
                    found = true;
                    return { ...note, text: input.text };
                }),
            };
        });
        return found ? cards : { status: 'not_found', what: 'note' };
    });
}

// Deleting a note that's already gone succeeds, so a retry is harmless.
export function deleteNote(
    db: Db,
    ownerId: string,
    input: { studysetUUID: string; cardUUID: string; noteUUID: string },
    now = new Date()
): NoteResult {
    return changeCards(db, ownerId, input.studysetUUID, now, (row) => {
        const missing = cardMissing(row, input.cardUUID);
        if (missing) return missing;
        return row.cards.map((card) =>
            card.cardUUID === input.cardUUID
                ? {
                      ...card,
                      notes: notesOf(card).filter(
                          (note) => note.noteUUID !== input.noteUUID
                      ),
                  }
                : card
        );
    });
}
