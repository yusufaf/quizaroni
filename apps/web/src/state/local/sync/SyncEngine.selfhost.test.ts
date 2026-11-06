// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import type { Studyset } from 'shared/types';

// Pins what the SyncEngine sends a self-host server for a set made offline.
// The server's study set route tests replay these exact bodies.

const LOCAL_SET = {
    studysetUUID: '3f2a1b0c-9d8e-4f7a-8b6c-5d4e3f2a1b0c',
    userUUID: 'user-1',
    username: null,
    title: 'Made offline',
    description: '',
    favorited: false,
    cards: [],
    categories: [],
    labels: [],
    metadata: { terminology: 'Term/Definition' },
    lastViewed: '2026-10-01T00:00:00.000Z',
    createdAt: '2026-10-01T00:00:00.000Z',
} as unknown as Studyset;

type Loaded = Awaited<ReturnType<typeof load>>;

// BASE_API_URL is read once at import, so the modules load fresh per test.
async function load() {
    vi.stubEnv('VITE_BACKEND', 'selfhost');
    vi.resetModules();
    const { SyncEngine } = await import('./SyncEngine');
    const { syncApiClient } = await import('../api/syncApiClient');
    const { studysetRepository } = await import('../repositories');
    const { claimLocalData, clearLocalData } = await import('../localData');
    const { setClaimedOwner } = await import('../owner');
    return {
        SyncEngine,
        syncApiClient,
        studysetRepository,
        claimLocalData,
        clearLocalData,
        setClaimedOwner,
    };
}

let loaded: Loaded | undefined;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: 'ok', studyset: LOCAL_SET }),
        text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
    if (loaded) {
        await loaded.clearLocalData();
        loaded.setClaimedOwner(null);
    }
    loaded = undefined;
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
});

function engineFor(l: Loaded) {
    const {
        createStudyset,
        updateStudyset,
        deleteStudyset,
        updateUserMetadata,
    } = l.syncApiClient;
    return new l.SyncEngine({
        apiClient: {
            createStudyset,
            updateStudyset,
            deleteStudyset,
            updateUserMetadata,
        },
    });
}

const sentBody = (call: unknown[]) =>
    JSON.parse((call[1] as RequestInit).body as string);

describe('SyncEngine against a self-host server', () => {
    it('creates an offline set with its client id, then updates it', async () => {
        loaded = await load();
        await loaded.claimLocalData('user-1');
        await loaded.studysetRepository.create(LOCAL_SET);
        const engine = engineFor(loaded);

        await engine.forceSync();

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/studysets/create-studyset');
        expect(init).toMatchObject({
            method: 'POST',
            credentials: 'same-origin',
        });
        expect(sentBody(fetchMock.mock.calls[0]!)).toEqual({
            studyset: LOCAL_SET,
        });

        await loaded.studysetRepository.update(LOCAL_SET.studysetUUID, {
            title: 'Renamed',
        });
        await engine.forceSync();

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock.mock.calls[1]![0]).toBe(
            '/api/studysets/update-studyset'
        );
        expect(sentBody(fetchMock.mock.calls[1]!)).toEqual({
            studysetUUID: LOCAL_SET.studysetUUID,
            updates: { ...LOCAL_SET, title: 'Renamed' },
            isMetadataUpdate: false,
        });
    });
});
