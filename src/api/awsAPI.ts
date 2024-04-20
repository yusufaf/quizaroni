import { FileMetadata, Part, UUID } from "lib/types";

const BASE_API_URL =
    "https://c0yfrps22e.execute-api.us-west-2.amazonaws.com/api";

const getCommonPostRequestProps = (): RequestInit => {
    const { accessToken, idToken } = getCognitoTokens();

    return {
        credentials: "omit",
        headers: {
            "Content-Type": "application/json",
            authorization: `${accessToken} ${idToken}`,
        },
        method: "POST",
    };
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

/* ==== Studysets ==== */
type CreateStudysetProps = {};
export const createStudyset = async () => {
    const url = `${BASE_API_URL}/studysets/create`;
    return await fetch(url, {
        // body: JSON.stringify({}),
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};

type DeleteStudysetProps = {
    studysetUUID: UUID;
};
export const deleteStudyset = async ({ studysetUUID }: DeleteStudysetProps) => {
    const url = `${BASE_API_URL}/studysets/delete`;
    return await fetch(url, {
        body: JSON.stringify({ studysetUUID }),
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};

type GetStudysetProps = {
    studysetUUID: UUID;
};
export const getStudyset = async ({ studysetUUID }: GetStudysetProps) => {
    const url = `${BASE_API_URL}/studysets/get`;
    return await fetch(url, {
        body: JSON.stringify({ studysetUUID }),
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};

type GetAllStudysetsProps = {};
export const getAllStudysets = async () => {
    const url = `${BASE_API_URL}/studysets/get-all`;
    return await fetch(url, {
        ...getCommonPostRequestProps(),
    }).then((response) => response.json());
};