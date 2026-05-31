import type { CardProgress, UUID } from 'shared/types';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

// Grade -> SM-2 quality (0-5). >=3 is a passing recall.
export const GRADE_QUALITY: Record<Grade, number> = {
    again: 1,
    hard: 3,
    good: 4,
    easy: 5,
};

export function newProgress(cardUUID: UUID): CardProgress {
    const now = new Date().toISOString();
    return {
        cardUUID,
        lastStudied: now,
        nextReview: now,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        masteryLevel: 'new',
    };
}

function masteryFor(repetitions: number): CardProgress['masteryLevel'] {
    if (repetitions >= 5) return 'mastered';
    if (repetitions >= 2) return 'review';
    if (repetitions >= 1) return 'learning';
    return 'new';
}

// Pure SM-2 step. Returns a new CardProgress; does not mutate `prev`.
export function computeSm2(prev: CardProgress, quality: number): CardProgress {
    let { easeFactor, interval, repetitions } = prev;

    if (quality >= 3) {
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    } else {
        repetitions = 0;
        interval = 1;
    }

    easeFactor =
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);

    const lastStudied = new Date();
    const nextReview = new Date(lastStudied);
    nextReview.setDate(nextReview.getDate() + interval);

    return {
        ...prev,
        lastStudied: lastStudied.toISOString(),
        nextReview: nextReview.toISOString(),
        easeFactor,
        interval,
        repetitions,
        masteryLevel: masteryFor(repetitions),
    };
}

// Interval (days) a given grade would yield, without side effects.
export function projectInterval(prev: CardProgress, grade: Grade): number {
    return computeSm2(prev, GRADE_QUALITY[grade]).interval;
}

export function isDue(progress: CardProgress, now: Date = new Date()): boolean {
    return new Date(progress.nextReview).getTime() <= now.getTime();
}

export function sortByNextReview(list: CardProgress[]): CardProgress[] {
    return [...list].sort(
        (a, b) =>
            new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
    );
}
