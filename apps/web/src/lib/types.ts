export type UUID = string;
export type Timestamp = number;

export type Card = {
    term: string;
    definition: string;
    textColor?: string;
    backgroundColor?: string;
    important: boolean;
    uuid: UUID;
    categories: string[];
};

export type StudysetMetadata = {
    textColorVisible: boolean;
    backgroundColorVisible: boolean;
    publiclyViewable: boolean;
};

export type Studyset = {
    cards: Card[];
    categories: any[];
    createdAt: Timestamp;
    description: string;
    label: string;
    lastViewed: Timestamp;
    metadata: StudysetMetadata;
    title: string;
    userUUID: UUID;
    username: string;
    uuid: UUID;
    _id: UUID;
};

/* RTK Query Types */

export type CreateStudysetParams = {
// TODO
};

export type DeleteStudysetParams = {
    uuid: UUID;
};

export type UpdateMetadataParams = {
    uuid: UUID;
    property: string;
    newValue: any;
};

export type CreateCategoryParams = {
    uuid: UUID;
    category: string;
};

export type DeleteCategoryParams = {
    uuid: UUID;
    categoryToDelete: string;
};

export type EditCategoryParams = {
    uuid: UUID;
    index: number;
    newCategory: string;
};

export type MarkCardAsImportantParams = {
    uuid: UUID;
    newValue: boolean;
}

export type SortDirection = "asc" | "dsc";
