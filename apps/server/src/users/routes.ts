import { isValidUsername } from '@quizaroni/shared-types';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AuthHandle } from '../auth/auth';
import type { Db } from '../db';
import { INVALID_JSON, readJsonBody } from '../http/json-body';
import { noStore, requireSession, type SessionEnv } from '../http/session';
import {
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

const tooLarge = (c: Context) =>
    c.json({ message: 'Metadata too large' }, 413);

// Same paths and response shapes as the Lambdas, so the web client is
// unchanged.
export function userRoutes(deps: {
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

    routes.post('/get-user', (c) =>
        c.json({
            message: 'Successfully retrieved user data',
            user: getUserView(db, c.get('userId')),
        })
    );

    routes.post('/update-metadata', async (c) => {
        const body = await readJsonBody(c);
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
        const body = await readJsonBody(c);
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
        const body = await readJsonBody(c);
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
        const body = await readJsonBody(c);
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
