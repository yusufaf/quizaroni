import { describe, expect, test } from 'bun:test';
import { CLIENT_EDITABLE_USER_METADATA_KEYS } from '@quizaroni/shared-types';
import {
    type CustomAchievement,
    CustomAchievementSchema,
    deepMerge,
    emptyGamification,
    type GamificationState,
    MAX_UPDATES_BYTES,
    mergeCustomAchievements,
    mergeGamificationState,
    parseMetadataUpdates,
    parseNotificationUpdates,
    UpdateGamificationBodySchema,
} from './metadata';

function deepArray(depth: number): unknown {
    let value: unknown = [];
    for (let i = 0; i < depth; i++) value = [value];
    return value;
}

describe('parseMetadataUpdates', () => {
    test('keeps every client-editable key', () => {
        const raw = Object.fromEntries(
            CLIENT_EDITABLE_USER_METADATA_KEYS.map((key) => [key, `v-${key}`])
        );
        const result = parseMetadataUpdates(raw);
        expect(result).toEqual({ ok: true, value: raw });
    });

    test('drops server-managed, server-written and unknown keys', () => {
        const result = parseMetadataUpdates({
            homeView: 'grid',
            gamification: { currentStreak: 99 },
            notifications: { email: true },
            customAchievements: [],
            updatedAt: '2020-01-01',
            updatedBy: 'x',
            somethingElse: 1,
        });
        expect(result).toEqual({ ok: true, value: { homeView: 'grid' } });
    });

    test.each([[[]], ['dark'], [null], [undefined], [42]])(
        'rejects %p as not an object',
        (raw) => {
            expect(parseMetadataUpdates(raw)).toEqual({
                ok: false,
                status: 400,
                message: 'Invalid updates',
            });
        }
    );

    test('rejects a non-finite number', () => {
        const result = parseMetadataUpdates(JSON.parse('{"homeView":1e999}'));
        expect(result).toMatchObject({ ok: false, status: 400 });
    });

    test('rejects very deep nesting without throwing', () => {
        const result = parseMetadataUpdates({ homeView: deepArray(100_000) });
        expect(result).toMatchObject({ ok: false, status: 400 });
    });

    test('413s just over the cap', () => {
        const result = parseMetadataUpdates({
            homeView: 'x'.repeat(MAX_UPDATES_BYTES),
        });
        expect(result).toEqual({
            ok: false,
            status: 413,
            message: 'Updates too large',
        });
    });

    test('does not count a dropped key toward the cap', () => {
        const result = parseMetadataUpdates({
            gamification: 'x'.repeat(300 * 1024),
            homeView: 'grid',
        });
        expect(result).toEqual({ ok: true, value: { homeView: 'grid' } });
    });

    test('accepts a preset-sized avatar', () => {
        const avatar = `data:image/svg+xml;utf8,${'<g/>'.repeat(9_000)}`;
        expect(parseMetadataUpdates({ avatar })).toEqual({
            ok: true,
            value: { avatar },
        });
    });
});

describe('parseNotificationUpdates', () => {
    test('keeps any key', () => {
        expect(parseNotificationUpdates({ email: { enabled: true } })).toEqual({
            ok: true,
            value: { email: { enabled: true } },
        });
    });

    test('rejects a string and oversized input', () => {
        expect(parseNotificationUpdates('on')).toMatchObject({ status: 400 });
        expect(
            parseNotificationUpdates({ x: 'x'.repeat(MAX_UPDATES_BYTES) })
        ).toMatchObject({ status: 413 });
    });
});

describe('deepMerge', () => {
    test('merges nested objects and keeps untouched keys', () => {
        const merged = deepMerge(
            { email: { enabled: false, weeklyDigest: true } },
            { email: { enabled: true } }
        );
        expect(merged).toEqual({ email: { enabled: true, weeklyDigest: true } });
    });

    test('replaces arrays and skips undefined', () => {
        const merged = deepMerge(
            { days: [1, 2, 3], keep: 'yes' },
            { days: [4], keep: undefined }
        );
        expect(merged).toEqual({ days: [4], keep: 'yes' });
    });

    test('ignores prototype keys', () => {
        const merged = deepMerge({}, JSON.parse('{"__proto__":{"x":1}}'));
        expect(({} as { x?: number }).x).toBeUndefined();
        expect((merged as { x?: number }).x).toBeUndefined();
        expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
    });
});

