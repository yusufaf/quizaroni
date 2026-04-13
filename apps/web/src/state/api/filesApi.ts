import { useMutation } from '@tanstack/react-query';
import { BASE_API_URL, getCommonPostRequestProps } from './awsAPI';
import { validate } from 'shared/validation';
import {
    BaseResponseSchema,
    InitiateMultipartUploadResponseSchema,
    GetMultipartSignedUploadUrlsResponseSchema,
    FileMetadataSchema,
} from 'shared/schemas';
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
            const data = await response.json();
            return validate({
                schema: InitiateMultipartUploadResponseSchema,
                data,
                type: 'response',
                context: 'InitiateMultipartUpload',
            });
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
            const data = await response.json();
            return validate({
                schema: GetMultipartSignedUploadUrlsResponseSchema,
                data,
                type: 'response',
                context: 'GetMultipartSignedUploadUrls',
            });
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
            const data = await response.json();
            return validate({
                schema: FileMetadataSchema,
                data,
                type: 'response',
                context: 'CompleteMultipartUpload',
            });
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
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'DeleteFile',
            });
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
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'SendFeedback',
            });
        },
    });
};
