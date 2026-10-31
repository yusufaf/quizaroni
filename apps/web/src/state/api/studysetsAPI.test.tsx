// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { renderHook, waitFor } from '@testing-library/react';
import {
    focusManager,
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import {
    isCompleteStudyset,
    PublishStudysetError,
    useCopyPublicStudyset,
    useGetAllStudysets,
    useGetStudyset,
    usePublishStudyset,
    useUpdateStudyset,
} from './studysetsAPI';
import { isHttpStatus } from './awsAPI';
import { EMPTY_CARD } from 'shared/constants';
import en from 'i18n/locales/en/common.json';
import es from 'i18n/locales/es/common.json';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: object) => (o ? `${k} ${JSON.stringify(o)}` : k),
    }),
}));

const toastMock = vi.hoisted(() => ({
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    POSITION: { BOTTOM_LEFT: 'bottom-left' },
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

const ID = '11111111-1111-4111-8111-111111111111';
const OWNER = '33333333-3333-4333-8333-333333333333';
const NOW = '2026-10-01T12:00:00.000Z';

const validSet = {
    cards: [],
    categories: [],
    createdAt: NOW,
    description: '',
    favorited: false,
    labels: [],
    lastViewed: NOW,
    metadata: {
        backgroundColorVisible: false,
        cardCountVisible: true,
        contentOnly: false,
        customLabelTerminology: '',
        customTerminology: '',
        labelTerminology: 'Card',
        notesDrawerInitial: 'open',
        notesDrawerPosition: 'right',
        publiclyViewable: false,
        terminology: 'Term/Definition',
        textColorVisible: false,
    },
    studysetUUID: ID,
    title: 'Biology Basics',
    username: 'owner',
    userUUID: OWNER,
};

const lastViewedStub = { lastViewed: NOW, updatedAt: NOW, updatedBy: OWNER };

describe('isCompleteStudyset', () => {
    it.each([
        ['a full study set', validSet, true],
        ['a lastViewed stub', lastViewedStub, false],
        ['an item without cards', { studysetUUID: ID, labels: [] }, false],
        ['an item without studysetUUID', { cards: [] }, false],
        ['null', null, false],
    ])('%s -> %s', (_label, item, expected) => {
        expect(isCompleteStudyset(item)).toBe(expected);
    });
});

describe('useGetAllStudysets', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({ studysets: [validSet, lastViewedStub] }),
                        { status: 200, headers: { 'Content-Type': 'application/json' } }
                    )
                )
            )
        );
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('drops items without cards or studysetUUID', async () => {
        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useGetAllStudysets(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(result.current.data?.studysets).toEqual([validSet]);
    });

    it('drops stubs before validation so the remaining sets still validate', async () => {
        const qc = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );

        const { result } = renderHook(() => useGetAllStudysets(), { wrapper });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(console.error).not.toHaveBeenCalledWith(
            expect.stringContaining('validation failed'),
            expect.anything()
        );
    });
});

describe('useGetStudyset', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    const renderGetStudyset = (status: number) => {
        const fetchMock = vi.fn(() =>
            Promise.resolve(new Response('{}', { status }))
        );
        vi.stubGlobal('fetch', fetchMock);
        // No retry default here, so the hook's own retry policy is what runs.
        const qc = new QueryClient({
            defaultOptions: { queries: { retryDelay: 0 } },
        });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(
            () => useGetStudyset({ studysetUUID: ID }),
            { wrapper }
        );
        return { fetchMock, result };
    };

    it('does not retry a 404', async () => {
        const { fetchMock, result } = renderGetStudyset(404);

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(isHttpStatus(result.current.error, 404)).toBe(true);
    });

    it('still retries a server error', async () => {
        const { fetchMock, result } = renderGetStudyset(500);

        await waitFor(() => expect(result.current.isError).toBe(true));
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
});

describe('usePublishStudyset', () => {
    const gateErrors = [{ code: 'notEnoughCards', required: 4, actual: 2 }];
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn(() =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        message: 'Study set cannot be published',
                        errors: gateErrors,
                    }),
                    { status: 400, headers: { 'Content-Type': 'application/json' } }
                )
            )
        );
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('rejects with the gate errors the server returns', async () => {
        const qc = new QueryClient();
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => usePublishStudyset(), { wrapper });

        const error = await result.current
            .mutateAsync({ studysetUUID: ID, subject: 'math' })
            .catch((e: unknown) => e);

        expect(error).toBeInstanceOf(PublishStudysetError);
        expect((error as PublishStudysetError).status).toBe(400);
        expect((error as PublishStudysetError).errors).toEqual(gateErrors);
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url.endsWith('/studysets/publish-studyset')).toBe(true);
        expect(init.body).toBe(JSON.stringify({ studysetUUID: ID, subject: 'math' }));
    });
});

