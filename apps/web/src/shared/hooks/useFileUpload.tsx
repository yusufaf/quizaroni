import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    initiateMultipartUpload,
    getMultipartSignedUploadUrls,
    completeMultipartUpload,
} from 'state/api/awsAPI';
import { CardFileMetadata, UUID, Part } from 'shared/types';

const FILE_CHUNK_SIZE = 10_000_000; // 10 MB

type UseFileUploadProps = {
    cardUUID?: UUID;
    studysetUUID?: UUID;
    onFileUploaded?: (file: CardFileMetadata) => void;
};

const uploadParts = async (
    file: File,
    signedURLs: Record<number, string>,
    chunkSize: number
): Promise<Part[]> => {
    const keys = Object.keys(signedURLs);
    const responses = await Promise.all(
        keys.map((indexStr) => {
            const index = parseInt(indexStr);
            const url = signedURLs[index];
            if (!url) {
                throw new Error(`Missing signed upload URL for part ${index}`);
            }
            return fetch(url, {
                method: 'PUT',
                body: file.slice(index * chunkSize, (index + 1) * chunkSize),
            });
        })
    );
    return responses.map((response, index) => {
        const ETag = response.headers.get('ETag');
        if (!response.ok || !ETag) throw new Error('Part upload failed');
        return { ETag, PartNumber: index + 1 };
    });
};

const useFileUpload = ({
    cardUUID,
    studysetUUID,
    onFileUploaded,
}: UseFileUploadProps) => {
    const queryClient = useQueryClient();

    // Uploads one file after another; the first failure rejects, so the
    // caller can tell the user.
    const uploadFile = useCallback(
        async (files: File[], association: 'term' | 'definition') => {
            for (const file of files) {
                const { name: fileName, type: contentType, size } = file;
                const { key, uploadId = '' } = await initiateMultipartUpload({
                    studysetUUID,
                    fileName,
                    contentType,
                });
                const { signedURLs } = await getMultipartSignedUploadUrls({
                    key,
                    numParts: Math.ceil(size / FILE_CHUNK_SIZE),
                    uploadId,
                });
                const parts = await uploadParts(
                    file,
                    signedURLs,
                    FILE_CHUNK_SIZE
                );
                const metadata = await completeMultipartUpload({
                    association,
                    cardUUID,
                    fileName,
                    key,
                    parts,
                    studysetUUID,
                    uploadId,
                });
                // Complete attaches the file to the card server-side, so the
                // cached set and list are now stale. 'none' marks them stale
                // without refetching the open editor, which would re-seed it.
                void queryClient.invalidateQueries({
                    queryKey: ['studysets'],
                    refetchType: 'none',
                });
                onFileUploaded?.({ ...metadata, association });
            }
        },
        [cardUUID, studysetUUID, onFileUploaded, queryClient]
    );

    return { uploadFile };
};

export default useFileUpload;
