export type TODO = any;

export type UUID = string;
export type Timestamp = number;

export type InitialCard = {
    term: string;
    definition: string;
    uuid: UUID;
};

export type Note = {
    uuid: UUID;
    text: string;
};

export type Card = {
    term: string;
    definition: string;
    textColor?: string;
    backgroundColor?: string;
    important: boolean;
    uuid: UUID;
    categories: string[];
    notes: Note[];
};

export type StudysetMetadata = {
    textColorVisible: boolean;
    backgroundColorVisible: boolean;
    publiclyViewable: boolean;
    contentOnly?: boolean;
    terminology: string;
    customTerminology: string;
    labelTerminology: string;
    customLabelTerminology: string;
    notesDrawerPosition: string;
    notesDrawerInitial: string;
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
    uuid: string;
};

/* RTK Query Types */

export type StudysetUUIDPayload = {
    studysetUUID: UUID;
};

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

export type UpdateStudysetParams = {
    studyset: Studyset;
};

export type FavoriteStudysetParams = StudysetUUIDPayload & {
    favorited: boolean;
};

// Users API
export type GetUserParams = {
    username: string;
};

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

export type SortDirection = "asc" | "dsc";

export type ConfirmDialogProps = {
    cancelButtonText?: string;
    confirmButtonText?: string;
    dialogMessage?: string;
    open: boolean;
    title: string;
    type: string;
};

// export type ViewSetDialog =

export type OpenCardNotes = Set<UUID>;

export type ColorPickerType = "textColor" | "backgroundColor";
