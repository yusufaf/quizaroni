import { apiPut, apiRequest, type RouteHarness } from './route-harness';

// Test helpers only.

// A real 1x1 PNG.
export const PNG_BYTES = new Uint8Array(
    Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
    )
);

const enc = (text: string) => new TextEncoder().encode(text);

export const GIF_HTML_POLYGLOT = enc(
    'GIF89a<html><script>alert(document.cookie)</script></html>'
);
export const SVG_BYTES = enc(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
);
export const HTML_BYTES = enc('<!doctype html><script>alert(1)</script>');

export type UploadStart = { key: string; uploadId: string };

export async function startUpload(
    h: RouteHarness,
    cookie: string,
    studysetUUID: string,
    contentType = 'image/png'
): Promise<UploadStart> {
    const res = await apiRequest(h, '/api/files/initiate-multipart-upload', {
        cookie,
        body: { studysetUUID, fileName: 'f.png', contentType },
    });
    if (res.status !== 200) {
        throw new Error(`initiate failed with ${res.status}`);
    }
    return (await res.json()) as UploadStart;
}

export async function partURLs(
    h: RouteHarness,
    cookie: string,
    upload: UploadStart,
    numParts: number
): Promise<string[]> {
    const res = await apiRequest(
        h,
        '/api/files/get-multipart-signed-upload-urls',
        { cookie, body: { ...upload, numParts } }
    );
    if (res.status !== 200) {
        throw new Error(`get-urls failed with ${res.status}`);
    }
    const { signedURLs } = (await res.json()) as {
        signedURLs: Record<string, string>;
    };
    return Object.keys(signedURLs)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => signedURLs[k]!);
}

export function completeUpload(
    h: RouteHarness,
    cookie: string,
    upload: UploadStart,
    parts: { PartNumber: number; ETag: string }[],
    extra: Record<string, unknown> = {}
): Promise<Response> {
    return apiRequest(h, '/api/files/complete-multipart-upload', {
        cookie,
        body: { ...upload, parts, fileName: 'cat.png', ...extra },
    });
}

// The four calls the web's useFileUpload makes, one part per 10 MB.
export async function uploadCardFile(
    h: RouteHarness,
    cookie: string,
    o: {
        studysetUUID: string;
        bytes: Uint8Array;
        cardUUID?: string;
        association?: 'term' | 'definition';
        fileName?: string;
        contentType?: string;
    }
): Promise<Response> {
    const upload = await startUpload(h, cookie, o.studysetUUID, o.contentType);
    const size = 10_000_000;
    const numParts = Math.max(1, Math.ceil(o.bytes.length / size));
    const urls = await partURLs(h, cookie, upload, numParts);
    const parts: { PartNumber: number; ETag: string }[] = [];
    for (let i = 0; i < numParts; i++) {
        const res = await apiPut(
            h,
            urls[i]!,
            o.bytes.slice(i * size, (i + 1) * size),
            { cookie }
        );
        if (res.status !== 200) {
            throw new Error(`part ${i + 1} failed with ${res.status}`);
        }
        parts.push({ PartNumber: i + 1, ETag: res.headers.get('ETag')! });
    }
    return completeUpload(h, cookie, upload, parts, {
        studysetUUID: o.studysetUUID,
        cardUUID: o.cardUUID,
        association: o.association,
        fileName: o.fileName ?? 'cat.png',
    });
}
