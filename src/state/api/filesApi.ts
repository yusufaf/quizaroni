import { useMutation } from '@tanstack/react-query';
import { BASE_API_URL, getCommonPostRequestProps } from './awsAPI';
import {
    FileMetadata,
    InitiateMultipartUploadRequest,
    InitiateMultipartUploadResponse,
    GetMultipartSignedUploadUrlsRequest,
    GetMultipartSignedUploadUrlsResponse,
    CompleteMultipartUploadRequest,
    DeleteFileRequest,
    SendFeedbackRequest,
} from 'shared/types';

/* Endpoints
    File Upload Operations
    router.post("/api/files/initiate-multipart-upload", initiateMultipartUpload);
    router.post("/api/files/get-multipart-signed-upload-urls", getMultipartSignedUploadUrls);
    router.post("/api/files/complete-multipart-upload", completeMultipartUpload);
    
    File Management
    router.post("/api/files/delete-file", deleteFile);
    router.post("/api/files/sendFeedback", sendFeedback);
*/

export const useInitiateMultipartUpload = () => {
    return useMutation({
        mutationFn: async ({
            contentType,
            fileName,
            studysetUUID,
        }: InitiateMultipartUploadRequest) => {
            const response = await fetch(
                `${BASE_API_URL}/files/initiate-multipart-upload`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({
                        studysetUUID,
                        fileName,
                        contentType,
                    }),
                }
            );
            return response.json() as Promise<InitiateMultipartUploadResponse>;
        },
    });
};

export const useGetMultipartSignedUploadUrls = () => {
    return useMutation({
        mutationFn: async ({
            key,
            numParts,
            uploadId,
        }: GetMultipartSignedUploadUrlsRequest) => {
            const response = await fetch(
                `${BASE_API_URL}/files/get-multipart-signed-upload-urls`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({ key, uploadId, numParts }),
                }
            );
            return response.json() as Promise<GetMultipartSignedUploadUrlsResponse>;
        },
    });
};

export const useCompleteMultipartUpload = () => {
    return useMutation({
        mutationFn: async ({
            association,
            cardUUID,
            key,
            parts,
            studysetUUID,
            uploadId,
        }: CompleteMultipartUploadRequest) => {
            const response = await fetch(
                `${BASE_API_URL}/files/complete-multipart-upload`,
                {
                    ...getCommonPostRequestProps(),
                    body: JSON.stringify({
                        association,
                        cardUUID,
                        key,
                        parts,
                        studysetUUID,
                        uploadId,
                    }),
                }
            );
            return response.json() as Promise<FileMetadata>;
        },
    });
};

export const useDeleteFile = () => {
    return useMutation({
        mutationFn: async ({ key }: DeleteFileRequest) => {
            const response = await fetch(`${BASE_API_URL}/files/delete-file`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ key }),
            });
            return response.json();
        },
    });
};

export const useSendFeedback = () => {
    return useMutation({
        mutationFn: async ({ key }: SendFeedbackRequest) => {
            const response = await fetch(`${BASE_API_URL}/files/sendFeedback`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ key }),
            });
            return response.json();
        },
    });
};
