export type TODO = any;

export type UUID = string;
export type Timestamp = number;

export type InitialCard = {
    term: string;
    definition: string;
    uuid: UUID;
}

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
    terminology: string;
    customTerminology: string;
    labelTerminology: string;
    customLabelTerminology: string;
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

export type GetAllStudysetsParams = {
    userUUID: UUID;
};

export type GetStudysetParams = {
    uuid: UUID;
};  

export type CreateStudysetParams = {
// TODO
};

export type DeleteStudysetParams = {
    uuid: UUID;
};

export type DuplicateStudysetParams = {
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
    studysetUUID: UUID;
    categoryToDelete: string;
};

export type EditCategoryParams = {
    studysetUUID: UUID;
    index: number;
    newCategory: string;
    oldCategory: string;
};

export type AssignCardCategoriesParams = {
    cardUUID: UUID;
    categories: string[];
}

export type MarkCardAsImportantParams = {
    cardUUID: UUID;
    newValue: boolean;
}

export type UpdateLastViewedParams = {
    uuid: UUID;
}

export type CreateLabelParams = {
    userUUID: UUID;
    label: string;
    updateStudysetLabel: boolean;
    studysetUUID?: UUID;
}

export type DeleteLabelParams = {
    userUUID: UUID;
    labelToDelete: string;
}

export type EditLabelParams = {
    userUUID: UUID;
    index: number;
    oldLabel: string;
    newLabel: string;
}

export type ChangeLabelParams = {
    studysetUUID: UUID;
    newLabel: string;
}

export type SortDirection = "asc" | "dsc";

export type ConfirmDialogProps = {
    cancelButtonText?: string;
    confirmButtonText?: string;
    dialogMessage?: string;
    open: boolean;
    title: string;
    type: string;
}