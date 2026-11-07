// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useFileUpload from './useFileUpload';

const api = vi.hoisted(() => ({
    initiateMultipartUpload: vi.fn(),
    getMultipartSignedUploadUrls: vi.fn(),
    completeMultipartUpload: vi.fn(),
}));
vi.mock('state/api/awsAPI', () => api);

const KEY = 'set/file';
const UPLOADED = {
    key: KEY,
    name: 'cat.png',
    size: 3,
    signedURL: `/api/files/${KEY}`,
    uploadedAt: '2026-11-07T00:00:00.000Z',
};

let queryClient: QueryClient;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    api.initiateMultipartUpload.mockResolvedValue({ key: KEY, uploadId: 'u1' });
    api.getMultipartSignedUploadUrls.mockResolvedValue({
        signedURLs: { 0: '/api/files/upload-part/u1/1' },
    });
    api.completeMultipartUpload.mockResolvedValue(UPLOADED);
    fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ ETag: '"e1"' }),
    });
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

function setup(onFileUploaded = vi.fn()) {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(
        () =>
            useFileUpload({
                cardUUID: 'c1',
                studysetUUID: 'set',
                onFileUploaded,
            }),
        { wrapper }
    );
    return { result, onFileUploaded, invalidate };
}

const cat = () => new File([new Uint8Array([1, 2, 3])], 'cat.png');

describe('useFileUpload', () => {
    it('hands the uploaded file to the caller and marks sets stale', async () => {
        const { result, onFileUploaded, invalidate } = setup();

        await result.current.uploadFile([cat()], 'term');

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/files/upload-part/u1/1',
            expect.objectContaining({ method: 'PUT' })
        );
        expect(api.completeMultipartUpload).toHaveBeenCalledWith(
            expect.objectContaining({
                parts: [{ ETag: '"e1"', PartNumber: 1 }],
                cardUUID: 'c1',
                association: 'term',
            })
        );
        expect(onFileUploaded).toHaveBeenCalledWith({
            ...UPLOADED,
            association: 'term',
        });
        expect(invalidate).toHaveBeenCalledWith({
            queryKey: ['studysets'],
            refetchType: 'none',
        });
    });

    it('rejects when a part comes back without an ETag', async () => {
        fetchMock.mockResolvedValue({ ok: true, headers: new Headers() });
        const { result, onFileUploaded, invalidate } = setup();

        await expect(
            result.current.uploadFile([cat()], 'term')
        ).rejects.toThrow('Part upload failed');
        expect(api.completeMultipartUpload).not.toHaveBeenCalled();
        expect(onFileUploaded).not.toHaveBeenCalled();
        expect(invalidate).not.toHaveBeenCalled();
    });

    it('rejects when complete fails', async () => {
        api.completeMultipartUpload.mockRejectedValue(new Error('415'));
        const { result, onFileUploaded } = setup();

        await expect(
            result.current.uploadFile([cat()], 'term')
        ).rejects.toThrow('415');
        expect(onFileUploaded).not.toHaveBeenCalled();
    });
});
