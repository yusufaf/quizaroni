import { FileMetadata, Part, UUID } from 'lib/types';

export const BASE_API_URL =
    'https://c0yfrps22e.execute-api.us-west-2.amazonaws.com/api';

export const getCommonPostRequestProps = (): RequestInit => {
    const { accessToken, idToken } = getCognitoTokens();

    return {
        credentials: 'omit',
        headers: {
            'Content-Type': 'application/json',
            authorization: `${accessToken} ${idToken}`,
        },
        method: 'POST',
    };
};

export const getCognitoTokens = (): {
    accessToken: string;
    idToken: string;
    refreshToken: string;
} => {
    const propertiesToRetrieve = ['idToken', 'refreshToken', 'accessToken'];
    const tokens = {};

    for (const key in localStorage) {
        if (!propertiesToRetrieve.some((property) => key.includes(property))) {
            continue;
        }

        const value = localStorage.getItem(key) ?? '';
        const propertyName = key.split('.')[3];
        if (propertyName && value) {
            tokens[propertyName] = value;
        }
    }

    // @ts-ignore
    return tokens;
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
        ...getCommonPostRequestProps(),
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
        ...getCommonPostRequestProps(),
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
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};

type DeleteFileProps = {
    key: string;
};
export const deleteFile = async ({ key }: DeleteFileProps) => {
    const url = `${BASE_API_URL}/files/delete-file`;
    return await fetch(url, {
        body: JSON.stringify({ key }),
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};

type SendFeedbackProps = {
    key: string;
};
export const sendFeedback = async ({ key }: SendFeedbackProps) => {
    const url = `${BASE_API_URL}/files/sendFeedback`;
    return await fetch(url, {
        body: JSON.stringify({ key }),
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};