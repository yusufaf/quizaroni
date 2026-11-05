import { isValidUsername } from '@quizaroni/shared-types';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AuthHandle } from '../auth/auth';
import type { Db } from '../db';
import {
    isPlainObject,
    type JsonObject,
    parseMetadataUpdates,
    parseNotificationUpdates,
    UpdateGamificationBodySchema,
} from './metadata';
import {
    buildUserDataExport,
    getUserView,
    MetadataTooLargeError,
    updateGamification,
    updateMetadata,
    updateNotificationPreferences,
    updateUsername,
} from './profile';

const BODY_LIMIT_BYTES = 256 * 1024;

type Env = { Variables: { userId: string } };

const INVALID_JSON = Symbol('invalid JSON');

// A body that parses to something other than an object (`null`, an array)
// reads as `{}`, so the handler answers 400 for the missing field.
async function readBody(c: Context): Promise<JsonObject | typeof INVALID_JSON> {
    const text = await c.req.text();
    if (text === '') return {};
    try {
        const parsed: unknown = JSON.parse(text);
        return isPlainObject(parsed) ? parsed : {};
    } catch {
        return INVALID_JSON;
    }
}

const tooLarge = (c: Context) =>
    c.json({ message: 'Metadata too large' }, 413);

// Same paths and response shapes as the Lambdas, so the web client is
// unchanged. The user is always the session's; no body field picks one.
export function userRoutes(deps: { db: Db; auth: AuthHandle }): Hono<Env> {
    const { db } = deps;
    const routes = new Hono<Env>();

    routes.use('*', async (c, next) => {
        c.header('Cache-Control', 'no-store');
        await next();
    });

    routes.use('*', async (c, next) => {
        const found = await deps
            .auth()
            .auth.api.getSession({ headers: c.req.raw.headers });
        if (!found) return c.json({ message: 'Unauthorized' }, 401);
        c.set('userId', found.user.id);
        return next();
    });

    routes.use(
        '*',
        bodyLimit({
            maxSize: BODY_LIMIT_BYTES,
            onError: (c) => c.json({ message: 'Payload too large' }, 413),
        })
    );

    routes.post('/get-user', (c) =>
        c.json({
            message: 'Successfully retrieved user data',
            user: getUserView(db, c.get('userId')),
        })
    );

    routes.post('/update-metadata', async (c) => {
        const body = await readBody(c);
        if (body === INVALID_JSON) {
            return c.json({ message: 'Invalid JSON' }, 400);
        }
        const parsed = parseMetadataUpdates(body.updates);
        if (!parsed.ok) {
            return c.json({ message: parsed.message }, parsed.status);
        }
        try {
            const user = updateMetadata(db, c.get('userId'), parsed.value);
            return c.json({
                message: 'Successfully updated user metadata',
                user,
            });
        } catch (err) {
            if (err instanceof MetadataTooLargeError) return tooLarge(c);
            throw err;
        }
    });

    routes.post('/update-username', async (c) => {
        const body = await readBody(c);
        if (body === INVALID_JSON) {
            return c.json({ message: 'Invalid JSON' }, 400);
        }
        const username =
            typeof body.username === 'string'
                ? body.username.trim()
                : body.username;
        if (!isValidUsername(username)) {
            return c.json({ message: 'Invalid username' }, 400);
        }
        const result = updateUsername(db, c.get('userId'), username);
        if (result.status === 'taken') {
            return c.json({ message: 'Username taken' }, 409);
        }
        // No study sets to restamp until the server stores them (#257).
        return c.json({
            message: 'Successfully updated username',
            user: result.user,
            studysetsUpdated: 0,
            studysetsFailed: 0,
            studysetsRenameComplete: true,
        });
    });

    routes.post('/update-gamification', async (c) => {
        const body = await readBody(c);
        if (body === INVALID_JSON) {
            return c.json({ message: 'Invalid JSON' }, 400);
        }
        const parsed = UpdateGamificationBodySchema.safeParse(body);
        if (!parsed.success) {
            return c.json({ message: 'Invalid gamification' }, 400);
        }
        try {
            const result = updateGamification(
                db,
                c.get('userId'),
                parsed.data
            );
            return c.json({
                message: 'Successfully updated gamification',
                ...result,
            });
        } catch (err) {
            if (err instanceof MetadataTooLargeError) return tooLarge(c);
            throw err;
        }
    });

    routes.post('/update-notification-preferences', async (c) => {
        const body = await readBody(c);
        if (body === INVALID_JSON) {
            return c.json({ message: 'Invalid JSON' }, 400);
        }
        const parsed = parseNotificationUpdates(body.updates);
        if (!parsed.ok) {
            return c.json({ message: parsed.message }, parsed.status);
        }
        try {
            const user = updateNotificationPreferences(
                db,
                c.get('userId'),
                parsed.value
            );
            return c.json({
                message: 'Successfully updated notification preferences',
                user,
            });
        } catch (err) {
            if (err instanceof MetadataTooLargeError) return tooLarge(c);
            throw err;
        }
    });

    // `includeStudysets` is ignored until the server stores sets (#257).
    routes.post('/download-user-data', (c) => {
        const exported = buildUserDataExport(db, c.get('userId'));
        c.header(
            'Content-Disposition',
            `attachment; filename="quizaroni-data-${exported.exportedAt.slice(0, 10)}.json"`
        );
        return c.json(exported);
    });

    return routes;
}
