import { FileMetadata, Part, UUID } from 'shared/types';

// The server serves the API on the app's own origin.
export const BASE_API_URL = '/api';

export class HttpError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export const isHttpStatus = (error: unknown, status: number): boolean =>
    error instanceof HttpError && error.status === status;

// A non-2xx response was being parsed as if it were success data at nearly
// every call site (only studysetsAPI.ts's update-studyset checked
// response.ok), then handed to validate(), which logs-and-swallows schema
// mismatches by default — so an error body just silently fell through as a
// "successful" mutation. fetchJson() centralizes that check for call sites
// that don't need bespoke error handling (a few, like useGetPublicStudyset
// and pushGamificationToServer, still check response.ok by hand on purpose).
export const fetchJson = async <T>(
    url: string,
    init?: RequestInit
): Promise<T> => {
    const response = await fetch(url, init);
    if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new HttpError(
            response.status,
            `Request to ${url} failed with status ${response.status}${
                bodyText ? `: ${bodyText}` : ''
            }`
        );
    }
    return response.json();
};

// Authenticated by the session cookie, which the server's CSRF check accepts
// only from the same origin.
export const getCommonPostRequestProps = async (): Promise<RequestInit> => ({
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
});

type InitiateMultipartUploadProps = {
    contentType: string;
    fileName: string;
    studysetUUID?: UUID;
};

type InitiateMultipartUploadResponse = {
    key: string;
    uploadId: string | undefined;
};
export const initiateMultipartUpload = async ({
    contentType,
    fileName,
    studysetUUID = '',
}: InitiateMultipartUploadProps): Promise<InitiateMultipartUploadResponse> => {
    const url = `${BASE_API_URL}/files/initiate-multipart-upload`;
    return await fetchJson(url, {
        body: JSON.stringify({ studysetUUID, fileName, contentType }),
        ...(await getCommonPostRequestProps()),
    });
};

type GetMultipartSignedUploadUrlsProps = {
    key: string;
    numParts: number;
    uploadId: string;
};

type GetMultipartSignedUploadUrlsResponse = {
    signedURLs: Record<number, string>;
};
export const getMultipartSignedUploadUrls = async ({
    key,
    numParts,
    uploadId,
}: GetMultipartSignedUploadUrlsProps): Promise<GetMultipartSignedUploadUrlsResponse> => {
    const url = `${BASE_API_URL}/files/get-multipart-signed-upload-urls`;
    return await fetchJson(url, {
        body: JSON.stringify({ key, uploadId, numParts }),
        ...(await getCommonPostRequestProps()),
    });
};

type CompleteMultipartUploadProps = {
    association?: 'term' | 'definition';
    cardUUID?: string;
    fileName?: string;
    key: string;
    parts: Part[];
    studysetUUID?: UUID;
    uploadId: string;
};

type CompleteMultipartUploadResponse = FileMetadata;
export const completeMultipartUpload = async ({
    association,
    cardUUID,
    fileName,
    key,
    parts,
    studysetUUID,
    uploadId,
}: CompleteMultipartUploadProps): Promise<CompleteMultipartUploadResponse> => {
    const url = `${BASE_API_URL}/files/complete-multipart-upload`;
    return await fetchJson(url, {
        body: JSON.stringify({
            association,
            cardUUID,
            fileName,
            key,
            parts,
            studysetUUID,
            uploadId,
        }),
        ...(await getCommonPostRequestProps()),
    });
};
