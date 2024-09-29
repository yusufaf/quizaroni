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
    CreateNoteResponse,
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
                body: { studysetUUID },
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
        createNote: build.mutation<CreateNoteResponse, CreateNoteParams>({
            query: ({ cardUUID, studysetUUID }) => ({
                url: `${BASE_API_URL}/studysets/create-note`,
                ...getCommonPostRequestProps(),
                body: { cardUUID, studysetUUID },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: 'Studyset', id: arg.studysetUUID },
            ],
            async onQueryStarted(
                { cardUUID, studysetUUID },
                { dispatch, queryFulfilled }
            ) {
                // Optimistically update the cache
                const patchResult = dispatch(
                    api.util.updateQueryData(
                        // @ts-ignore
                        'getStudyset',
                        studysetUUID,
                        (draft) => {
                            // @ts-ignore
                            const cachedStudyset: Studyset = draft.studyset;
                            const cardToUpdate = cachedStudyset.cards.find(
                                (card) => card.cardUUID === cardUUID
                            );

                            if (cardToUpdate) {
                                cardToUpdate.notes.push({
                                    noteUUID: 'temporary-id', // Temporary ID until the real one is returned
                                    text: '',
                                });
                            } else {
                                console.error(
                                    `Card with cardUUID ${cardUUID} not found in the studyset.`
                                );
                            }
                        }
                    )
                );

                try {
                    const { data } = await queryFulfilled;
                    console.log("We out here");
                    // Update the cache to replace the `temporary-id` with the real noteUUID
                    dispatch(
                        api.util.updateQueryData(
                            // @ts-ignore
                            'getStudyset',
                            studysetUUID,
                            (draft) => {
                                const cardToUpdate = draft.studyset.cards.find(
                                    (card) => card.cardUUID === cardUUID
                                );
                                const noteToUpdate = cardToUpdate?.notes.find(
                                    (note) => note.noteUUID === 'temporary-id'
                                );

                                if (noteToUpdate) {
                                    // Replace the temporary-id with the real ID from the server
                                    noteToUpdate.noteUUID = data.noteUUID; // Assuming the server response contains `noteUUID`
                                }
                            }
                        )
                    );
                } catch {
                    // Invalidate the cache for the Studyset to trigger a re-fetch
                    dispatch(
                        api.util.invalidateTags([
                            { type: 'Studyset', id: studysetUUID },
                        ])
                    );
                }
            },
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
            query: ({ index, newLabel, oldLabel }) => ({
                url: `${BASE_API_URL}/studysets/edit-label`,
                ...getCommonPostRequestProps(),
                body: { index, newLabel, oldLabel },
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
