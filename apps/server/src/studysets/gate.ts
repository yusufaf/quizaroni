import {
    isSubjectId,
    type PublishError,
    type SubjectId,
} from '@quizaroni/shared-types';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { studyset } from '../db/schema';

export const MIN_PUBLISHABLE_CARDS = 4;

const filled = (value: unknown) =>
    typeof value === 'string' && value.trim() !== '';

// A card counts once both its term and definition hold text.
export function countCompleteCards(cards: readonly unknown[]): number {
    return cards.filter(
        (card) =>
            typeof card === 'object' &&
            card !== null &&
            !Array.isArray(card) &&
            filled((card as Record<string, unknown>).term) &&
            filled((card as Record<string, unknown>).definition)
    ).length;
}

export function cardsGateError(
    cards: readonly unknown[]
): Extract<PublishError, { code: 'notEnoughCards' }> | undefined {
    const actual = countCompleteCards(cards);
    return actual < MIN_PUBLISHABLE_CARDS
        ? { code: 'notEnoughCards', required: MIN_PUBLISHABLE_CARDS, actual }
        : undefined;
}

type Row = typeof studyset.$inferSelect;
export type Listable = Pick<Row, 'isPublic' | 'hiddenAt' | 'publishedAt'>;

// The one rule for what anyone may see: public, published and not hidden.
// Every public path uses this or LISTED.
export function isListed(row: Listable): boolean {
    return row.isPublic && row.hiddenAt === null && row.publishedAt !== null;
}

export const LISTED = and(
    eq(studyset.isPublic, true),
    isNull(studyset.hiddenAt),
    isNotNull(studyset.publishedAt)
)!;

// A hidden set is refused on that ground alone.
export function validatePublish(
    subject: unknown,
    row: { cards: readonly unknown[]; hiddenAt: Date | null }
): { ok: true; subject: SubjectId } | { ok: false; errors: PublishError[] } {
    if (row.hiddenAt !== null) {
        return { ok: false, errors: [{ code: 'hidden' }] };
    }
    const errors: PublishError[] = [];
    if (!isSubjectId(subject)) errors.push({ code: 'invalidSubject' });
    const cardsError = cardsGateError(row.cards);
    if (cardsError) errors.push(cardsError);
    return errors.length === 0
        ? { ok: true, subject: subject as SubjectId }
        : { ok: false, errors };
}
