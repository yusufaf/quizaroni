import { isValidUsername } from '@quizaroni/shared-types';
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AuthHandle } from '../auth/auth';
import type { Db } from '../db';
import { uploadAvatar } from '../files/avatars';
import type { FileStore } from '../files/store';
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
const AVATAR_BODY_LIMIT_BYTES = 3 * 1024 * 1024;

const tooLarge = (c: Context) =>
    c.json({ message: 'Metadata too large' }, 413);

// Same paths and response shapes as the Lambdas, so the web client is
// unchanged.
export function userRoutes(deps: {
    db: Db;
    auth: AuthHandle;
    files: FileStore;
}): Hono<SessionEnv> {
    const { db, files } = deps;
    const routes = new Hono<SessionEnv>();

    routes.use('*', noStore());
    routes.use('*', requireSession(deps.auth));

    // A profile picture arrives as base64 JSON, so its route has a larger
    // limit of its own.
    const generalLimit = bodyLimit({
        maxSize: BODY_LIMIT_BYTES,
        onError: (c) => c.json({ message: 'Payload too large' }, 413),
    });
    routes.use('*', (c, next) =>
        c.req.path.endsWith('/upload-profile-picture')
            ? next()
            : generalLimit(c, next)
    );

    routes.post(
        '/upload-profile-picture',
        bodyLimit({
            maxSize: AVATAR_BODY_LIMIT_BYTES,
            onError: (c) => c.json({ message: 'Payload too large' }, 413),
        }),
        async (c) => {
            const body = await readJsonBody(c);
            if (body === INVALID_JSON) {
                return c.json({ message: 'Invalid JSON' }, 400);
            }
            const result = uploadAvatar(
                db,
                files,
                c.get('userId'),
                body.imageData
            );
            if (!result.ok) return c.json({ message: result.message }, 400);
            return c.json({
                message: 'Profile picture uploaded successfully',
                url: result.url,
            });
        }
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
        return c.json({
            message: 'Successfully updated username',
            user: result.user,
            studysetsUpdated: result.studysetsUpdated,
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

    routes.post('/download-user-data', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) {
            return c.json({ message: 'Invalid JSON' }, 400);
        }
        const exported = buildUserDataExport(db, c.get('userId'), {
            includeStudysets: body.includeStudysets === true,
        });
        c.header(
            'Content-Disposition',
            `attachment; filename="quizaroni-data-${exported.exportedAt.slice(0, 10)}.json"`
        );
        return c.json(exported);
    });

    return routes;
}
