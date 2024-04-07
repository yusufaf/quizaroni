import { FileMetadata, Part, UUID } from "lib/types";

const BASE_API_URL =
    "https://c0yfrps22e.execute-api.us-west-2.amazonaws.com/api";

const getCommonPostRequestProps = (): RequestInit => {
    const { accessToken, idToken } = getCognitoTokens();

    return {
        credentials: "omit",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `${accessToken} ${idToken}`
        },
    }
};

export const getCognitoTokens = (): {
    accessToken: string;
    idToken: string;
    refreshToken: string;
} => {
    const propertiesToRetrieve = ["idToken", "refreshToken", "accessToken"];
    const tokens = {};

    for (const key in localStorage) {
        if (!propertiesToRetrieve.some((property) => key.includes(property))) {
            continue;
        }

        const value = localStorage.getItem(key) ?? "";
        const propertyName = key.split(".")[3];
        if (propertyName && value) {
            tokens[propertyName] = value;
        }
    }

    // @ts-ignore 
    return tokens;
};

type InitiateMultipartUploadProps = {
    studysetUUID: UUID;
    userUUID: UUID;
    fileName: string;
    contentType: string;
};

type InitiateMultipartUploadResponse = {
    key: string;
    uploadId: string | undefined;
};
export const initiateMultipartUpload = async ({
    studysetUUID = "",
    userUUID,
    fileName,
    contentType,
}: InitiateMultipartUploadProps): Promise<InitiateMultipartUploadResponse> => {
    const url = `${BASE_API_URL}/files/initiate-multipart-upload`;
    return await fetch(url, {
        body: JSON.stringify({ studysetUUID, userUUID, fileName, contentType }),
        method: "POST",
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};

type GetMultipartSignedUploadUrlsProps = {
    key: string;
    uploadId: string;
    numParts: number;
};

type GetMultipartSignedUploadUrlsResponse = {
    signedURLs: Record<number, string>;
};
export const getMultipartSignedUploadUrls = async ({
    key,
    uploadId,
    numParts,
}: GetMultipartSignedUploadUrlsProps): Promise<GetMultipartSignedUploadUrlsResponse> => {
    const url = `${BASE_API_URL}/files/get-multipart-signed-upload-urls`;
    return await fetch(url, {
        body: JSON.stringify({ key, uploadId, numParts }),
        method: "POST",
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};

type CompleteMultipartUploadProps = {
    key: string;
    uploadId: string;
    parts: Part[];
};

type CompleteMultipartUploadResponse = FileMetadata;
export const completeMultipartUpload = async ({
    key,
    uploadId,
    parts,
}: CompleteMultipartUploadProps): Promise<CompleteMultipartUploadResponse> => {
    const url = `${BASE_API_URL}/files/complete-multipart-upload`;
    return await fetch(url, {
        body: JSON.stringify({ key, uploadId, parts }),
        method: "POST",
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
        method: "POST",
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
        method: "POST",
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};
