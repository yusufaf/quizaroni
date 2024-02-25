import { useCallback, useEffect, useState } from "react";
import {
    initiateMultipartUpload,
    getMultipartSignedUploadUrls,
    completeMultipartUpload,
} from "api/awsAPI";
import { UUID, FileMetadata, Part, } from "lib/types";

type UseFileUploadProps = {
    studysetUUID: UUID;
    userUUID: UUID;
};

const useFileUpload = (props: UseFileUploadProps) => {
    const { studysetUUID, userUUID } = props;

    const [uploadUrls, setUploadUrls] = useState(null);
    const [error, setError] = useState<any>(null);

    const uploadParts = async (
        file: File,
        signedURLs: Record<number, string>,
        chunkSize: number
    ): Promise<Part[]> => {
        const keys = Object.keys(signedURLs);
        const promises: Promise<Response>[] = keys.map((indexStr) => {
            const index = parseInt(indexStr);
            const start = index * chunkSize;
            const end = (index + 1) * chunkSize;
            const blob = index < keys.length ? file.slice(start, end) : file.slice(start);
            const url = signedURLs[index];
            return fetch(url, {
                method: "PUT",
                body: blob,
            })
        });

        const resultOfParts = await Promise.all(promises);
        const parts: Part[] = [];
        for (const [index, part] of resultOfParts.entries()) {
            const ETag = part.headers.get("ETag");
            const PartNumber = index + 1;
            if (ETag && PartNumber) {
                parts.push({
                    ETag,
                    PartNumber,
                })
            } else {
                console.error("Failed multipart upload");
            }
        }
        return parts;
    };

    const uploadFile = useCallback(
        async (files: FileList) => {
            try {
                const FILE_CHUNK_SIZE = 10_000_000; // 10 MB

                for (const file of files) {
                    const { name: fileName, type: contentType, size } = file;

                    const { key: uploadKey, uploadId } =
                        await initiateMultipartUpload({
                            studysetUUID,
                            userUUID,
                            fileName,
                            contentType,
                        });

                    const numParts = Math.ceil(size / FILE_CHUNK_SIZE);

                    const signedURLs = await getMultipartSignedUploadUrls({
                        key: uploadKey,
                        uploadId,
                        numParts,
                    });

                    const parts = await uploadParts(
                        file,
                        signedURLs,
                        FILE_CHUNK_SIZE
                    );

                    const fileMetadata = await completeMultipartUpload({
                        key: uploadKey,
                        uploadId,
                        parts
                    })

                    // currentFiles.push(fileMetadata);

                    // Further processing with initiateMultipartResponse if needed
                }
            } catch (error) {
                setError(error);
            }
        },
        [studysetUUID, userUUID]
    );

    return {
        uploadUrls,
        error,
        uploadFile,
    };
};

export default useFileUpload;
