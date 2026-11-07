import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import type { Db } from '../db';
import { studyset } from '../db/schema';
import { LISTED } from '../studysets/gate';
import { isStudysetUUID } from '../studysets/updates';
import {
    decodeCursor,
    encodeCursor,
    featuredSummaries,
    filterKey,
    loadIndex,
    paginate,
    parseExploreQuery,
    selectEntries,
    summariesFor,
} from './explore';
import { toPublicStudyset } from './views';

// Anonymous reads. Every query goes through LISTED, so a private, hidden or
// never-published set looks the same as a missing one.
export function publicRoutes(deps: { db: Db }): Hono {
    const { db } = deps;
    const routes = new Hono();

    routes.use('*', async (c, next) => {
        await next();
        c.header('Cache-Control', 'no-cache');
    });

    routes.get('/studyset/:studysetUUID', (c) => {
        const id = c.req.param('studysetUUID');
        const row = isStudysetUUID(id)
            ? db
                  .select()
                  .from(studyset)
                  .where(and(eq(studyset.studysetUUID, id), LISTED))
                  .get()
            : undefined;
        if (!row) {
            return c.json(
                { message: 'This study set is private or does not exist.' },
                404
            );
        }
        return c.json({
            message: 'Successfully retrieved public study set',
            studyset: toPublicStudyset(row),
        });
    });

    routes.get('/explore', (c) => {
        const query = parseExploreQuery(c.req.query());
        if (!query.ok) return c.json({ message: query.message }, 400);
        if ('featured' in query) {
            return c.json({
                items: featuredSummaries(db, query.limit),
                nextCursor: null,
                featured: true,
            });
        }
        const key = filterKey(query.filters);
        let after;
        if (query.cursor) {
            const decoded = decodeCursor(query.cursor, key);
            if (!decoded.ok) {
                const message =
                    decoded.reason === 'filterMismatch'
                        ? 'Invalid cursor for these filters'
                        : 'Invalid cursor';
                return c.json({ message }, 400);
            }
            after = decoded.position;
        }
        const { entries, truncated } = loadIndex(db);
        const visible = selectEntries(entries, query.filters);
        const { page, next } = paginate(visible, { after, limit: query.limit });
        return c.json({
            items: summariesFor(
                db,
                page.map((entry) => entry.studysetUUID)
            ),
            nextCursor: next ? encodeCursor(next, key) : null,
            ...(!truncated && { total: visible.length }),
        });
    });

    return routes;
}