function gamification(
    overrides: Partial<GamificationState> = {}
): GamificationState {
    return { ...emptyGamification(), ...overrides };
}

describe('mergeGamificationState', () => {
    test('the later study date wins with its streak', () => {
        const merged = mergeGamificationState(
            gamification({ lastStudyDate: '2026-11-01', currentStreak: 9 }),
            gamification({ lastStudyDate: '2026-11-03', currentStreak: 2 })
        );
        expect(merged).toMatchObject({
            lastStudyDate: '2026-11-03',
            currentStreak: 2,
        });
    });

    test('the same date takes the larger streak', () => {
        const merged = mergeGamificationState(
            gamification({ lastStudyDate: '2026-11-03', currentStreak: 4 }),
            gamification({ lastStudyDate: '2026-11-03', currentStreak: 2 })
        );
        expect(merged.currentStreak).toBe(4);
    });

    test('unions achievements and keeps the earliest unlock time', () => {
        const merged = mergeGamificationState(
            gamification({
                longestStreak: 7,
                unlockedAchievementIds: ['a', 'b'],
                unlockedAtById: { a: '2026-01-02', b: '2026-01-05' },
                studiedStudysetUUIDs: ['s1'],
                studysetSessionCounts: { s1: 3, s2: 1 },
            }),
            gamification({
                longestStreak: 3,
                unlockedAchievementIds: ['a', 'c'],
                unlockedAtById: { a: '2026-01-01', c: '2026-01-09' },
                studiedStudysetUUIDs: ['s2'],
                studysetSessionCounts: { s1: 2, s2: 5 },
            })
        );
        expect(merged).toMatchObject({
            longestStreak: 7,
            unlockedAchievementIds: ['a', 'b', 'c'],
            unlockedAtById: {
                a: '2026-01-01',
                b: '2026-01-05',
                c: '2026-01-09',
            },
            studiedStudysetUUIDs: ['s1', 's2'],
            studysetSessionCounts: { s1: 3, s2: 5 },
        });
    });
});

function achievement(
    overrides: Partial<CustomAchievement> = {}
): CustomAchievement {
    return {
        id: 'x',
        title: 'T',
        description: 'D',
        icon: 'star',
        metric: 'total_sessions',
        threshold: 5,
        createdAt: '2026-01-02T00:00:00.000Z',
        ...overrides,
    };
}

describe('mergeCustomAchievements', () => {
    test('merges the same id keeping the earliest times', () => {
        const merged = mergeCustomAchievements(
            [achievement({ unlockedAt: '2026-02-01T00:00:00.000Z' })],
            [
                achievement({
                    title: 'New',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    unlockedAt: '2026-03-01T00:00:00.000Z',
                }),
                achievement({ id: 'y' }),
            ]
        );
        expect(merged).toHaveLength(2);
        expect(merged[0]).toMatchObject({
            title: 'New',
            createdAt: '2026-01-01T00:00:00.000Z',
            unlockedAt: '2026-02-01T00:00:00.000Z',
        });
    });
});

describe('gamification schemas', () => {
    test('reject a bad metric and a non-ISO createdAt', () => {
        expect(
            CustomAchievementSchema.safeParse(
                achievement({ metric: 'bogus' as CustomAchievement['metric'] })
            ).success
        ).toBe(false);
        expect(
            CustomAchievementSchema.safeParse(
                achievement({ createdAt: 'yesterday' })
            ).success
        ).toBe(false);
    });

    test('strip unknown keys', () => {
        const parsed = UpdateGamificationBodySchema.parse({
            gamification: { ...emptyGamification(), extra: 1 },
            customAchievements: [{ ...achievement(), extra: 2 }],
            extra: 3,
        });
        expect(parsed).toEqual({
            gamification: emptyGamification(),
            customAchievements: [achievement()],
        });
    });
});
