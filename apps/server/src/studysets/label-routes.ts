import type { Context, Hono } from 'hono';
import type { Db } from '../db';
import { INVALID_JSON, readJsonBody } from '../http/json-body';
import type { SessionEnv } from '../http/session';
import type { JsonObject } from '../users/metadata';
import {
    createLabel,
    deleteLabels,
    isLabel,
    labelListSchema,
    MAX_PROFILE_LABELS,
    parseLabelAssignments,
    renameLabel,
    setStudysetLabels,
} from './labels';
import { message } from './respond';
import { StudysetTooLargeError } from './store';
import { isStudysetUUID } from './updates';

type Handler = (body: JsonObject, userId: string) => Response;

// Reads the body and turns a set over the size cap into a 413; the label
// change rolls back with it.
function route(c: Context<SessionEnv>, run: Handler): Promise<Response> {
    return readJsonBody(c).then((body) => {
        if (body === INVALID_JSON) return message(c, 'Invalid JSON', 400);
        try {
            return run(body, c.get('userId'));
        } catch (err) {
            if (err instanceof StudysetTooLargeError) {
                return message(c, 'Study set too large', 413);
            }
            throw err;
        }
    });
}

export function addLabelRoutes(routes: Hono<SessionEnv>, db: Db): void {
    routes.post('/create-labels', (c) =>
        route(c, (body, userId) => {
            if (!isLabel(body.label)) return message(c, 'Invalid label', 400);
            const { updateStudysetLabel } = body;
            if (
                updateStudysetLabel !== undefined &&
                typeof updateStudysetLabel !== 'boolean'
            ) {
                return message(c, 'Invalid updateStudysetLabel', 400);
            }
            let target: string | undefined;
            if (updateStudysetLabel === true) {
                if (!isStudysetUUID(body.studysetUUID)) {
                    return message(c, 'Invalid studysetUUID', 400);
                }
                target = body.studysetUUID;
            }
            const result = createLabel(db, userId, body.label, target);
            if (result.status === 'not_found') {
                return message(c, 'Study set not found', 404);
            }
            if (result.status === 'too_many') {
                return message(c, 'Too many labels', 400);
            }
            return c.json({ message: 'Successfully created label' });
        })
    );

    routes.post('/edit-labels', (c) =>
        route(c, (body, userId) => {
            const { oldLabel, newLabel } = body;
            if (
                typeof oldLabel !== 'string' ||
                oldLabel === '' ||
                !isLabel(newLabel)
            ) {
                return message(c, 'Invalid label', 400);
            }
            const result = renameLabel(db, userId, oldLabel, newLabel);
            if (result.status === 'not_found') {
                return message(c, 'Label not found', 404);
            }
            if (result.status === 'exists') {
                return message(c, 'Label already exists', 409);
            }
            return c.json({ message: 'Successfully edited label' });
        })
    );

    routes.post('/delete-labels', (c) =>
        route(c, (body, userId) => {
            const parsed = labelListSchema
                .max(MAX_PROFILE_LABELS)
                .safeParse(body.labelsToDelete);
            if (!parsed.success) {
                return message(c, 'Invalid labelsToDelete', 400);
            }
            deleteLabels(db, userId, parsed.data);
            return c.json({ message: 'Successfully deleted labels' });
        })
    );

    routes.post('/update-studyset-labels', (c) =>
        route(c, (body, userId) => {
            if (!isStudysetUUID(body.studysetUUID)) {
                return message(c, 'Invalid studysetUUID', 400);
            }
            const labels = labelListSchema.safeParse(body.labels);
            if (!labels.success) return message(c, 'Invalid labels', 400);
            const { notFound } = setStudysetLabels(db, userId, [
                [body.studysetUUID, labels.data],
            ]);
            if (notFound.length > 0) {
                return message(c, 'Study set not found', 404);
            }
            return c.json({ message: 'Successfully updated studyset labels' });
        })
    );

    routes.post('/batch-update-studyset-labels', (c) =>
        route(c, (body, userId) => {
            const parsed = parseLabelAssignments(body.studysetUpdates);
            if (!parsed.ok) return message(c, parsed.message, parsed.status);
            const { updated, notFound } = setStudysetLabels(
                db,
                userId,
                parsed.value
            );
            const result = {
                updatedStudysetUUIDs: updated,
                notFoundStudysetUUIDs: notFound,
                failedStudysetUUIDs: [],
            };
            if (notFound.length > 0) {
                return c.json(
                    {
                        message: 'Some studysets could not be updated',
                        ...result,
                    },
                    404
                );
            }
            return c.json({
                message: `Successfully updated ${updated.length} studyset(s)`,
                ...result,
            });
        })
    );
}
