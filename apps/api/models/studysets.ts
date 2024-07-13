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
    label: string;
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
};

export type Card = {
    backgroundColor?: string;
    categories: string[];
    definition: string;
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
    publiclyViewable: boolean;
    terminology: string;
    textColorVisible: boolean;
};
