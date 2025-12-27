import { z } from 'zod';

// #region Base Schemas
export const UUIDSchema = z.uuid({
    version: 'v4',
});
export const TimestampSchema = z.iso.datetime();
export const SignedURLSchema = z.url();

// #endregion

// #region Studyset Schemas
export const NoteSchema = z.object({
    noteUUID: UUIDSchema,
    text: z.string(),
});

export const CardFileMetadataSchema = z.object({
    association: z.enum(['term', 'definition']),
    key: z.string(),
    name: z.string(),
    signedURL: SignedURLSchema,
    size: z.number(),
});

export const CardSchema = z.object({
    backgroundColor: z.string().optional(),
    cardUUID: UUIDSchema,
    categories: z.array(z.string()),
    definition: z.string(),
    files: z.array(CardFileMetadataSchema),
    important: z.boolean(),
    notes: z.array(NoteSchema),
    term: z.string(),
    textColor: z.string().optional(),
});

export const StudysetMetadataSchema = z.object({
    backgroundColorVisible: z.boolean(),
    cardCountVisible: z.boolean().optional(),
    contentOnly: z.boolean().optional(),
    customLabelTerminology: z.string(),
    customTerminology: z.string(),
    labelTerminology: z.string(),
    notesDrawerInitial: z.string(),
    notesDrawerPosition: z.enum(['left', 'right']),
    publiclyViewable: z.boolean(),
    terminology: z.string(),
    textColorVisible: z.boolean(),
});

export const StudysetSchema = z.object({
    cards: z.array(CardSchema),
    categories: z.array(z.string()),
    createdAt: TimestampSchema,
    description: z.string(),
    favorited: z.boolean().optional(),
    labels: z.array(z.string()),
    lastViewed: TimestampSchema,
    metadata: StudysetMetadataSchema,
    studysetUUID: UUIDSchema,
    title: z.string(),
    username: z.string(),
    userUUID: UUIDSchema,
    uuid: UUIDSchema,
});

// #endregion

// #region User Schemas
export const NamedColorSchema = z.object({
    color: z.string(),
    name: z.string(),
});

export const UserMetadataSchema = z.object({
    defaultDownloadFormat: z.string(),
    defaultTheme: z.enum(['light', 'dark']),
    homeView: z.enum(['table', 'grid', 'html']),
    namedColors: z.array(NamedColorSchema),
    preferredDateFormat: z.string(),
});

export const UserSchema = z.object({
    createdAt: TimestampSchema,
    email: z.email(),
    labels: z.array(z.string()),
    metadata: UserMetadataSchema,
    username: z.string(),
    userUUID: UUIDSchema,
});

// #endregion

// #region API Request/Response Schemas

// Base
export const BaseResponseSchema = z.object({
    message: z.string(),
});

export const StudysetUUIDPayloadSchema = z.object({
    studysetUUID: UUIDSchema,
});

// Studysets
export const GetAllStudysetsResponseSchema = z.object({
    studysets: z.array(StudysetSchema),
});

export const GetStudysetRequestSchema = StudysetUUIDPayloadSchema;

export const GetStudysetResponseSchema = z.object({
    studyset: StudysetSchema,
});

export const CreateStudysetResponseSchema = z.object({
    studyset: StudysetSchema,
});

export const DeleteStudysetRequestSchema = StudysetUUIDPayloadSchema;

export const BatchDeleteStudysetsRequestSchema = z.object({
    studysetUUIDs: z.array(UUIDSchema),
});

export const BatchDeleteStudysetsResponseSchema = BaseResponseSchema;

export const DuplicateStudysetRequestSchema = StudysetUUIDPayloadSchema;

export const BatchDuplicateStudysetsRequestSchema = z.object({
    studysetUUIDs: z.array(UUIDSchema),
});

export const BatchDuplicateStudysetsResponseSchema = BaseResponseSchema;

export const UpdatesSchema = z.record(z.string(), z.any());

export const UpdateStudysetRequestSchema = z.object({
    isMetadataUpdate: z.boolean().optional(),
    studysetUUID: UUIDSchema,
    updates: UpdatesSchema,
});

