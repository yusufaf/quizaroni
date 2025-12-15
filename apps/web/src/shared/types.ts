import { DATE_FORMATS, DOWNLOAD_FILE_TYPES } from './constants/';
import { LabelsDialogTab } from 'components/ManageLabelsDialog/constants';

// #region Utility Types
export type TODO = any;
export type UUID = string;
export type Timestamp = string;
// #endregion

// #region Theme
export type ThemeName = 'light' | 'dark';
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
    files: CardFileMetadata[];
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

export type PrintConfig = {
    layout: 'flashcard' | 'list' | 'grid';
    includeNotes: boolean;
    includeFiles: boolean;
    includeCategories: boolean;
    showColors: boolean;
    importantOnly: boolean;
};

export type StudysetMetadata = {
    backgroundColorVisible: boolean;
    contentOnly?: boolean;
    cardCountVisible?: boolean;
    customLabelTerminology: string;
    customTerminology: string;
    labelTerminology: string;
    notesDrawerInitial: string;
    notesDrawerPosition: 'left' | 'right';
    printConfig?: PrintConfig;
    publiclyViewable: boolean;
    terminology: string;
    textColorVisible: boolean;
};

export type CardFileMetadata = FileMetadata & {
    association: 'term' | 'definition';
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
        preferredDateFormat: PreferredDateFormat;
        defaultDownloadFormat: DownloadSetFormat;
    };
    username: string;
    userUUID: UUID;
};

export type AppTheme = 'light' | 'dark';
export type HomeView = 'table' | 'grid' | 'html';
export type NamedColor = { color: string; name: string };

export type PreferredDateFormat =
    (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS];

export type DownloadSetFormat =
    (typeof DOWNLOAD_FILE_TYPES)[keyof typeof DOWNLOAD_FILE_TYPES];

// #endregion

/* RTK Query Types */

export type BaseResponse = {
    message: string;
};

export type StudysetUUIDPayload = {
    studysetUUID: UUID;
};

export type GetAllStudysetsRequest = {};

export type GetAllStudysetsResponse = {
    studysets: Studyset[];
};

export type GetStudysetResponse = {
    studyset: Studyset;
};

export type GetStudysetRequest = StudysetUUIDPayload;

export type CreateStudysetResponse = {
    studyset: Studyset;
};

export type DeleteStudysetRequest = StudysetUUIDPayload;

export type BatchDeleteStudysetsRequest = {
    studysetUUIDs: UUID[];
};

export type BatchDeleteStudysetsResponse = BaseResponse;

export type DuplicateStudysetRequest = StudysetUUIDPayload;

export type BatchDuplicateStudysetsRequest = {
    studysetUUIDs: UUID[];
};

export type BatchDuplicateStudysetsResponse = BaseResponse;

export type Updates = Record<string, any>;

export type UpdateStudysetRequest = {
    studysetUUID: string;
    updates: Updates;
    isMetadataUpdate?: boolean;
};

export type UpdateStudysetResponse = BaseResponse & {
    studyset: Studyset;
};

type StudysetUpdatesMap = [UUID, Updates][];
export type BatchUpdateStudysetsRequest = {
    studysetUpdates: StudysetUpdatesMap;
};

export type FavoriteStudysetRequest = StudysetUUIDPayload & {
    favorited: boolean;
};

// Users API
export type GetUserRequest = {};
export type GetUserResponse = {
    user: User;
};

export type CreateUserRequest = {
    email: string;
    username: string;
};

export type UpdateUserMetadataRequest = {
    updates: Updates;
};

export type UpdateDefaultThemeRequest = {
    uuid: UUID;
    newTheme: 'light' | 'dark';
};

export type UpdateEmailRequest = {
    username: string;
    newEmail: string;
};

export type DownloadUserDataRequest = {
    includeStudysets: boolean;
};

export type EditCategoryRequest = StudysetUUIDPayload & {
    index: number;
    newCategory: string;
    oldCategory: string;
};

export type CreateNoteResponse = {
    noteUUID: string;
};

export type CreateNoteRequest = StudysetUUIDPayload & {
    cardUUID: UUID;
};

export type DeleteNoteRequest = StudysetUUIDPayload & {
    cardUUID: UUID;
    noteUUID: UUID;
};

export type EditNoteRequest = StudysetUUIDPayload & {
    cardUUID: UUID;
    noteUUID: UUID;
    text: string;
};

export type CreateLabelRequest = {
    label: string;
    studysetUUID?: UUID;
    updateStudysetLabel?: boolean;
};

export type DeleteLabelRequest = {
    labelsToDelete: string[];
};

export type EditLabelRequest = {
    index: number;
    oldLabel: string;
    newLabel: string;
};

export type ChangeLabelRequest = {
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

// #region File Upload
export type InitiateMultipartUploadRequest = {
    contentType: string;
    fileName: string;
    studysetUUID?: UUID;
};

export type InitiateMultipartUploadResponse = {
    key: string;
    uploadId: string | undefined;
};

export type GetMultipartSignedUploadUrlsRequest = {
    key: string;
    numParts: number;
    uploadId: string;
};

export type GetMultipartSignedUploadUrlsResponse = {
    signedURLs: Record<number, string>;
};

export type CompleteMultipartUploadRequest = {
    association?: 'term' | 'definition';
    cardUUID?: string;
    key: string;
    parts: Part[];
    studysetUUID?: UUID;
    uploadId: string;
};

export type DeleteFileRequest = {
    key: string;
};

export type SendFeedbackRequest = {
    key: string;
};
// #endregion

// #region Redux

export type SortDirection = 'asc' | 'dsc';

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
};

// export type ViewSetDialog =

export type OpenCardNotes = Set<UUID>;

export type ColorPickerType = 'textColor' | 'backgroundColor';

// #endregion
