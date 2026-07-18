import { useCallback, useEffect, useState } from 'react';
import {
    initiateMultipartUpload,
    getMultipartSignedUploadUrls,
    completeMultipartUpload,
} from 'state/api/awsAPI';
import { UUID, Part } from 'shared/types';

type UseFileUploadProps = {
    cardUUID?: UUID;
    studysetUUID?: UUID;
};

const useFileUpload = ({ cardUUID, studysetUUID }: UseFileUploadProps) => {
    const [uploadUrls, setUploadUrls] = useState(null);
    const [error, setError] = useState<any>(null);

    const uploadParts = async (
        file: File,
        signedURLs: Record<number, string>,
        chunkSize: number
    ): Promise<Part[]> => {
        const keys = Object.keys(signedURLs);
        const putPartPromises: Promise<Response>[] = keys.map((indexStr) => {
            const index = parseInt(indexStr);
            const start = index * chunkSize;
            const end = (index + 1) * chunkSize;
            const blob =
                index < keys.length
                    ? file.slice(start, end)
                    : file.slice(start);
            const url = signedURLs[index];
            if (!url) {
                throw new Error(`Missing signed upload URL for part ${index}`);
            }

            return fetch(url, {
                method: 'PUT',
                body: blob,
            });
        });

        const resultOfParts = await Promise.all(putPartPromises);
        const parts: Part[] = [];
        for (const [index, part] of resultOfParts.entries()) {
            const ETag = part.headers.get('ETag');
            const PartNumber = index + 1;
            if (ETag && PartNumber) {
                parts.push({
                    ETag,
                    PartNumber,
                });
            } else {
                console.error('Failed multipart upload');
            }
        }
        return parts;
    };

    const uploadFile = useCallback(
        async (files: File[], association: 'term' | 'definition') => {
            try {
                const FILE_CHUNK_SIZE = 10_000_000; // 10 MB

                for (const file of files) {
                    const { name: fileName, type: contentType, size } = file;

                    const { key, uploadId = '' } =
                        await initiateMultipartUpload({
                            studysetUUID,
                            fileName,
                            contentType,
                        });

                    const numParts = Math.ceil(size / FILE_CHUNK_SIZE);

                    const { signedURLs } = await getMultipartSignedUploadUrls({
                        key,
                        numParts,
                        uploadId,
                    });

                    const parts = await uploadParts(
                        file,
                        signedURLs,
                        FILE_CHUNK_SIZE
                    );

                    const fileMetadata = await completeMultipartUpload({
                        association,
                        cardUUID,
                        key,
                        parts,
                        studysetUUID,
                        uploadId,
                    });
                }
            } catch (error) {
                setError(error);
            }
        },
        [studysetUUID]
    );

    return {
        uploadUrls,
        error,
        uploadFile,
    };
};

export default useFileUpload;
