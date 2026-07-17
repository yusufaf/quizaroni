export type FileMetadata = {
    key: string;
    name: string;
    signedURL: string;
    size: number;
    uploadedAt?: string;
};

export type CardFileMetadata = FileMetadata & {
    association: 'term' | 'definition';
};
