import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthHandle } from '../auth/auth';
import { normalizeEmail } from '../config';
import type { Db } from '../db';
import { INVALID_JSON, readJsonBody } from '../http/json-body';
import { noStore, requireAdmin, type SessionEnv } from '../http/session';
import {
    createInvite,
    findUsableInvite,
    INVITE_DAYS_MAX,
    INVITE_USES_MAX,
    inviteLink,
    listInvites,
    revokeInvite,
} from '../invites/invites';
import type { Mailer } from '../mail/mailer';
import { inviteMessage } from '../mail/messages';

const BODY_LIMIT_BYTES = 16 * 1024;

const CreateInviteSchema = z.strictObject({
    email: z.string().optional(),
    days: z.number().int().min(1).max(INVITE_DAYS_MAX).optional(),
    maxUses: z.number().int().min(1).max(INVITE_USES_MAX).optional(),
});

export function adminRoutes(deps: {
    db: Db;
    auth: AuthHandle;
    mailer: Mailer;
}): Hono<SessionEnv> {
    const { db, mailer } = deps;
    const routes = new Hono<SessionEnv>();

    routes.use('*', noStore());
    routes.use('*', requireAdmin(deps.auth));
    routes.post(
        '*',
        bodyLimit({
            maxSize: BODY_LIMIT_BYTES,
            onError: (c) => c.json({ message: 'Payload too large' }, 413),
        })
    );

    routes.get('/invites', (c) => c.json({ invites: listInvites(db) }));

    routes.post('/invites', async (c) => {
        const body = await readJsonBody(c);
        if (body === INVALID_JSON) {
            return c.json({ message: 'Invalid JSON' }, 400);
        }
        const parsed = CreateInviteSchema.safeParse(body);
        if (!parsed.success) {
            return c.json({ message: 'Invalid invite' }, 400);
        }
        const { days, maxUses } = parsed.data;
        // A blank email field means "anyone".
        const rawEmail = parsed.data.email?.trim() || undefined;
        const email =
            rawEmail === undefined ? undefined : normalizeEmail(rawEmail);
        if (rawEmail !== undefined && email === undefined) {
            return c.json({ message: 'Invalid email' }, 400);
        }
        if (email !== undefined && maxUses !== undefined && maxUses > 1) {
            return c.json(
                { message: 'An invite for one email can be used once' },
                400
            );
        }
        const { invite, token } = createInvite(db, {
            createdBy: c.get('userId'),
            email,
            days,
            maxUses,
        });
        const publicUrl = deps.auth().publicUrl;
        const link = inviteLink(publicUrl, token);
        if (email === undefined) return c.json({ invite, link }, 201);
        const delivery = await mailer.deliver(
            inviteMessage({
                to: email,
                link,
                publicUrl,
                expiresAt: new Date(invite.expiresAt),
            })
        );
        return c.json({ invite, link, delivery }, 201);
    });

    routes.post('/invites/:id/revoke', (c) => {
        const invite = revokeInvite(db, c.req.param('id'));
        if (!invite) return c.json({ message: 'Not found' }, 404);
        return c.json({ invite });
    });

    // Hides an invite's message once the invite is used, revoked or expired;
    // the row itself goes when it expires. A link that can't be read stays.
    const inviteStillUsable = (link: string): boolean => {
        let token: string | null;
        try {
            token = new URL(link).searchParams.get('invite');
        } catch {
            return true;
        }
        return !token || findUsableInvite(db, token) !== undefined;
    };

    routes.get('/outbox', (c) => {
        const messages = mailer
            .listOutbox()
            .filter((m) => m.kind !== 'invite' || inviteStillUsable(m.link));
        return c.json({ smtp: mailer.smtpEnabled, messages });
    });

    return routes;
}