// #170: a save that drops a published set below the publish gate unpublishes
// it, and every screen that saves cards goes through this hook.
describe('useUpdateStudyset', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    const save = async (extra: Record<string, unknown>) => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({
                            message: 'ok',
                            studyset: validSet,
                            ...extra,
                        }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        }
                    )
                )
            )
        );
        const qc = new QueryClient();
        const invalidate = vi.spyOn(qc, 'invalidateQueries');
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useUpdateStudyset(), { wrapper });

        await result.current.mutateAsync({
            studysetUUID: ID,
            updates: { cards: [] },
        });
        return { invalidate };
    };

    it('warns and refreshes the public set when the save unpublished it', async () => {
        const { invalidate } = await save({
            unpublished: {
                errors: [{ code: 'notEnoughCards', required: 4, actual: 2 }],
            },
        });

        expect(toastMock.warning).toHaveBeenCalledWith(
            'publish.unpublishedOnSave {"required":4,"actual":2}',
            expect.anything()
        );
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: ['public-studyset', ID],
        });
    });

    it('stays quiet on an ordinary save', async () => {
        const { invalidate } = await save({});

        expect(toastMock.warning).not.toHaveBeenCalled();
        expect(toastMock.error).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalledWith({
            queryKey: ['public-studyset', ID],
        });
    });

    it('refreshes the library list after a save', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve(
                    new Response(
                        JSON.stringify({ message: 'ok', studyset: validSet }),
                        {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                        }
                    )
                )
            )
        );
        const qc = new QueryClient();
        qc.setQueryData(['studysets'], { studysets: [] });
        qc.setQueryData(['studysets', ID], { studyset: validSet });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useUpdateStudyset(), { wrapper });

        await result.current.mutateAsync({
            studysetUUID: ID,
            updates: { favorited: true },
        });

        expect(qc.getQueryState(['studysets'])?.isInvalidated).toBe(true);
    });
});

// #218: callers use mutate(), which swallows the rejection, and a per-call
// onError is dropped by a later save on the same hook or by unmount.
describe('useUpdateStudyset failures', () => {
    const failed = () =>
        new Response(JSON.stringify({ message: 'boom' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    const ok = () =>
        new Response(JSON.stringify({ message: 'ok', studyset: validSet }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    const renderUpdate = (
        options?: Parameters<typeof useUpdateStudyset>[0]
    ) => {
        const qc = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
        return renderHook(() => useUpdateStudyset(options), { wrapper });
    };

    const request = { studysetUUID: ID, updates: { favorited: true } };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('shows a save-failed toast', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(failed()))
        );
        const { result } = renderUpdate();

        await result.current.mutateAsync(request).catch(() => {});

        expect(toastMock.error).toHaveBeenCalledTimes(1);
        expect(toastMock.error).toHaveBeenCalledWith(
            'errors.saveFailed',
            expect.objectContaining({
                toastId: 'updateStudyset:errors.saveFailed',
            })
        );
    });

    it('uses the message the caller passes', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(failed()))
        );
        const { result } = renderUpdate({ errorToast: 'create.errorUpdate' });

        await result.current.mutateAsync(request).catch(() => {});

        expect(toastMock.error).toHaveBeenCalledWith(
            'create.errorUpdate',
            expect.anything()
        );
    });

    it('stays quiet when the caller reports failures itself', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(failed()))
        );
        const { result } = renderUpdate({ errorToast: false });

        await result.current.mutateAsync(request).catch(() => {});

        expect(toastMock.error).not.toHaveBeenCalled();
    });

    it('reports a failed save that a later save replaced', async () => {
        let failFirst: (response: Response) => void = () => {};
        const fetchMock = vi
            .fn()
            .mockImplementationOnce(
                () => new Promise<Response>((resolve) => (failFirst = resolve))
            )
            .mockImplementationOnce(() => Promise.resolve(ok()));
        vi.stubGlobal('fetch', fetchMock);
        const { result } = renderUpdate();

        result.current.mutate(request);
        result.current.mutate({ ...request, updates: { favorited: false } });
        // A set's saves go out one at a time (#222), so the second waits.
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        failFirst(failed());
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

        await waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
    });

    it('reports a failed save after the caller unmounts', async () => {
        let fail: (response: Response) => void = () => {};
        const fetchMock = vi.fn(
            () => new Promise<Response>((resolve) => (fail = resolve))
        );
        vi.stubGlobal('fetch', fetchMock);
        const { result, unmount } = renderUpdate();

        result.current.mutate(request);
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        unmount();
        fail(failed());

        await waitFor(() => expect(toastMock.error).toHaveBeenCalled());
    });

    it('has the save-failed message in en and es', () => {
        expect(en.errors.saveFailed).toBeTruthy();
        expect(es.errors.saveFailed).toBeTruthy();
    });
});

