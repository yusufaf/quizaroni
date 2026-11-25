import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';
import {
    applySessionToGamification,
    createInitialGamificationState,
    evaluatePresetAchievements,
    getDateKey,
    getEffectiveStreak,
    getYesterdayKey,
    mergeCustomAchievements,
    mergeGamificationState,
    migrateUtcDayKey,
    updateDailyStreak,
} from './gamification';
import type { StudySessionResult, StudyStatistics } from 'shared/types';

const baseSession = (
    overrides: Partial<StudySessionResult> = {}
): StudySessionResult => ({
    sessionUUID: 'session-1',
    studysetUUID: 'set-1',
    mode: 'flashcards',
    totalCards: 5,
    correctAnswers: 5,
    score: 500,
    timeSpent: 120,
    accuracy: 100,
    streak: 5,
    completedAt: '2026-06-05T12:00:00.000Z',
    achievements: [],
    ...overrides,
});

const baseStatistics = (
    overrides: Partial<StudyStatistics> = {}
): StudyStatistics => ({
    totalSessions: 0,
    totalCardsStudied: 0,
    averageAccuracy: 0,
    totalTimeSpent: 0,
    achievements: [],
    progressByStudyset: new Map(),
    ...overrides,
});

describe('updateDailyStreak', () => {
    it('starts a streak on first study day', () => {
        const state = createInitialGamificationState();
        const today = new Date('2026-06-05T10:00:00.000Z');

        const result = updateDailyStreak(state, today);

        expect(result.currentStreak).toBe(1);
        expect(result.longestStreak).toBe(1);
        expect(result.lastStudyDate).toBe(getDateKey(today));
    });

    it('extends streak when studying on consecutive days', () => {
        const yesterday = new Date('2026-06-04T10:00:00.000Z');
        const today = new Date('2026-06-05T10:00:00.000Z');
        const state = {
            ...createInitialGamificationState(),
            currentStreak: 2,
            longestStreak: 2,
            lastStudyDate: getDateKey(yesterday),
        };

        const result = updateDailyStreak(state, today);

        expect(result.currentStreak).toBe(3);
        expect(result.longestStreak).toBe(3);
    });

    it('resets streak after a gap', () => {
        const today = new Date('2026-06-05T10:00:00.000Z');
        const state = {
            ...createInitialGamificationState(),
            currentStreak: 5,
            longestStreak: 5,
            lastStudyDate: '2026-06-01',
        };

        const result = updateDailyStreak(state, today);

        expect(result.currentStreak).toBe(1);
        expect(result.longestStreak).toBe(5);
    });

    it('does not increment streak twice on the same day', () => {
        const today = new Date('2026-06-05T10:00:00.000Z');
        const state = {
            ...createInitialGamificationState(),
            currentStreak: 3,
            longestStreak: 3,
            lastStudyDate: getDateKey(today),
        };

        const result = updateDailyStreak(state, today);

        expect(result.currentStreak).toBe(3);
    });
});

describe('evaluatePresetAchievements', () => {
    it('unlocks first study and perfect score on initial session', () => {
        const session = baseSession();
        const gamification = applySessionToGamification(
            createInitialGamificationState(),
            session
        );

        const unlocked = evaluatePresetAchievements({
            gamification,
            statistics: baseStatistics(),
            session,
        });

        expect(unlocked).toContain('first-study');
        expect(unlocked).toContain('perfect-score');
    });

    it('unlocks streak-7 when daily streak reaches 7', () => {
        const session = baseSession({ accuracy: 80, streak: 2 });
        const gamification = {
            ...createInitialGamificationState(),
            currentStreak: 7,
            longestStreak: 7,
            lastStudyDate: getDateKey(new Date('2026-06-05T10:00:00.000Z')),
        };

        const unlocked = evaluatePresetAchievements({
            gamification,
            statistics: baseStatistics({ totalSessions: 5 }),
            session,
        });

        expect(unlocked).toContain('streak-7');
    });
});

describe('getYesterdayKey', () => {
    it('returns previous calendar day', () => {
        const today = new Date('2026-06-05T10:00:00.000Z');
        expect(getYesterdayKey(today)).toBe('2026-06-04');
    });
});

