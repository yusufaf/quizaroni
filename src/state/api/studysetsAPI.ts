import { BASE_API_URL, getCommonPostRequestProps } from 'api/awsAPI';
import api from './api';
import {
    UUID,
    Studyset,
    CreateCategoryParams,
    UpdateMetadataParams,
    DeleteCategoryParams,
    EditCategoryParams,
    MarkCardAsImportantParams,
    DeleteStudysetParams,
    GetAllStudysetsParams,
    GetStudysetParams,
    AssignCardCategoriesParams,
    DuplicateStudysetParams,
    CreateLabelParams,
    DeleteLabelParams,
    EditLabelParams,
    ChangeLabelParams,
    CreateNoteParams,
    DeleteNoteParams,
    EditNoteParams,
    UpdateStudysetParams,
    FavoriteStudysetParams,
    GetAllStudysetsResponse,
    GetStudysetResponse,
    CreateStudysetResponse,
} from 'lib/types';

/* Endpoints
    // Studysets
    router.post("/api/studysets/create", createStudySet);
    router.post("/api/studysets/update", updateStudySet);
    router.get("/api/studysets/getAll", getStudySets);
    router.get("/api/studysets/get", getStudySet);
    router.post("/api/studysets/delete", deleteStudySet);
    router.post("/api/studysets/duplicate", duplicateStudySet);
    router.post("/api/studysets/updateMetadata", updateStudySetMetadata);
    router.post("/api/studysets/createCategory", createStudySetCategory);
    router.post("/api/studysets/editCategory", editStudySetCategory);
    router.post("/api/studysets/deleteCategory", deleteStudySetCategory);
    router.post("/api/studysets/updateLastViewed", updateLastViewed);
    router.post("/api/studysets/favorite", favoriteStudyset);
    // Cards
    router.post("/api/studysets/markCardAsImportant", markCardAsImportant);
    router.post("/api/studysets/assignCardCategories", assignCardCategories);
    router.post("/api/studysets/createNote", createNote);
    router.post("/api/studysets/deleteNote", deleteNote);
    router.post("/api/studysets/editNote", editNote);
    // Labels
    router.post("/api/studysets/createLabel", createLabel);
    router.post("/api/studysets/deleteLabel", deleteLabel);
    router.post("/api/studysets/editLabel", editLabel);
    router.post("/api/studysets/changeLabel", changeLabel);
*/