// #222: whole-cards saves are built from the cached set, so overlapping
// saves of one set must not lose each other's changes.
describe('useUpdateStudyset overlapping saves', () => {
    const OTHER_ID = '22222222-2222-4222-8222-222222222222';
    const cardA = {
        ...EMPTY_CARD,
        cardUUID: 'card-a',
        term: 'A',
        definition: 'a',
    };
    const cardB = {
        ...EMPTY_CARD,
        cardUUID: 'card-b',
        term: 'B',
        definition: 'b',
    };
    const seeded = { ...validSet, cards: [cardA, cardB] };
    const markedA = [{ ...cardA, important: true }, cardB];
    const markedBoth = [
        { ...cardA, important: true },
        { ...cardB, important: true },
    ];

    const failed = () =>
        new Response(JSON.stringify({ message: 'boom' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    const ok = () =>
        new Response(JSON.stringify({ message: 'ok', studyset: seeded }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    const holdFetch = () => {
        const pending: Array<(response: Response) => void> = [];
        const fetchMock = vi.fn(
            () => new Promise<Response>((resolve) => pending.push(resolve))
        );
        vi.stubGlobal('fetch', fetchMock);
        return { fetchMock, pending };
    };

    const renderTwoCards = (
        options?: Parameters<typeof useUpdateStudyset>[0]
    ) => {
        const qc = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        qc.setQueryData(['studysets'], { studysets: [] });
        qc.setQueryData(['studysets', ID], { studyset: seeded });
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
        // Two hook instances, like two card components.
        const { result } = renderHook(
            () =>
                [
                    useUpdateStudyset(options),
                    useUpdateStudyset(options),
                ] as const,
            { wrapper }
        );
        return { qc, result };
    };

    const cachedCards = (qc: QueryClient) =>
        qc.getQueryData<{ studyset: typeof seeded }>(['studysets', ID])
            ?.studyset.cards;
    const bodyOf = (fetchMock: ReturnType<typeof vi.fn>, call: number) =>
        JSON.parse(
            String(
                (
                    fetchMock.mock.calls[call] as unknown as [
                        string,
                        RequestInit,
                    ]
                )[1].body
            )
        );
    const isInvalidated = (qc: QueryClient, queryKey: unknown[]) =>
        qc.getQueryState(queryKey)?.isInvalidated;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        focusManager.setFocused(undefined);
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('shows the new cards while the save is pending', async () => {
        const { fetchMock } = holdFetch();
        const { qc, result } = renderTwoCards();

        result.current[0].mutate({
            studysetUUID: ID,
            updates: { cards: markedA },
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        expect(cachedCards(qc)).toEqual(markedA);
    });

    it("sends a set's saves one at a time, in order", async () => {
        const { fetchMock, pending } = holdFetch();
        const { result } = renderTwoCards();

        result.current[0].mutate({
            studysetUUID: ID,
            updates: { cards: markedA },
        });
        result.current[1].mutate({
            studysetUUID: ID,
            updates: { cards: markedBoth },
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        await new Promise((resolve) => setTimeout(resolve, 20));
        expect(fetchMock).toHaveBeenCalledTimes(1);

        pending[0]!(ok());
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(bodyOf(fetchMock, 1).updates.cards).toEqual(markedBoth);
    });

    it('refetches the set only after its last pending save', async () => {
        const { fetchMock, pending } = holdFetch();
        const { qc, result } = renderTwoCards();

        result.current[0].mutate({
            studysetUUID: ID,
            updates: { cards: markedA },
        });
        result.current[1].mutate({
            studysetUUID: ID,
            updates: { cards: markedBoth },
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());
        pending[0]!(ok());
        await waitFor(() => expect(result.current[0].isSuccess).toBe(true));
        expect(isInvalidated(qc, ['studysets', ID])).toBe(false);

        await waitFor(() => expect(pending).toHaveLength(2));
        pending[1]!(ok());
        await waitFor(() =>
            expect(isInvalidated(qc, ['studysets', ID])).toBe(true)
        );
        expect(isInvalidated(qc, ['studysets'])).toBe(true);
    });

    it('refetches the set after a failed cards save', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(failed()))
        );
        const { qc, result } = renderTwoCards();

        await result.current[0]
            .mutateAsync({
                studysetUUID: ID,
                updates: { cards: [cardB, cardA] },
            })
            .catch(() => {});

        expect(isInvalidated(qc, ['studysets', ID])).toBe(true);
    });

    it('leaves the cached set alone for saves without cards', async () => {
        const { fetchMock } = holdFetch();
        const { qc, result } = renderTwoCards();
        const before = qc.getQueryData(['studysets', ID]);

        result.current[0].mutate({
            studysetUUID: ID,
            updates: { viewSetLayout: 'grid' },
            isMetadataUpdate: true,
        });
        result.current[1].mutate({
            studysetUUID: ID,
            updates: { favorited: true },
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalled());

        expect(qc.getQueryData(['studysets', ID])).toBe(before);
    });

    it('sends saves of different sets at the same time', async () => {
        const { fetchMock } = holdFetch();
        const { result } = renderTwoCards();

        result.current[0].mutate({
            studysetUUID: ID,
            updates: { cards: [cardB, cardA] },
        });
        result.current[1].mutate({
            studysetUUID: OTHER_ID,
            updates: { favorited: true },
        });

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it('sends a queued save while the tab is hidden', async () => {
        focusManager.setFocused(false);
        const { fetchMock, pending } = holdFetch();
        const { result } = renderTwoCards();

        result.current[0].mutate({
            studysetUUID: ID,
            updates: { cards: markedA },
        });
        result.current[1].mutate({
            studysetUUID: ID,
            updates: { cards: markedBoth },
        });
        await waitFor(() => expect(pending.length).toBeGreaterThan(0));
        pending[0]!(ok());

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    });

    it('leaves the cached set alone when optimistic is off', async () => {
        const { fetchMock } = holdFetch();
        const { qc, result } = renderTwoCards({ optimistic: false });
        const before = qc.getQueryData(['studysets', ID]);

        result.current[0].mutate({
            studysetUUID: ID,
            updates: { cards: [cardB, cardA], title: 'New' },
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

        expect(qc.getQueryData(['studysets', ID])).toBe(before);
    });

    it("doesn't refetch after a failed save when optimistic is off", async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() => Promise.resolve(failed()))
        );
        const { qc, result } = renderTwoCards({ optimistic: false });

        await result.current[0]
            .mutateAsync({
                studysetUUID: ID,
                updates: { cards: [cardB, cardA], title: 'New' },
            })
            .catch(() => {});

        expect(isInvalidated(qc, ['studysets', ID])).toBe(false);
    });
});

describe('useCopyPublicStudyset', () => {
    const respond = (status: number, body: unknown) =>
        Promise.resolve(
            new Response(JSON.stringify(body), {
                status,
                headers: { 'Content-Type': 'application/json' },
            })
        );

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    const renderCopy = () => {
        const qc = new QueryClient({
            defaultOptions: { mutations: { retry: false } },
        });
        const invalidate = vi.spyOn(qc, 'invalidateQueries');
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
        const { result } = renderHook(() => useCopyPublicStudyset(), {
            wrapper,
        });
        return { result, invalidate };
    };

    it('posts the id and refreshes the library', async () => {
        const fetchMock = vi.fn(() =>
            respond(200, {
                message: 'Successfully saved study set',
                studyset: {},
            })
        );
        vi.stubGlobal('fetch', fetchMock);
        const { result, invalidate } = renderCopy();

        await result.current.mutateAsync({ studysetUUID: ID });

        const [url, init] = fetchMock.mock.calls[0] as unknown as [
            string,
            RequestInit,
        ];
        expect(url.endsWith('/studysets/copy-public-studyset')).toBe(true);
        expect(init.body).toBe(JSON.stringify({ studysetUUID: ID }));
        // Exact: a prefix match would also refetch the open set's 404'd query.
        await waitFor(() =>
            expect(invalidate).toHaveBeenCalledWith({
                queryKey: ['studysets'],
                exact: true,
            })
        );
    });

    it('surfaces a 404', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                respond(404, {
                    message: 'This study set is private or does not exist.',
                })
            )
        );
        const { result, invalidate } = renderCopy();

        const error = await result.current
            .mutateAsync({ studysetUUID: ID })
            .catch((e: unknown) => e);

        expect(isHttpStatus(error, 404)).toBe(true);
        expect(invalidate).not.toHaveBeenCalled();
    });
});
