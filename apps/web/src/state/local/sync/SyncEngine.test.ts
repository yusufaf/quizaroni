// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import {
    DEFAULT_NOTIFICATION_PREFERENCES,
    DEFAULT_USER_DATA,
} from 'shared/constants';
import type { Studyset, User, UUID } from 'shared/types';
import { HttpError } from 'state/api/awsAPI';
import { getDatabase } from '../db';
import { claimLocalData, clearLocalData } from '../localData';
import { setClaimedOwner } from '../owner';
import { studysetRepository, userRepository } from '../repositories';
import { SyncEngine, isRetryableSyncError } from './SyncEngine';

afterEach(async () => {
    await clearLocalData();
    localStorage.clear();
    setClaimedOwner(null);
});

const apiClientWith = (
    updateUserMetadata: (updates: Record<string, unknown>) => Promise<unknown>
) => ({
    updateUserMetadata,
    updateStudyset: vi.fn(),
    createStudyset: vi.fn(),
    deleteStudyset: vi.fn(),
});

const set = (id: string) =>
    ({
        studysetUUID: id,
        userUUID: 'user-1',
        title: `Set ${id}`,
        description: '',
        labels: [],
        cards: [],
    }) as unknown as Studyset;

const fakeApi = () => ({
    updateUserMetadata: vi.fn().mockResolvedValue({}),
    updateStudyset: vi.fn().mockResolvedValue({}),
    createStudyset: vi.fn().mockResolvedValue({}),
    deleteStudyset: vi.fn().mockResolvedValue({}),
});

const pendingIds = async () =>
    (await studysetRepository.getPendingChanges()).map((s) => s.studysetUUID);

