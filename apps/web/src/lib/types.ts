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

export type SortDirection = "asc" | "dsc";
