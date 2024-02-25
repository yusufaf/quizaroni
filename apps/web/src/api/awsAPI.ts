import { Part, UUID } from "lib/types";

const BASE_API_URL =
    "https://30hl3jkdbg.execute-api.us-west-2.amazonaws.com/development/api";
const AWS_API_KEY = import.meta.env.VITE_AWS_API_KEY;

const COMMON_REQUEST_PROPS: RequestInit = {
    mode: "no-cors",
    credentials: "omit",
    headers: {
        "Content-Type": "application/json",
        "X-Api-Key": AWS_API_KEY,
    },
};

type InitiateMultipartUploadProps = {
    studysetUUID: UUID;
    userUUID: UUID;
    fileName: string;
    contentType: string;
};
export const initiateMultipartUpload = async ({
    studysetUUID = "",
    userUUID,
    fileName,
    contentType,
}: InitiateMultipartUploadProps) => {
    const url = `${BASE_API_URL}/files/initiateMultipartUpload`;
    return await fetch(url, {
        body: JSON.stringify({ studysetUUID, userUUID, fileName, contentType }),
        method: "POST",
        ...COMMON_REQUEST_PROPS,
    }).then((response) => response.json());
};

type GetMultipartSignedUploadUrlsProps = {
    key: string;
    uploadId: string;
    numParts: number;
};
export const getMultipartSignedUploadUrls = async ({
    key,
    uploadId,
    numParts,
}: GetMultipartSignedUploadUrlsProps) => {
    const url = `${BASE_API_URL}/files/getMultipartSignedUploadUrls`;
    return await fetch(url, {
        body: JSON.stringify({ key, uploadId, numParts }),
        method: "POST",
        ...COMMON_REQUEST_PROPS,
    }).then((response) => response.json());
};

type CompleteMultipartUploadProps = {
    key: string;
    uploadId: string;
    parts: Part[]
};
export const completeMultipartUpload = async ({
    key,
    uploadId,
    parts,
}: CompleteMultipartUploadProps) => {
    const url = `${BASE_API_URL}/files/completeMultipartUpload`;
    return await fetch(url, {
        body: JSON.stringify({ key, uploadId, parts }),
        method: "POST",
        ...COMMON_REQUEST_PROPS,
    }).then((response) => response.json());
};

type DeleteFileProps = {
    key: string;
};
export const deleteFile = async ({ key }: DeleteFileProps) => {
    const url = `${BASE_API_URL}/files/deleteFile`;
    return await fetch(url, {
        body: JSON.stringify({ key }),
        method: "POST",
        ...COMMON_REQUEST_PROPS,
    }).then((response) => response.json());
};
