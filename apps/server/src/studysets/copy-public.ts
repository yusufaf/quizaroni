import { and, eq, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { studyset, userProfile } from '../db/schema';
import { publicCardFiles } from '../public/views';
import { isPlainObject } from '../users/metadata';
import { LISTED } from './gate';
import {
    type Row,
    type StudysetView,
    StudysetTooLargeError,
    toView,
    viewBytes,
} from './store';
import {
    DEFAULT_STUDYSET_METADATA,
    type FileCopy,
    MAX_STUDYSET_BYTES,
    planCardFileCopies,
} from './updates';

const str = (value: unknown) => (typeof value === 'string' ? value : '');

// A saved copy of someone's public set keeps only what the public page
// shows: titles, terms, definitions and the shown images.
export function buildPublicCopy(
    source: Row,
    o: {
        newUUID: string;
        now: Date;
        ownerId: string;
        username: string | null;
        newId?: () => string;
    }
): Row {
    const newId = o.newId ?? (() => crypto.randomUUID());
    return {
        studysetUUID: o.newUUID,
        ownerId: o.ownerId,
        username: o.username,
        title: source.title,
        description: source.description,
        favorited: false,
        cards: source.cards.filter(isPlainObject).map((card) => ({
            cardUUID: newId(),
            term: str(card.term),
            definition: str(card.definition),
            categories: [],
            important: false,
            notes: [],
            files: publicCardFiles(card, source.studysetUUID).map((file) => ({
                key: file.key,
                association: file.association,
                size: typeof file.size === 'number' ? file.size : 0,
                signedURL: '',
                name:
                    file.association === 'term'
                        ? 'Term image'
                        : 'Definition image',
            })),
        })),
        categories: [],
        labels: [],
        metadata: structuredClone(DEFAULT_STUDYSET_METADATA),
        lastViewed: o.now,
        createdAt: o.now,
        updatedAt: o.now,
        subject: null,
        isPublic: false,
        publishedAt: null,
        featuredAt: null,
        hiddenAt: null,
        saveCount: 0,
        copiedFrom: source.studysetUUID,
    };
}

export function copyPublicStudyset(
    db: Db,
    saverId: string,
    sourceUUID: string,
    now = new Date()
):
    | { status: 'ok'; studyset: StudysetView; fileCopies: FileCopy[] }
    | { status: 'not_found' } {
    return db.transaction(
        (tx) => {
            const source = tx
                .select()
                .from(studyset)
                .where(and(eq(studyset.studysetUUID, sourceUUID), LISTED))
                .get();
            if (!source) return { status: 'not_found' as const };
            const username =
                tx
                    .select({ username: userProfile.username })
                    .from(userProfile)
                    .where(eq(userProfile.userId, saverId))
                    .get()?.username ?? null;
            const copy = buildPublicCopy(source, {
                newUUID: crypto.randomUUID(),
                now,
                ownerId: saverId,
                username,
            });
            const planned = planCardFileCopies(copy.cards, copy.studysetUUID);
            const row: Row = { ...copy, cards: planned.cards };
            if (viewBytes(row) > MAX_STUDYSET_BYTES) {
                throw new StudysetTooLargeError();
            }
            tx.insert(studyset).values(row).run();
            // A save count, not an edit: updatedAt stays as it was.
            tx.update(studyset)
                .set({ saveCount: sql`${studyset.saveCount} + 1` })
                .where(eq(studyset.studysetUUID, sourceUUID))
                .run();
            return {
                status: 'ok' as const,
                studyset: toView(row),
                fileCopies: planned.copies,
            };
        },
        { behavior: 'immediate' }
    );
}