describe('mergeGamificationState', () => {
    it('unions achievements and keeps earliest unlock timestamps', () => {
        const local = {
            ...createInitialGamificationState(),
            unlockedAchievementIds: ['first-study'],
            unlockedAtById: { 'first-study': '2026-06-01T10:00:00.000Z' },
            studysetSessionCounts: { 'set-1': 3 },
        };
        const remote = {
            ...createInitialGamificationState(),
            unlockedAchievementIds: ['perfect-score'],
            unlockedAtById: { 'perfect-score': '2026-06-02T10:00:00.000Z' },
            studysetSessionCounts: { 'set-1': 5 },
        };

        const merged = mergeGamificationState(local, remote);

        expect(merged.unlockedAchievementIds).toEqual(
            expect.arrayContaining(['first-study', 'perfect-score'])
        );
        expect(merged.studysetSessionCounts['set-1']).toBe(5);
    });
});

describe('mergeCustomAchievements', () => {
    it('merges custom goals by id and keeps earliest unlock', () => {
        const local = [
            {
                id: 'goal-1',
                title: 'Local goal',
                description: '',
                icon: '🎯',
                metric: 'total_sessions' as const,
                threshold: 5,
                createdAt: '2026-06-01T00:00:00.000Z',
                unlockedAt: '2026-06-03T00:00:00.000Z',
            },
        ];
        const remote = [
            {
                id: 'goal-1',
                title: 'Remote goal',
                description: '',
                icon: '🎯',
                metric: 'total_sessions' as const,
                threshold: 5,
                createdAt: '2026-06-02T00:00:00.000Z',
                unlockedAt: '2026-06-02T00:00:00.000Z',
            },
        ];

        const merged = mergeCustomAchievements(local, remote);

        expect(merged).toHaveLength(1);
        expect(merged[0]?.unlockedAt).toBe('2026-06-02T00:00:00.000Z');
    });
});

describe('getEffectiveStreak', () => {
    const today = new Date('2026-10-18T12:00:00.000Z');
    const studied = (lastStudyDate: string | null, currentStreak = 5) => ({
        currentStreak,
        lastStudyDate,
    });

    it('keeps the streak when the last study day is today', () => {
        expect(getEffectiveStreak(studied('2026-10-18'), today)).toEqual({
            days: 5,
            atRisk: false,
        });
    });

    it('marks the streak at risk when the last study day was yesterday', () => {
        expect(getEffectiveStreak(studied('2026-10-17'), today)).toEqual({
            days: 5,
            atRisk: true,
        });
    });

    it.each(['2026-10-16', '2026-09-01'])(
        'treats a gap of 2+ days (%s) as a broken streak',
        (lastStudyDate) => {
            expect(getEffectiveStreak(studied(lastStudyDate), today)).toEqual({
                days: 0,
                atRisk: false,
            });
        }
    );

    it('returns no streak without any study history', () => {
        expect(
            getEffectiveStreak(createInitialGamificationState(), today)
        ).toEqual({ days: 0, atRisk: false });
    });

    it('returns no streak when the stored streak is zero', () => {
        expect(getEffectiveStreak(studied('2026-10-18', 0), today)).toEqual({
            days: 0,
            atRisk: false,
        });
    });

    it('counts a study day one day ahead (another time zone) as today', () => {
        expect(getEffectiveStreak(studied('2026-10-19'), today)).toEqual({
            days: 5,
            atRisk: false,
        });
    });

    it('treats a study day two or more days ahead as broken', () => {
        expect(getEffectiveStreak(studied('2026-10-20'), today)).toEqual({
            days: 0,
            atRisk: false,
        });
    });
});

// Assigning TZ re-reads the zone; deleting it does not, so restore by name.
const useTimeZone = (zone: string) => {
    const host = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let previous: string | undefined;
    beforeAll(() => {
        previous = process.env.TZ;
        process.env.TZ = zone;
    });
    afterAll(() => {
        process.env.TZ = previous ?? host;
    });
};

const at = (iso: string) => new Date(iso);

const studiedAt = (...instants: string[]) =>
    instants.reduce(
        (state, iso) => ({ ...state, ...updateDailyStreak(state, at(iso)) }),
        createInitialGamificationState()
    );

describe('day keys in America/Los_Angeles', () => {
    useTimeZone('America/Los_Angeles');

    it('uses the local date, not the UTC one', () => {
        expect(getDateKey(at('2026-06-05T01:00:00Z'))).toBe('2026-06-04');
    });

    it('steps back one local day after UTC midnight', () => {
        expect(getYesterdayKey(at('2026-06-06T03:00:00Z'))).toBe('2026-06-04');
    });

    it('steps back across the spring-forward change', () => {
        expect(getYesterdayKey(at('2026-03-09T06:30:00Z'))).toBe('2026-03-07');
    });
});

