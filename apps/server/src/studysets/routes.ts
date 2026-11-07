import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AuthHandle } from '../auth/auth';
import type { Db } from '../db';
import { INVALID_JSON, readJsonBody } from '../http/json-body';
import { noStore, requireSession, type SessionEnv } from '../http/session';
import { isPlainObject } from '../users/metadata';
import {
    duplicateStudysets,
    MAX_BATCH_DUPLICATES,
} from './duplicate';
import { addNoteRoutes } from './note-routes';
import { message } from './respond';
import {
    createStudyset,
    deleteStudyset,
    deleteStudysets,
    getStudyset,
    listStudysets,
    StudysetTooLargeError,
    updateStudyset,
} from './store';
import {
    isStudysetUUID,
    MAX_BATCH_STUDYSETS,
    parseStudysetUpdates,
    parseStudysetUUIDList,
} from './updates';

// Room for a set at its 400 KB cap plus the request wrapping.
const BODY_LIMIT_BYTES = 512 * 1024;

// Same paths and response shapes as the Lambdas, so the web client and its
// SyncEngine are unchanged.
export function studysetRoutes(deps: {
    db: Db;
    auth: AuthHandle;
}): Hono<SessionEnv> {
    const { db } = deps;
    const routes = new Hono<SessionEnv>();

    routes.use('*', noStore());
    routes.use('*', requireSession(deps.auth));
    routes.use(
        '*',
        bodyLimit({
            maxSize: BODY_LIMIT_BYTES,
            onError: (c) => c.json({ message: 'Payload too large' }, 413),
        })
    );

    addNoteRoutes(routes, db);

    routes.post('/get-all-studysets', (c) =>
        c.json({ studysets: listStudysets(db, c.get('userId')) })
    );

    // Any miss is a 404, as with the Lambda: ViewStudySet shows its "private
    // or does not exist" page only for a 404.
    routes.post('/get-studyset', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        const studyset = isStudysetUUID(body.studysetUUID)
            ? getStudyset(db, c.get('userId'), body.studysetUUID)
            : null;
        if (!studyset) {
            return message(c, 'Study set not found in your library.', 404);
        }
        return c.json({
            message: 'Successfully retrieved study set data',
            studyset,
        });
    });

    // The UI sends no body and gets a new set; the SyncEngine sends
    // `{ studyset }` with the id it made offline.
    routes.post('/create-studyset', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        let input: Parameters<typeof createStudyset>[2] = {};
        if (body.studyset !== undefined) {
            if (!isPlainObject(body.studyset)) {
                return message(c, 'Invalid studyset', 400);
            }
            if (!isStudysetUUID(body.studyset.studysetUUID)) {
                return message(c, 'Invalid studysetUUID', 400);
            }
            const parsed = parseStudysetUpdates(body.studyset, false);
            if (!parsed.ok) return message(c, parsed.message, parsed.status);
            input = {
                studysetUUID: body.studyset.studysetUUID,
                write: parsed.value,
            };
        }
        try {
            const result = createStudyset(db, c.get('userId'), input);
            if (result.status === 'forbidden') {
                return message(c, 'Forbidden', 403);
            }
            return c.json({
                message: 'Successfully created study set',
                studyset: result.studyset,
            });
        } catch (err) {
            if (err instanceof StudysetTooLargeError) {
                return message(c, 'Study set too large', 413);
            }
            throw err;
        }
    });

    // `fileCopies` from create and update are for the file store (#259) to
    // perform; no card file exists before it.
    routes.post('/update-studyset', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        if (!isStudysetUUID(body.studysetUUID)) {
            return message(c, 'Invalid studysetUUID', 400);
        }
        const parsed = parseStudysetUpdates(
            body.updates,
            body.isMetadataUpdate === true
        );
        if (!parsed.ok) return message(c, parsed.message, parsed.status);
        try {
            const result = updateStudyset(
                db,
                c.get('userId'),
                body.studysetUUID,
                parsed.value
            );
            if (result.status === 'not_found') {
                return message(c, 'Study set not found', 404);
            }
            if (result.status === 'forbidden') {
                return message(c, 'Forbidden', 403);
            }
            return c.json({
                message: 'Successfully updated study set',
                studyset: result.studyset,
            });
        } catch (err) {
            if (err instanceof StudysetTooLargeError) {
                return message(c, 'Study set too large', 413);
            }
            throw err;
        }
    });

    routes.post('/delete-studyset', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        if (!isStudysetUUID(body.studysetUUID)) {
            return message(c, 'Invalid studysetUUID', 400);
        }
        const result = deleteStudyset(db, c.get('userId'), body.studysetUUID);
        if (result === 'not_owner') {
            return message(c, 'Study set not found', 404);
        }
        return c.json({ message: 'Successfully deleted study set' });
    });

    // `fileCopies` from duplicates are for the file store (#259) too.
    routes.post('/duplicate-studyset', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        if (!isStudysetUUID(body.studysetUUID)) {
            return message(c, 'Invalid studysetUUID', 400);
        }
        try {
            const result = duplicateStudysets(db, c.get('userId'), [
                body.studysetUUID,
            ]);
            if (result.status === 'not_found') {
                return message(c, 'Study set not found', 404);
            }
            return c.json({
                message: 'Successfully duplicated study set',
                studyset: result.studysets[0],
            });
        } catch (err) {
            if (err instanceof StudysetTooLargeError) {
                return message(c, 'Study set too large', 413);
            }
            throw err;
        }
    });

    routes.post('/batch-duplicate-studysets', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        const ids = parseStudysetUUIDList(
            body.studysetUUIDs,
            MAX_BATCH_DUPLICATES
        );
        if (!ids.ok) return message(c, ids.message, ids.status);
        try {
            const result = duplicateStudysets(db, c.get('userId'), ids.value);
            if (result.status === 'not_found') {
                return message(c, 'Study set not found', 404);
            }
            return c.json({
                message: 'Successfully duplicated study sets',
                studysetUUIDs: result.studysets.map((s) => s.studysetUUID),
            });
        } catch (err) {
            if (err instanceof StudysetTooLargeError) {
                return message(c, 'Study set too large', 413);
            }
            throw err;
        }
    });

    routes.post('/batch-delete-studysets', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        const ids = parseStudysetUUIDList(
            body.studysetUUIDs,
            MAX_BATCH_STUDYSETS
        );
        if (!ids.ok) return message(c, ids.message, ids.status);
        return c.json({
            message: 'Successfully deleted study sets',
            deletedStudysetUUIDs: deleteStudysets(
                db,
                c.get('userId'),
                ids.value
            ),
        });
    });

    return routes;
}
