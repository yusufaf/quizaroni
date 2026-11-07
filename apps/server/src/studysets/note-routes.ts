import type { Context, Hono } from 'hono';
import type { Db } from '../db';
import { INVALID_JSON, readJsonBody } from '../http/json-body';
import type { SessionEnv } from '../http/session';
import type { JsonObject } from '../users/metadata';
import { createNote, deleteNote, editNote } from './notes';
import { message } from './respond';
import { StudysetTooLargeError } from './store';
import { isStudysetUUID } from './updates';

const isId = (value: unknown): value is string =>
    typeof value === 'string' && value !== '';

const NOT_FOUND = {
    studyset: 'Study set not found',
    card: 'Card not found',
    note: 'Note not found',
} as const;

type Ids = { studysetUUID: string; cardUUID: string; noteUUID?: string };

// The ids every note route needs; a string response is the 400 to send.
function readIds(body: JsonObject, needsNote: boolean): Ids | string {
    if (!isStudysetUUID(body.studysetUUID)) return 'Invalid studysetUUID';
    if (!isId(body.cardUUID)) return 'Invalid cardUUID';
    if (needsNote && !isId(body.noteUUID)) return 'Invalid noteUUID';
    return {
        studysetUUID: body.studysetUUID,
        cardUUID: body.cardUUID,
        noteUUID: needsNote ? (body.noteUUID as string) : undefined,
    };
}

async function handle(
    c: Context<SessionEnv>,
    needsNote: boolean,
    run: (
        ids: Ids,
        body: JsonObject
    ) => Response | { what: keyof typeof NOT_FOUND }
): Promise<Response> {
    const body = await readJsonBody(c);
    if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
    const ids = readIds(body, needsNote);
    if (typeof ids === 'string') return message(c, ids, 400);
    try {
        const result = run(ids, body);
        if (result instanceof Response) return result;
        return message(c, NOT_FOUND[result.what], 404);
    } catch (err) {
        if (err instanceof StudysetTooLargeError) {
            return message(c, 'Study set too large', 413);
        }
        throw err;
    }
}

export function addNoteRoutes(routes: Hono<SessionEnv>, db: Db): void {
    routes.post('/create-note', (c) =>
        handle(c, false, (ids) => {
            const result = createNote(
                db,
                c.get('userId'),
                ids.studysetUUID,
                ids.cardUUID
            );
            if (result.status === 'not_found') return result;
            return c.json({
                message: 'Successfully created note',
                noteUUID: result.noteUUID,
            });
        })
    );

    routes.post('/edit-note', (c) =>
        handle(c, true, (ids, body) => {
            if (typeof body.text !== 'string') {
                return message(c, 'Invalid text', 400);
            }
            const result = editNote(db, c.get('userId'), {
                studysetUUID: ids.studysetUUID,
                cardUUID: ids.cardUUID,
                noteUUID: ids.noteUUID!,
                text: body.text,
            });
            if (result.status === 'not_found') return result;
            return c.json({ message: 'Successfully edited note' });
        })
    );

    routes.post('/delete-note', (c) =>
        handle(c, true, (ids) => {
            const result = deleteNote(db, c.get('userId'), {
                studysetUUID: ids.studysetUUID,
                cardUUID: ids.cardUUID,
                noteUUID: ids.noteUUID!,
            });
            if (result.status === 'not_found') return result;
            return c.json({ message: 'Successfully deleted note' });
        })
    );
}
