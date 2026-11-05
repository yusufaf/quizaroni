import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

const mocks = vi.hoisted(() => ({ downloadObjectAsJSON: vi.fn() }));

vi.mock('shared/utilities/general', async (importOriginal) => ({
    ...(await importOriginal<object>()),
    downloadObjectAsJSON: mocks.downloadObjectAsJSON,
}));

const EXPORT = { format: 'quizaroni-user-data', version: 1 };

// BASE_API_URL is read once at import, so each test loads the module fresh.
const loadSelfHost = async () => {
    vi.stubEnv('VITE_BACKEND', 'selfhost');
    vi.resetModules();
    const { downloadUserData } = await import('./usersAPI');
    const { HttpError } = await import('./awsAPI');
    return { downloadUserData, HttpError };
};

const stubFetch = (ok: boolean, status: number, body: unknown) => {
    const fetchMock = vi.fn().mockResolvedValue({
        ok,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
};

describe('downloadUserData (self-host)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('posts to the server and saves the export as a dated file', async () => {
        const { downloadUserData } = await loadSelfHost();
        const fetchMock = stubFetch(true, 200, EXPORT);

        await downloadUserData({ includeStudysets: false });

        const [url, init] = fetchMock.mock.calls[0]!;
        expect(url).toBe('/api/users/download-user-data');
        expect(init).toMatchObject({
            method: 'POST',
            credentials: 'same-origin',
            body: JSON.stringify({ includeStudysets: false }),
        });
        expect(mocks.downloadObjectAsJSON).toHaveBeenCalledWith(
            EXPORT,
            expect.stringMatching(/^quizaroni-data-\d{4}-\d{2}-\d{2}\.json$/)
        );
    });

    it('rejects and saves nothing when the server fails', async () => {
        const { downloadUserData, HttpError } = await loadSelfHost();
        stubFetch(false, 500, { message: 'Internal server error' });

        await expect(
            downloadUserData({ includeStudysets: false })
        ).rejects.toBeInstanceOf(HttpError);
        expect(mocks.downloadObjectAsJSON).not.toHaveBeenCalled();
    });
});