export const UpdateStudysetResponseSchema = BaseResponseSchema.extend({
    studyset: StudysetSchema,
});

export const BatchUpdateStudysetsRequestSchema = z.object({
    studysetUpdates: z.array(z.tuple([UUIDSchema, UpdatesSchema])),
});

// Notes
export const CreateNoteRequestSchema = StudysetUUIDPayloadSchema.extend({
    cardUUID: UUIDSchema,
});

export const CreateNoteResponseSchema = z.object({
    noteUUID: z.string(),
});

export const DeleteNoteRequestSchema = StudysetUUIDPayloadSchema.extend({
    cardUUID: UUIDSchema,
    noteUUID: UUIDSchema,
});

export const EditNoteRequestSchema = StudysetUUIDPayloadSchema.extend({
    cardUUID: UUIDSchema,
    noteUUID: UUIDSchema,
    text: z.string(),
});

// Labels
export const CreateLabelRequestSchema = z.object({
    label: z.string(),
    studysetUUID: UUIDSchema.optional(),
    updateStudysetLabel: z.boolean().optional(),
});

export const DeleteLabelRequestSchema = z.object({
    labelsToDelete: z.array(z.string()),
});

export const EditLabelRequestSchema = z.object({
    index: z.number(),
    oldLabel: z.string(),
    newLabel: z.string(),
});

export const ChangeLabelRequestSchema = z.object({
    newLabel: z.string(), // deprecated
    studysetUUID: UUIDSchema,
});

export const UpdateStudysetLabelsRequestSchema = z.object({
    labels: z.array(z.string()),
    studysetUUID: UUIDSchema,
});

export const BatchUpdateStudysetLabelsRequestSchema = z.object({
    studysetUpdates: z.array(z.tuple([UUIDSchema, z.array(z.string())])),
});

// Categories
export const EditCategoryRequestSchema = StudysetUUIDPayloadSchema.extend({
    index: z.number(),
    newCategory: z.string(),
    oldCategory: z.string(),
});

// Users
export const GetUserResponseSchema = z.object({
    user: UserSchema,
});

export const CreateUserRequestSchema = z.object({
    email: z.email(),
    username: z.string(),
});

export const UpdateUserMetadataRequestSchema = z.object({
    updates: UpdatesSchema,
});

export const UpdateDefaultThemeRequestSchema = z.object({
    newTheme: z.enum(['light', 'dark']),
    uuid: UUIDSchema,
});

export const UpdateEmailRequestSchema = z.object({
    username: z.string(),
    newEmail: z.email(),
});

export const DownloadUserDataRequestSchema = z.object({
    includeStudysets: z.boolean(),
});

// Files
export const PartSchema = z.object({
    ETag: z.string(),
    PartNumber: z.number(),
});

export const FileMetadataSchema = z.object({
    key: z.string(),
    name: z.string(),
    signedURL: SignedURLSchema,
    size: z.number(),
});

export const InitiateMultipartUploadRequestSchema = z.object({
    contentType: z.string(),
    fileName: z.string(),
    studysetUUID: UUIDSchema.optional(),
});

export const InitiateMultipartUploadResponseSchema = z.object({
    key: z.string(),
    uploadId: z.string().optional(),
});

export const GetMultipartSignedUploadUrlsRequestSchema = z.object({
    key: z.string(),
    numParts: z.number(),
    uploadId: z.string(),
});

export const GetMultipartSignedUploadUrlsResponseSchema = z.object({
    signedURLs: z.record(z.string(), z.string()),
});

export const CompleteMultipartUploadRequestSchema = z.object({
    association: z.enum(['term', 'definition']).optional(),
    cardUUID: UUIDSchema.optional(),
    key: z.string(),
    parts: z.array(PartSchema),
    studysetUUID: UUIDSchema.optional(),
    uploadId: z.string(),
});

export const DeleteFileRequestSchema = z.object({
    key: z.string(),
});

export const SendFeedbackRequestSchema = z.object({
    key: z.string(),
});

// #endregion
