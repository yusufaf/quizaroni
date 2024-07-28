import { BASE_API_URL, getCommonPostRequestProps } from 'api/awsAPI';
import api from './api';
import {
    UUID,
    Studyset,
    EditCategoryParams,
    DeleteStudysetParams,
    GetAllStudysetsParams,
    GetStudysetParams,
    DuplicateStudysetParams,
    CreateLabelParams,
    DeleteLabelParams,
    EditLabelParams,
    ChangeLabelParams,
    CreateNoteParams,
    DeleteNoteParams,
    EditNoteParams,
    UpdateStudysetParams,
    GetAllStudysetsResponse,
    GetStudysetResponse,
    CreateStudysetResponse,
    BatchUpdateStudysetsParams,
} from 'lib/types';

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
            query: ({ studysetUUID }) => ({
                url: `${BASE_API_URL}/studysets/duplicate-studyset`,
                ...getCommonPostRequestProps(),
                body: { studysetUUID },
            }),
            invalidatesTags: [{ type: 'Studyset', id: 'LIST' }],
        }),
        updateStudyset: build.mutation<void, UpdateStudysetParams>({
            query: ({ studysetUUID, updates, isMetadataUpdate }) => ({
                url: `${BASE_API_URL}/studysets/update-studyset`,
                ...getCommonPostRequestProps(),
                body: { studysetUUID, updates, isMetadataUpdate },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
        }),
        batchUpdateStudysets: build.mutation<void, BatchUpdateStudysetsParams>({
            query: ({ studysetUpdates }) => ({
                url: `${BASE_API_URL}/studysets/batch-update-studysets`,
                ...getCommonPostRequestProps(),
                body: { studysetUpdates },
            }),
            // invalidatesTags: (_result, _error, arg) => [
                // { type: 'Studyset', id: arg.studysetUUID },
            // ],
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
            query: ({ cardUUID, noteUUID, studysetUUID, text }) => ({
                url: `${BASE_API_URL}/studysets/edit-note`,
                ...getCommonPostRequestProps(),
                body: { cardUUID, noteUUID, studysetUUID, text },
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
            query: ({ index, newLabel, oldLabel  }) => ({
                url: `${BASE_API_URL}/studysets/edit-label`,
                ...getCommonPostRequestProps(),
                body: { index, newLabel, oldLabel  },
            }),
            invalidatesTags: ['Studyset', 'User'],
        }),
        changeLabel: build.mutation<void, ChangeLabelParams>({
            query: ({ studysetUUID, newLabel }) => ({
                url: `${BASE_API_URL}/studysets/change-label`,
                ...getCommonPostRequestProps(),
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
    useBatchUpdateStudysetsMutation,
    useEditCategoryMutation,
    useCreateLabelMutation,
    useDeleteLabelMutation,
    useEditLabelMutation,
    useChangeLabelMutation,
    useCreateNoteMutation,
    useDeleteNoteMutation,
    useEditNoteMutation,
} = studysetsApi;
