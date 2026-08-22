import { FileMetadata, Part, UUID } from 'shared/types';

export const BASE_API_URL =
    'https://c0yfrps22e.execute-api.us-west-2.amazonaws.com/api';

// Wired up by App.tsx on mount, once useLogto() is available inside a
// component's render tree (this module isn't one). Before that happens — or
// if the user isn't signed in — requests simply go out unauthenticated, same
// as today; apiAuthorizer.ts is what actually enforces auth.
type AccessTokenGetter = () => Promise<string | undefined>;
let getAccessToken: AccessTokenGetter | undefined;

export const setAccessTokenGetter = (getter: AccessTokenGetter): void => {
    getAccessToken = getter;
};

export const getCommonPostRequestProps = async (): Promise<RequestInit> => {
    const accessToken = await getAccessToken?.();

    return {
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        method: 'POST',
    };
};

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
    return await fetch(url, {
        body: JSON.stringify({ studysetUUID, fileName, contentType }),
        ...(await getCommonPostRequestProps()),
    }).then((response) => response.json());
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
    return await fetch(url, {
        body: JSON.stringify({ key, uploadId, numParts }),
        ...(await getCommonPostRequestProps()),
    }).then((response) => response.json());
};

type CompleteMultipartUploadProps = {
    association?: 'term' | 'definition';
    cardUUID?: string;
    key: string;
    parts: Part[];
    studysetUUID?: UUID;
    uploadId: string;
};

type CompleteMultipartUploadResponse = FileMetadata;
export const completeMultipartUpload = async ({
    association,
    cardUUID,
    key,
    parts,
    studysetUUID,
    uploadId,
}: CompleteMultipartUploadProps): Promise<CompleteMultipartUploadResponse> => {
    const url = `${BASE_API_URL}/files/complete-multipart-upload`;
    return await fetch(url, {
        body: JSON.stringify({
            association,
            cardUUID,
            key,
            parts,
            studysetUUID,
            uploadId,
        }),
        ...(await getCommonPostRequestProps()),
    }).then((response) => response.json());
};

type DeleteFileProps = {
    key: string;
};
export const deleteFile = async ({ key }: DeleteFileProps) => {
    const url = `${BASE_API_URL}/files/delete-file`;
    return await fetch(url, {
        body: JSON.stringify({ key }),
        ...(await getCommonPostRequestProps()),
    }).then((response) => response.json());
};

type SendFeedbackProps = {
    key: string;
};
export const sendFeedback = async ({ key }: SendFeedbackProps) => {
    const url = `${BASE_API_URL}/files/sendFeedback`;
    return await fetch(url, {
        body: JSON.stringify({ key }),
        ...(await getCommonPostRequestProps()),
    }).then((response) => response.json());
};
