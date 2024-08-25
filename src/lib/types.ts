import { LabelsDialogTab } from "components/ManageLabelsDialog/constants";

// #region Utility Types
export type TODO = any;
export type UUID = string;
export type Timestamp = number;
// #endregion

// #region Theme
export type ThemeName = "light" | "dark";
// #endregion

// #region Studysets
export type Studyset = {
    cards: Card[];
    categories: string[];
    createdAt: Timestamp;
    description: string;
    favorited?: boolean;
    label: string;
    lastViewed: Timestamp;
    metadata: StudysetMetadata;
    studysetUUID: UUID;
    title: string;
    userUUID: UUID;
    username: string;
    uuid: UUID;
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

export type Note = {
    text: string;
    noteUUID: UUID;
};

export type StudysetMetadata = {
    backgroundColorVisible: boolean;
    contentOnly?: boolean;
    customLabelTerminology: string;
    customTerminology: string;
    labelTerminology: string;
    notesDrawerInitial: string;
    notesDrawerPosition: 'left' | 'right';
    publiclyViewable: boolean;
    terminology: string;
    textColorVisible: boolean;
};
// #endregion

// #region User
export type User = {
    createdAt: Timestamp;
    email: string;
    labels: string[];
    metadata: {
        defaultTheme: AppTheme;
        homeView: HomeView;
        namedColors: NamedColor[];
    };
    username: string;
    userUUID: UUID;
};

export type AppTheme = "light" | "dark";
export type HomeView = "table" | "grid" | "html";
export type NamedColor = { color: string; name: string };
// #endregion

/* RTK Query Types */

export type StudysetUUIDPayload = {
    studysetUUID: UUID;
};

export type GetAllStudysetsParams = {
};

export type GetAllStudysetsResponse = { 
    studysets: Studyset[] 
};

export type GetStudysetResponse = { 
    studyset: Studyset; 
};

export type GetStudysetParams = StudysetUUIDPayload

export type CreateStudysetResponse = { 
    studyset: Studyset; 
};

export type DeleteStudysetParams = StudysetUUIDPayload

export type DuplicateStudysetParams = StudysetUUIDPayload

export type Updates = { [key: string]: any };

export type UpdateStudysetParams = {
    studysetUUID: string;
    updates: Updates;
    isMetadataUpdate?: boolean;
};

type StudysetUpdatesMap = [UUID, Updates][];
export type BatchUpdateStudysetsParams = {
    studysetUpdates: StudysetUpdatesMap;
}

export type FavoriteStudysetParams = StudysetUUIDPayload & {
    favorited: boolean;
};

// Users API
export type GetUserParams = {};
export type GetUserResponse = {
    user: User;
}

export type CreateUserParams = {
    email: string;
    username: string;
};

export type UpdateMetadataParams = {
    uuid: UUID;
    property: string;
    newValue: any;
};

export type UpdateDefaultThemeParams = {
    uuid: UUID;
    newTheme: "light" | "dark";
};

export type UpdateEmailParams = {
    username: string;
    newEmail: string;
};

export type EditCategoryParams = StudysetUUIDPayload & {
    index: number;
    newCategory: string;
    oldCategory: string;
};

export type CreateNoteParams = StudysetUUIDPayload & {
    cardUUID: UUID;
};

export type DeleteNoteParams = StudysetUUIDPayload & {
    cardUUID: UUID;
    noteUUID: UUID;
};

export type EditNoteParams = StudysetUUIDPayload & {
    cardUUID: UUID;
    noteUUID: UUID;
    text: string;
};

export type CreateLabelParams = {
    label: string;
    studysetUUID?: UUID;
    updateStudysetLabel?: boolean;
};

export type DeleteLabelParams = {
    labelsToDelete: string[];
};

export type EditLabelParams = {
    index: number;
    oldLabel: string;
    newLabel: string;
};

export type ChangeLabelParams = {
    studysetUUID: UUID;
    newLabel: string;
};

export type FileMetadata = {
    key: string;
    name: string;
    signedURL: string;
    size: number;
};

export type Part = {
    ETag: string;
    PartNumber: number;
};

// #region Redux

export type SortDirection = "asc" | "dsc";

export type ConfirmDialogProps = {
    cancelButtonText?: string;
    confirmButtonText?: string;
    dialogMessage?: string;
    open: boolean;
    title: string;
    type: string;
    props?: any;
};

export type LabelsDialogProps = {
    open: boolean;
    studysetUUID?: string;
    selectedStudysetUUIDs?: string[];
    tab?: LabelsDialogTab;
}

// export type ViewSetDialog =

export type OpenCardNotes = Set<UUID>;

export type ColorPickerType = "textColor" | "backgroundColor";

// #endregion