describe('updateDailyStreak around local midnight', () => {
    describe('in America/Los_Angeles', () => {
        useTimeZone('America/Los_Angeles');

        it('continues the streak across local midnight', () => {
            expect(
                studiedAt('2026-06-05T06:30:00Z', '2026-06-05T07:30:00Z')
            ).toMatchObject({ currentStreak: 2, lastStudyDate: '2026-06-05' });
        });

        it('counts an afternoon and an evening as one local day', () => {
            expect(
                studiedAt('2026-06-04T23:00:00Z', '2026-06-05T01:00:00Z')
            ).toMatchObject({ currentStreak: 1, lastStudyDate: '2026-06-04' });
        });

        it('keeps the streak when the stored day is one day ahead', () => {
            const state = {
                ...createInitialGamificationState(),
                currentStreak: 3,
                longestStreak: 3,
                lastStudyDate: '2026-06-05',
            };
            expect(
                updateDailyStreak(state, at('2026-06-05T01:00:00Z'))
            ).toMatchObject({ currentStreak: 3, lastStudyDate: '2026-06-04' });
        });

        it('resets when the stored day is two days ahead', () => {
            const state = {
                ...createInitialGamificationState(),
                currentStreak: 3,
                longestStreak: 3,
                lastStudyDate: '2026-06-06',
            };
            expect(
                updateDailyStreak(state, at('2026-06-05T01:00:00Z'))
            ).toMatchObject({ currentStreak: 1, lastStudyDate: '2026-06-04' });
        });
    });

    describe('in Asia/Tokyo', () => {
        useTimeZone('Asia/Tokyo');

        it('counts a morning and an evening as one local day', () => {
            expect(
                studiedAt('2026-06-04T23:00:00Z', '2026-06-05T11:00:00Z')
            ).toMatchObject({ currentStreak: 1, lastStudyDate: '2026-06-05' });
        });
    });
});

describe('getEffectiveStreak around local midnight', () => {
    describe('in America/Los_Angeles', () => {
        useTimeZone('America/Los_Angeles');

        it('is at risk the morning after an evening session', () => {
            const state = {
                ...studiedAt('2026-06-05T01:00:00Z'),
                currentStreak: 4,
            };
            expect(
                getEffectiveStreak(state, at('2026-06-05T16:00:00Z'))
            ).toEqual({ days: 4, atRisk: true });
        });

        it('is broken two local days after a late-night session', () => {
            const state = {
                ...studiedAt('2026-06-05T06:30:00Z'),
                currentStreak: 4,
            };
            expect(
                getEffectiveStreak(state, at('2026-06-06T07:30:00Z'))
            ).toEqual({ days: 0, atRisk: false });
        });
    });

    describe('in Asia/Tokyo', () => {
        useTimeZone('Asia/Tokyo');

        it('is not at risk on the evening of a morning session', () => {
            const state = {
                ...studiedAt('2026-06-04T23:00:00Z'),
                currentStreak: 3,
            };
            expect(
                getEffectiveStreak(state, at('2026-06-05T11:00:00Z'))
            ).toEqual({ days: 3, atRisk: false });
        });
    });
});

const legacy = (lastStudyDate: string | null) => ({
    ...createInitialGamificationState(),
    currentStreak: 4,
    longestStreak: 4,
    lastStudyDate,
});

