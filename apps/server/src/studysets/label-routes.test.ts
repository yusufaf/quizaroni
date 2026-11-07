import { afterEach, describe, expect, test } from 'bun:test';
import {
    apiRequest,
    createRouteHarness,
    type RouteHarness,
    signUp,
} from '../testing/route-harness';
import {
    createSet,
    getSet,
    okJson,
    studysetPost as post,
} from '../testing/studysets';

let current: RouteHarness | undefined;

async function harness(): Promise<RouteHarness> {
    current = await createRouteHarness();
    return current;
}

afterEach(() => {
    current?.close();
    current = undefined;
});

const PATHS = [
    '/create-labels',
    '/edit-labels',
    '/delete-labels',
    '/update-studyset-labels',
    '/batch-update-studyset-labels',
];

async function profileLabels(h: RouteHarness, cookie: string) {
    const body = await okJson<{ user: { labels: string[] } }>(
        apiRequest(h, '/api/users/get-user', { cookie })
    );
    return body.user.labels;
}

const labelsOf = async (h: RouteHarness, cookie: string, id: string) =>
    (await getSet(h, cookie, id)).labels;

describe('label routes', () => {
    test.each(PATHS)('%s is 401 signed out', async (path) => {
        const h = await harness();
        expect((await post(h, path)).status).toBe(401);
    });

    test('the web label flows, end to end', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        const s1 = (await createSet(h, cookie)).studysetUUID;
        const s2 = (await createSet(h, cookie)).studysetUUID;

        await okJson(
            post(h, '/create-labels', {
                cookie,
                body: { label: 'Bio', studysetUUID: s1, updateStudysetLabel: true },
            })
        );
        expect(await profileLabels(h, cookie)).toEqual(['Bio']);
        expect(await labelsOf(h, cookie, s1)).toEqual(['Bio']);

        await okJson(
            post(h, '/create-labels', {
                cookie,
                body: { label: 'Chem', updateStudysetLabel: false },
            })
        );
        expect(await profileLabels(h, cookie)).toEqual(['Bio', 'Chem']);

        const batch = await okJson<{ updatedStudysetUUIDs: string[] }>(
            post(h, '/batch-update-studyset-labels', {
                cookie,
                body: {
                    studysetUpdates: [
                        [s1, ['Bio', 'Chem']],
                        [s2, ['Bio']],
                    ],
                },
            })
        );
        expect(batch.updatedStudysetUUIDs).toEqual([s1, s2]);

        await okJson(
            post(h, '/edit-labels', {
                cookie,
                body: { index: 0, oldLabel: 'Bio', newLabel: 'Biology' },
            })
        );
        expect(await profileLabels(h, cookie)).toEqual(['Biology', 'Chem']);
        expect(await labelsOf(h, cookie, s1)).toEqual(['Biology', 'Chem']);
        expect(await labelsOf(h, cookie, s2)).toEqual(['Biology']);

        await okJson(
            post(h, '/delete-labels', {
                cookie,
                body: { labelsToDelete: ['Chem'] },
            })
        );
        expect(await profileLabels(h, cookie)).toEqual(['Biology']);
        expect(await labelsOf(h, cookie, s1)).toEqual(['Biology']);

        await okJson(
            post(h, '/update-studyset-labels', {
                cookie,
                body: { studysetUUID: s2, labels: [] },
            })
        );
        expect(await labelsOf(h, cookie, s2)).toEqual([]);
    });

    test("another user can't label, relabel or rename A's sets", async () => {
        const h = await harness();
        const a = await signUp(h);
        const b = await signUp(h);
        const aSet = (await createSet(h, a.cookie)).studysetUUID;
        const bSet = (await createSet(h, b.cookie)).studysetUUID;
        await okJson(
            post(h, '/create-labels', {
                cookie: a.cookie,
                body: { label: 'bio', studysetUUID: aSet, updateStudysetLabel: true },
            })
        );
        const before = await getSet(h, a.cookie, aSet);

        const create = await post(h, '/create-labels', {
            cookie: b.cookie,
            body: { label: 'x', studysetUUID: aSet, updateStudysetLabel: true },
        });
        expect(create.status).toBe(404);
        expect(await profileLabels(h, b.cookie)).toEqual([]);

        const single = await post(h, '/update-studyset-labels', {
            cookie: b.cookie,
            body: { studysetUUID: aSet, labels: ['x'] },
        });
        expect(single.status).toBe(404);

        const batch = await post(h, '/batch-update-studyset-labels', {
            cookie: b.cookie,
            body: { studysetUpdates: [[aSet, ['x']], [bSet, ['y']]] },
        });
        expect(batch.status).toBe(404);
        expect(await batch.json()).toMatchObject({
            notFoundStudysetUUIDs: [aSet],
            updatedStudysetUUIDs: [bSet],
        });
        expect(await labelsOf(h, b.cookie, bSet)).toEqual(['y']);

        await okJson(
            post(h, '/create-labels', {
                cookie: b.cookie,
                body: { label: 'bio', updateStudysetLabel: false },
            })
        );
        await okJson(
            post(h, '/edit-labels', {
                cookie: b.cookie,
                body: { index: 0, oldLabel: 'bio', newLabel: 'mine' },
            })
        );
        await okJson(
            post(h, '/delete-labels', {
                cookie: b.cookie,
                body: { labelsToDelete: ['bio', 'mine'] },
            })
        );
        expect(await getSet(h, a.cookie, aSet)).toEqual(before);
        expect(await profileLabels(h, a.cookie)).toEqual(['bio']);
    });

    test('bad input', async () => {
        const h = await harness();
        const { cookie } = await signUp(h);
        await okJson(
            post(h, '/create-labels', {
                cookie,
                body: { label: 'bio' },
            })
        );
        await okJson(
            post(h, '/create-labels', {
                cookie,
                body: { label: 'chem' },
            })
        );
        const cases: [string, unknown, number][] = [
            ['/create-labels', { label: '' }, 400],
            ['/create-labels', { label: ' x' }, 400],
            ['/create-labels', { label: 'x', updateStudysetLabel: 'false' }, 400],
            ['/create-labels', { label: 'x', updateStudysetLabel: true }, 400],
            ['/delete-labels', { labelsToDelete: 'x' }, 400],
            ['/batch-update-studyset-labels', { studysetUpdates: 'x' }, 400],
            ['/edit-labels', { index: 0, oldLabel: 'bio', newLabel: 'chem' }, 409],
            ['/edit-labels', { index: 0, oldLabel: 'nope', newLabel: 'x' }, 404],
        ];
        for (const [path, body, status] of cases) {
            const res = await post(h, path, { cookie, body });
            expect([path, res.status]).toEqual([path, status]);
        }
    });
});