describe('SyncEngine', () => {
    it('syncs a pending user without the server-managed metadata keys (#207)', async () => {
        const editable = {
            ...DEFAULT_USER_DATA.metadata,
            defaultTheme: 'light' as const,
            namedColors: [{ color: '#000000', name: 'n' }],
        };
        const user: User = {
            ...DEFAULT_USER_DATA,
            userUUID: 'user-1',
            metadata: {
                ...editable,
                gamification: {
                    currentStreak: 3,
                    longestStreak: 3,
                    lastStudyDate: null,
                    unlockedAchievementIds: [],
                    unlockedAtById: {},
                    studiedStudysetUUIDs: [],
                    studysetSessionCounts: {},
                },
                customAchievements: [],
                notifications: DEFAULT_NOTIFICATION_PREFERENCES,
            },
        };
        await claimLocalData('user-1');
        await userRepository.create(user);
        const updateUserMetadata = vi.fn().mockResolvedValue({});
        const engine = new SyncEngine({
            apiClient: apiClientWith(updateUserMetadata),
        });

        await engine.forceSync();

        expect(updateUserMetadata).toHaveBeenCalledExactlyOnceWith(editable);
        expect(await userRepository.getPendingChanges()).toEqual([]);
    });

    it('does not push before local data is claimed', async () => {
        await userRepository.create({
            ...DEFAULT_USER_DATA,
            userUUID: 'user-1',
        });
        const updateUserMetadata = vi.fn().mockResolvedValue({});
        const engine = new SyncEngine({
            apiClient: apiClientWith(updateUserMetadata),
        });

        await engine.forceSync();

        expect(updateUserMetadata).not.toHaveBeenCalled();
    });

    describe('queued deletes', () => {
        it('deletes a synced set once and leaves nothing pending (#296)', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a')]);
            await studysetRepository.delete('a' as UUID);
            const api = fakeApi();
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();
            await engine.forceSync();

            expect(api.deleteStudyset).toHaveBeenCalledExactlyOnceWith('a');
            expect(api.updateStudyset).not.toHaveBeenCalled();
            expect(await pendingIds()).toEqual([]);
            expect(
                await studysetRepository.getById('a' as UUID)
            ).toBeUndefined();
            expect(await getDatabase().syncQueue.count()).toBe(0);
            expect(engine.getState().status).toBe('idle');
        });

        it('settles every set a bulk delete queued (#296)', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a'), set('b')]);
            await studysetRepository.bulkDelete(['a', 'b'] as UUID[]);
            const api = fakeApi();
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();
            await engine.forceSync();

            expect(api.deleteStudyset).toHaveBeenCalledTimes(2);
            expect(api.updateStudyset).not.toHaveBeenCalled();
            expect(await studysetRepository.getAll()).toEqual([]);
            expect(await getDatabase().syncQueue.count()).toBe(0);
        });

        it('never sends a set as an update after the server refused its delete', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a')]);
            await studysetRepository.delete('a' as UUID);
            const api = fakeApi();
            api.deleteStudyset.mockRejectedValue(new HttpError(409, 'no'));
            const engine = new SyncEngine({ apiClient: api, maxRetries: 3 });

            for (let pass = 0; pass < 6; pass++) await engine.forceSync();

            expect(api.deleteStudyset).toHaveBeenCalledTimes(4);
            expect(api.updateStudyset).not.toHaveBeenCalled();
            expect(
                (await studysetRepository.getById('a' as UUID))?._syncStatus
            ).toBe('failed');
            expect(await getDatabase().syncQueue.count()).toBe(0);
            expect(engine.getState().failedCount).toBe(1);
        });

        it('treats a 404 on a queued delete as already deleted', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a')]);
            await studysetRepository.delete('a' as UUID);
            const api = fakeApi();
            api.deleteStudyset.mockRejectedValue(new HttpError(404, 'gone'));
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();

            expect(
                await studysetRepository.getById('a' as UUID)
            ).toBeUndefined();
            expect(await getDatabase().syncQueue.count()).toBe(0);
            expect(engine.getState().status).toBe('idle');
        });
    });
    describe('failures (#303)', () => {
        const pendingUpdates = async (...ids: string[]) => {
            await studysetRepository.importFromServer(ids.map(set));
            for (const id of ids) {
                await studysetRepository.update(id as UUID, {
                    title: `New ${id}`,
                });
            }
        };
        const pendingUser = async () => {
            await userRepository.importFromServer({
                ...DEFAULT_USER_DATA,
                userUUID: 'user-1',
            });
            await userRepository.updateMetadata('user-1', {
                defaultTheme: 'dark',
            });
        };
        const rejectFor = (id: string, error: unknown) => (uuid: UUID) =>
            uuid === id ? Promise.reject(error) : Promise.resolve({});

        it('syncs the other sets and the user when one update fails', async () => {
            await claimLocalData('user-1');
            await pendingUpdates('a', 'b', 'c');
            await pendingUser();
            const api = fakeApi();
            api.updateStudyset.mockImplementation(
                rejectFor('b', new HttpError(400, 'bad'))
            );
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();

            expect(api.updateStudyset.mock.calls.map((c) => c[0])).toEqual([
                'a',
                'b',
                'c',
            ]);
            expect(api.updateUserMetadata).toHaveBeenCalledOnce();
            expect(await pendingIds()).toEqual(['b']);
            expect(engine.getState().status).toBe('error');
            expect(engine.getState().error).toBe('bad');
        });

        it('a failing queued delete does not block set or user sync', async () => {
            await claimLocalData('user-1');
            await studysetRepository.importFromServer([set('a'), set('b')]);
            await studysetRepository.delete('a' as UUID);
            await studysetRepository.update('b' as UUID, { title: 'New b' });
            await pendingUser();
            const api = fakeApi();
            api.deleteStudyset.mockRejectedValue(new HttpError(503, 'paused'));
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();

            expect(api.updateStudyset).toHaveBeenCalledExactlyOnceWith(
                'b',
                expect.anything()
            );
            expect(api.updateUserMetadata).toHaveBeenCalledOnce();
            expect(await studysetRepository.getById('a' as UUID)).toBeDefined();
            const queue = await getDatabase().syncQueue.toArray();
            expect(queue.map((q) => [q.entityId, q.retryCount])).toEqual([
                ['a', 0],
            ]);
        });

        it('a failing create does not block an update', async () => {
            await claimLocalData('user-1');
            await studysetRepository.create(set('x'));
            await pendingUpdates('y');
            const api = fakeApi();
            api.createStudyset.mockRejectedValue(new HttpError(400, 'bad'));
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();

            expect(api.updateStudyset).toHaveBeenCalledExactlyOnceWith(
                'y',
                expect.anything()
            );
            expect(await pendingIds()).toEqual(['x']);
        });

        it('stops retrying a set the server keeps rejecting', async () => {
            await claimLocalData('user-1');
            await pendingUpdates('a', 'b');
            const api = fakeApi();
            api.updateStudyset.mockImplementation(
                rejectFor('b', new HttpError(400, 'bad'))
            );
            const engine = new SyncEngine({ apiClient: api, maxRetries: 3 });

            for (let pass = 0; pass < 4; pass++) await engine.forceSync();

            expect(
                (await studysetRepository.getById('b' as UUID))?._syncStatus
            ).toBe('failed');
            expect(engine.getState().failedCount).toBe(1);
            expect(engine.getState().pendingCount).toBe(0);

            const callsForB = () =>
                api.updateStudyset.mock.calls.filter((c) => c[0] === 'b')
                    .length;
            const before = callsForB();
            await engine.forceSync();
            expect(callsForB()).toBe(before);

            await studysetRepository.update('b' as UUID, { title: 'fixed' });
            const revived = await studysetRepository.getById('b' as UUID);
            expect(revived?._syncStatus).toBe('pending');
            expect(revived?._syncAttempts).toBe(0);
            await engine.forceSync();
            expect(callsForB()).toBe(before + 1);
        });

        it('a local edit resets the rejection count of a still-pending set', async () => {
            await claimLocalData('user-1');
            await pendingUpdates('b');
            const api = fakeApi();
            api.updateStudyset.mockRejectedValue(new HttpError(400, 'bad'));
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();
            await engine.forceSync();
            let row = await studysetRepository.getById('b' as UUID);
            expect(row?._syncAttempts).toBe(2);
            expect(row?._syncStatus).toBe('pending');

            await studysetRepository.update('b' as UUID, { title: 'again' });
            row = await studysetRepository.getById('b' as UUID);
            expect(row?._syncAttempts).toBe(0);
            expect(row?._syncStatus).toBe('pending');
        });

        it('recordRejection ignores a row that is gone', async () => {
            await expect(
                studysetRepository.recordRejection('missing' as UUID, 3)
            ).resolves.toBeUndefined();
        });

        it('never retires a set that only fails with 503s, 403s or network errors', async () => {
            await claimLocalData('user-1');
            await pendingUpdates('b', 'c', 'd');
            const api = fakeApi();
            const errors: Record<string, unknown> = {
                b: new HttpError(503, 'paused'),
                c: new TypeError('Failed to fetch'),
                d: new HttpError(403, 'Forbidden'),
            };
            api.updateStudyset.mockImplementation((uuid: UUID) =>
                Promise.reject(errors[uuid])
            );
            const engine = new SyncEngine({ apiClient: api });

            for (let pass = 0; pass < 10; pass++) await engine.forceSync();

            for (const id of ['b', 'c', 'd']) {
                const row = await studysetRepository.getById(id as UUID);
                expect({
                    id,
                    status: row?._syncStatus,
                    attempts: row?._syncAttempts ?? 0,
                }).toEqual({ id, status: 'pending', attempts: 0 });
            }
            expect(engine.getState().failedCount).toBe(0);

            api.updateStudyset.mockResolvedValue({});
            await engine.forceSync();
            expect(await pendingIds()).toEqual([]);
        });

        it('sends no sync metadata to the server', async () => {
            await claimLocalData('user-1');
            await studysetRepository.create(set('x'));
            await pendingUpdates('y');
            const api = fakeApi();
            api.createStudyset.mockRejectedValueOnce(new HttpError(400, 'bad'));
            api.updateStudyset.mockRejectedValueOnce(new HttpError(400, 'bad'));
            const engine = new SyncEngine({ apiClient: api });

            await engine.forceSync();
            await engine.forceSync();

            const payloads = [
                ...api.createStudyset.mock.calls.map((c) => c[0]),
                ...api.updateStudyset.mock.calls.map((c) => c[1]),
            ];
            expect(payloads).toHaveLength(4);
            for (const payload of payloads) {
                expect(
                    Object.keys(payload).filter((k) => k.startsWith('_'))
                ).toEqual([]);
            }
        });
    });
});

describe('isRetryableSyncError', () => {
    const httpRows = (statuses: number[], retryable: boolean) =>
        statuses.map((status): [string, boolean, unknown] => [
            `HTTP ${status}`,
            retryable,
            new HttpError(status, 'm'),
        ]);
    const rows: [string, boolean, unknown][] = [
        ['a network error', true, new TypeError('Failed to fetch')],
        ['an unknown error', true, new Error('x')],
        ...httpRows([500, 502, 503, 401, 403, 408, 429], true),
        ...httpRows([400, 404, 409, 422], false),
    ];

    it.each(rows)('%s is retryable: %s', (_label, expected, error) => {
        expect(isRetryableSyncError(error)).toBe(expected);
    });
});