describe('migrateUtcDayKey east of UTC', () => {
    useTimeZone('Asia/Tokyo');

    it('reads a key without a timestamp as the next local day', () => {
        expect(
            migrateUtcDayKey(
                '2026-06-04',
                undefined,
                at('2026-06-10T03:00:00Z')
            )
        ).toBe('2026-06-05');
    });

    it('never moves a key past today', () => {
        expect(
            migrateUtcDayKey(
                '2026-06-05',
                undefined,
                at('2026-06-05T11:00:00Z')
            )
        ).toBe('2026-06-05');
    });

    it('leaves a missing or malformed key alone', () => {
        expect(migrateUtcDayKey(null, undefined)).toBeNull();
        expect(migrateUtcDayKey('not-a-date', undefined)).toBe('not-a-date');
    });

    it('keeps a key that already matches the day of the last write', () => {
        expect(
            migrateUtcDayKey(
                '2026-06-05',
                Date.parse('2026-06-05T06:00:00Z'),
                at('2026-06-06T01:00:00Z')
            )
        ).toBe('2026-06-05');
    });

    it('moves at most to the day of the last write', () => {
        expect(
            migrateUtcDayKey(
                '2026-06-05',
                Date.parse('2026-06-06T00:00:00Z'),
                at('2026-06-07T03:00:00Z')
            )
        ).toBe('2026-06-06');
    });

    it('never moves a key earlier than it could have meant', () => {
        expect(
            migrateUtcDayKey('2026-06-05', 0, at('2026-06-07T03:00:00Z'))
        ).toBe('2026-06-05');
    });

    // A signed-in start re-saves the record just before the update prompt, so
    // the bound is today and the key lands one day late (accepted drift).
    it('lands on today when the last write was this morning', () => {
        expect(
            migrateUtcDayKey(
                '2026-06-05',
                Date.parse('2026-06-06T01:00:00Z'),
                at('2026-06-06T01:05:00Z')
            )
        ).toBe('2026-06-06');
    });

    it('keeps a streak studied before UTC midnight', () => {
        const now = at('2026-06-06T03:00:00Z');
        const migrated = {
            ...legacy('2026-06-04'),
            lastStudyDate: migrateUtcDayKey(
                '2026-06-04',
                Date.parse('2026-06-04T23:00:00Z'),
                now
            ),
        };
        expect(migrated.lastStudyDate).toBe('2026-06-05');
        expect(getEffectiveStreak(migrated, now)).toEqual({
            days: 4,
            atRisk: true,
        });
        expect(updateDailyStreak(migrated, now).currentStreak).toBe(5);
        expect(getEffectiveStreak(legacy('2026-06-04'), now)).toEqual({
            days: 0,
            atRisk: false,
        });
    });

    it('keeps a streak studied after UTC midnight at risk the next day', () => {
        const now = at('2026-06-06T01:00:00Z');
        const migrated = {
            ...legacy('2026-06-05'),
            lastStudyDate: migrateUtcDayKey(
                '2026-06-05',
                Date.parse('2026-06-05T06:00:00Z'),
                now
            ),
        };
        expect(getEffectiveStreak(migrated, now)).toEqual({
            days: 4,
            atRisk: true,
        });
        expect(updateDailyStreak(migrated, now).currentStreak).toBe(5);
    });
});

describe('migrateUtcDayKey west of UTC', () => {
    useTimeZone('America/Los_Angeles');

    it('keeps a key without a timestamp', () => {
        expect(
            migrateUtcDayKey(
                '2026-06-04',
                undefined,
                at('2026-06-10T03:00:00Z')
            )
        ).toBe('2026-06-04');
    });

    it('never moves a key past today', () => {
        expect(
            migrateUtcDayKey(
                '2026-06-05',
                undefined,
                at('2026-06-05T01:00:00Z')
            )
        ).toBe('2026-06-04');
    });

    it('never moves a key earlier than it could have meant', () => {
        expect(
            migrateUtcDayKey('2026-06-05', 0, at('2026-06-07T03:00:00Z'))
        ).toBe('2026-06-04');
    });

    it('moves an evening key back to the local day of the last write', () => {
        const now = at('2026-06-05T16:00:00Z');
        const migrated = {
            ...legacy('2026-06-05'),
            lastStudyDate: migrateUtcDayKey(
                '2026-06-05',
                Date.parse('2026-06-05T01:00:00Z'),
                now
            ),
        };
        expect(migrated.lastStudyDate).toBe('2026-06-04');
        expect(getEffectiveStreak(migrated, now)).toEqual({
            days: 4,
            atRisk: true,
        });
        expect(updateDailyStreak(migrated, now).currentStreak).toBe(5);
    });

    it('keeps the streak going without a timestamp', () => {
        const migrated = {
            ...legacy('2026-06-05'),
            lastStudyDate: migrateUtcDayKey(
                '2026-06-05',
                undefined,
                at('2026-06-05T16:00:00Z')
            ),
        };
        expect(migrated.lastStudyDate).toBe('2026-06-05');
        expect(
            updateDailyStreak(migrated, at('2026-06-06T16:00:00Z'))
                .currentStreak
        ).toBe(5);
    });
});
