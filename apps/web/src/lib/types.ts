export type TODO = any;

export type UUID = string;
export type Timestamp = number;

// #region Theme
export type ThemeName = "light" | "dark";

// #endregion

export type InitialCard = {
    categories: string[];
    definition: string;
    important: boolean;
    notes: Note[];
    term: string;
    uuid: UUID;
};

export type Note = {
    text: string;
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
    uuid: UUID;
};

export type StudysetMetadata = {
    backgroundColorVisible: boolean;
    contentOnly?: boolean;
    customLabelTerminology: string;
    customTerminology: string;
    labelTerminology: string;
    notesDrawerInitial: string;
    notesDrawerPosition: string;
    publiclyViewable: boolean;
    terminology: string;
    textColorVisible: boolean;
};

export type Studyset = {
    cards: Card[];
    categories: any[];
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

export type AppTheme = "light" | "dark";
export type HomeView = "table" | "grid" | "html";
export type NamedColor = { color: string; name: string };

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

export type GetStudysetParams = {
    studysetUUID: UUID;
};

export type CreateStudysetParams = {
    // TODO
};

export type CreateStudysetResponse = { 
    studyset: Studyset; 
};

export type DeleteStudysetParams = {
    studysetUUID: UUID;
};

export type DuplicateStudysetParams = {
    uuid: UUID;
};

export type UpdateStudysetParams = {
    studysetUUID: string;
    updates: { [key: string]: any };
};

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

export type CreateCategoryParams = StudysetUUIDPayload & {
    category: string;
};

export type DeleteCategoryParams = StudysetUUIDPayload & {
    categoriesToDelete: string;
};

export type EditCategoryParams = StudysetUUIDPayload & {
    index: number;
    newCategory: string;
    oldCategory: string;
};

export type AssignCardCategoriesParams = StudysetUUIDPayload & {
    cardUUID: UUID;
    categories: string[];
};

export type MarkCardAsImportantParams = StudysetUUIDPayload & {
    cardUUID: UUID;
    newValue: boolean;
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

export type UpdateLastViewedParams = StudysetUUIDPayload;

export type CreateLabelParams = {
    userUUID: UUID;
    label: string;
    updateStudysetLabel: boolean;
    studysetUUID?: UUID;
};

export type DeleteLabelParams = {
    userUUID: UUID;
    labelsToDelete: string;
};

export type EditLabelParams = {
    userUUID: UUID;
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

// export type ViewSetDialog =

export type OpenCardNotes = Set<UUID>;

export type ColorPickerType = "textColor" | "backgroundColor";
