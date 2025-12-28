import { FileMetadata } from "./general";

export type UUID = string;
export type Timestamp = string;

export type Studyset = {
    PK: string;
    SK: string;
    cards: Card[];
    categories: string[];
    createdAt: Timestamp;
    description: string;
    favorited: boolean;
    labels: string[];
    lastViewed: Timestamp;
    metadata: StudysetMetadata;
    studysetUUID: UUID;
    title: string;
    updatedAt: Timestamp;
    userUUID: UUID;
    username: string;
};

export type Note = {
    text: string;
    noteUUID: UUID;
    createdAt: Timestamp;
};

export type Card = {
    backgroundColor?: string;
    categories: string[];
    definition: string;
    files: CardFileMetadata[];
    important: boolean;
    notes: Note[];
    term: string;
    textColor?: string;
    cardUUID: UUID;
};

export type StudysetMetadata = {
    backgroundColorVisible: boolean;
    contentOnly: boolean;
    customLabelTerminology: string;
    customTerminology: string;
    labelTerminology: string;
    notesDrawerInitial: string;
    notesDrawerPosition: string;
    notesSortBy?: 'alphabetical' | 'date' | 'cardOrder';
    notesSortDirection?: 'asc' | 'desc';
    publiclyViewable: boolean;
    terminology: string;
    textColorVisible: boolean;
};

export type CardFileMetadata = FileMetadata & {
    association: 'term' | 'definition';
}