// TODO: Look into set actions delete, duplicate, favorite. Currently fetches all studysets again once called.
export const studysetsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getAllStudysets: build.query<
            GetAllStudysetsResponse,
            GetAllStudysetsParams
        >({
            query: () => ({
                url: `${BASE_API_URL}/studysets/get-all-studysets`,
                ...getCommonPostRequestProps(),
            }),
            providesTags: (result) => {
                console.log('In providesTags for RTK query', { result });
                const { studysets } = result ?? {};

                if (studysets) {
                    return [
                        ...studysets.map(({ studysetUUID }) => ({
                            type: 'Studyset' as const,
                            studysetUUID,
                        })),
                        { type: 'Studyset', id: 'LIST' },
                    ];
                } else {
                    return [{ type: 'Studyset', id: 'LIST' }];
                }
            },
        }),
        getStudyset: build.query<GetStudysetResponse, GetStudysetParams>({
            query: ({ studysetUUID }) => ({
                url: `${BASE_API_URL}/studysets/get-studyset`,
                ...getCommonPostRequestProps(),
                body: { studysetUUID },
            }),
            providesTags: (result, error, arg) => {
                console.log({ result });
                // @ts-ignore - TODO: Update types
                const { studyset } = result;
                return [{ type: 'Studyset', id: studyset.studysetUUID }];
            },
        }),
        createStudyset: build.mutation<CreateStudysetResponse, any>({
            query: () => ({
                url: `${BASE_API_URL}/studysets/create-studyset`,
                ...getCommonPostRequestProps(),
            }),
            invalidatesTags: [{ type: 'Studyset', id: 'LIST' }],
        }),
        deleteStudyset: build.mutation<void, DeleteStudysetParams>({
            query: ({ studysetUUID }) => ({
                url: `${BASE_API_URL}/studysets/delete-studyset`,
                ...getCommonPostRequestProps(),
                params: { studysetUUID },
            }),
            // invalidatesTags: ["Studyset"],
            invalidatesTags: [{ type: 'Studyset', id: 'LIST' }],
        }),
        duplicateStudyset: build.mutation<void, DuplicateStudysetParams>({
            query: ({ uuid }) => ({
                url: 'studysets/duplicate-studyset',
                method: 'POST',
                body: { uuid },
            }),
            invalidatesTags: [{ type: 'Studyset', id: 'LIST' }],
        }),
        updateStudyset: build.mutation<void, UpdateStudysetParams>({
            query: ({ studysetUUID, updates }) => ({
                url: `${BASE_API_URL}/studysets/update-studyset`,
                ...getCommonPostRequestProps(),
                body: { studysetUUID, updates },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        updateStudysetMetadata: build.mutation<void, UpdateMetadataParams>({
            query: ({ property, newValue, uuid }) => ({
                url: 'studysets/updateMetadata',
                method: 'POST',
                body: {
                    property,
                    newValue,
                    uuid,
                },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.uuid },
            ],
        }),
        createCategory: build.mutation<Studyset, CreateCategoryParams>({
            query: ({ studysetUUID, category }) => ({
                url: 'studysets/createCategory',
                method: 'POST',
                body: { studysetUUID, category },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        editCategory: build.mutation<Studyset, EditCategoryParams>({
            query: ({ studysetUUID, index, newCategory, oldCategory }) => ({
                url: 'studysets/editCategory',
                method: 'POST',
                body: { studysetUUID, index, newCategory, oldCategory },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        deleteCategory: build.mutation<Studyset, DeleteCategoryParams>({
            query: ({ studysetUUID, categoriesToDelete }) => ({
                url: 'studysets/deleteCategory',
                method: 'POST',
                body: { studysetUUID, categoriesToDelete },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        favoriteStudyset: build.mutation<Studyset, FavoriteStudysetParams>({
            query: ({ studysetUUID, favorited }) => ({
                url: 'studysets/favorite',
                method: 'POST',
                body: { studysetUUID, favorited },
            }),
            invalidatesTags: [{ type: 'Studyset', id: 'LIST' }],
        }),
        markCardAsImportant: build.mutation<
            Studyset,
            MarkCardAsImportantParams
        >({
            query: ({ cardUUID, newValue }) => ({
                url: 'studysets/markCardAsImportant',
                method: 'POST',
                body: { cardUUID, newValue },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        assignCardCategories: build.mutation<void, AssignCardCategoriesParams>({
            query: ({ cardUUID, categories }) => ({
                url: 'studysets/assignCardCategories',
                method: 'POST',
                body: { cardUUID, categories },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        createNote: build.mutation<void, CreateNoteParams>({
            query: ({ cardUUID, studysetUUID }) => ({
                url: `${BASE_API_URL}/studysets/create-note`,
                ...getCommonPostRequestProps(),
                body: { cardUUID, studysetUUID },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        deleteNote: build.mutation<void, DeleteNoteParams>({
            query: ({ cardUUID, noteUUID, studysetUUID }) => ({
                url: `${BASE_API_URL}/studysets/delete-note`,
                ...getCommonPostRequestProps(),
                body: { cardUUID, noteUUID, studysetUUID },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        editNote: build.mutation<void, EditNoteParams>({
            query: ({ cardUUID, noteUUID, text }) => ({
                url: 'studysets/editNote',
                method: 'POST',
                body: { cardUUID, noteUUID, text },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        createLabel: build.mutation<void, CreateLabelParams>({
            query: ({ label, studysetUUID, updateStudysetLabel }) => ({
                url: `${BASE_API_URL}/studysets/create-label`,
                ...getCommonPostRequestProps(),
                body: { label, studysetUUID, updateStudysetLabel },
            }),
            invalidatesTags: ['Studyset', 'User'],
        }),
        deleteLabel: build.mutation<void, DeleteLabelParams>({
            query: ({ labelsToDelete }) => ({
                url: `${BASE_API_URL}/studysets/delete-label`,
                ...getCommonPostRequestProps(),
                body: { labelsToDelete },
            }),
            invalidatesTags: ['Studyset', 'User'],
        }),
        editLabel: build.mutation<void, EditLabelParams>({
            query: ({ userUUID, index, newLabel, oldLabel }) => ({
                url: 'studysets/editLabel',
                method: 'POST',
                body: { userUUID, index, newLabel, oldLabel },
            }),
            invalidatesTags: ['Studyset', 'User'],
        }),
        changeLabel: build.mutation<void, ChangeLabelParams>({
            query: ({ studysetUUID, newLabel }) => ({
                url: 'studysets/changeLabel',
                method: 'POST',
                body: { studysetUUID, newLabel },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
    }),
});

export const {
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
    useCreateStudysetMutation,
    useDeleteStudysetMutation,
    useDuplicateStudysetMutation,
    useUpdateStudysetMutation,
    useUpdateStudysetMetadataMutation,
    useCreateCategoryMutation,
    useEditCategoryMutation,
    useDeleteCategoryMutation,
    useFavoriteStudysetMutation,
    useMarkCardAsImportantMutation,
    useAssignCardCategoriesMutation,
    useCreateLabelMutation,
    useDeleteLabelMutation,
    useEditLabelMutation,
    useChangeLabelMutation,
    useCreateNoteMutation,
    useDeleteNoteMutation,
    useEditNoteMutation,
} = studysetsApi;
