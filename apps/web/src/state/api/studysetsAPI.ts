import api from "./api";
import {
    UUID,
    Studyset,
    CreateCategoryParams,
    UpdateMetadataParams,
    DeleteCategoryParams,
    EditCategoryParams,
    MarkCardAsImportantParams,
    DeleteStudysetParams,
    UpdateLastViewedParams,
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
} from "lib/types";

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

/* */
export const studysetsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getAllStudysets: build.query<Studyset[], GetAllStudysetsParams>({
            query: ({ userUUID }) => ({
                url: "studysets/getAll",
                method: "GET",
                params: { userUUID },
            }),
            providesTags: (result) =>
                result
                    ? [
                          ...result.map(({ uuid }) => ({
                              type: "Studyset" as const,
                              uuid,
                          })),
                          { type: "Studyset", id: "LIST" },
                      ]
                    : [{ type: "Studyset", id: "LIST" }],
        }),
        getStudyset: build.query<Studyset, GetStudysetParams>({
            query: ({ uuid }) => ({
                url: "studysets/get",
                method: "GET",
                params: { uuid },
            }),
            providesTags: (result, error, arg) => [
                { type: "Studyset", id: result?.uuid },
            ],
        }),
        createStudyset: build.mutation<Studyset, any>({
            query: (body) => ({
                url: "studysets/create",
                method: "POST",
                body,
            }),
            invalidatesTags: [{ type: "Studyset", id: "LIST" }],
        }),
        deleteStudyset: build.mutation<void, DeleteStudysetParams>({
            query: ({ uuid }) => ({
                url: "studysets/delete",
                method: "POST",
                body: { uuid },
            }),
            // invalidatesTags: ["Studyset"],
            invalidatesTags: [{ type: "Studyset", id: "LIST" }],
        }),
        duplicateStudyset: build.mutation<void, DuplicateStudysetParams>({
            query: ({ uuid }) => ({
                url: "studysets/duplicate",
                method: "POST",
                body: { uuid },
            }),
            invalidatesTags: [{ type: "Studyset", id: "LIST" }],
        }),
        updateStudyset: build.mutation<void, UpdateStudysetParams>({
            query: ({ studyset }) => ({
                url: "studysets/update",
                method: "POST",
                body: { studyset },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studyset.uuid },
            ],        
        }),
        updateStudysetMetadata: build.mutation<void, UpdateMetadataParams>({
            query: ({ property, newValue, uuid }) => ({
                url: "studysets/updateMetadata",
                method: "POST",
                body: {
                    property,
                    newValue,
                    uuid,
                },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.uuid },
            ],
        }),
        createCategory: build.mutation<Studyset, CreateCategoryParams>({
            query: ({ studysetUUID, category }) => ({
                url: "studysets/createCategory",
                method: "POST",
                body: { studysetUUID, category },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        editCategory: build.mutation<Studyset, EditCategoryParams>({
            query: ({ studysetUUID, index, newCategory, oldCategory }) => ({
                url: "studysets/editCategory",
                method: "POST",
                body: { studysetUUID, index, newCategory, oldCategory },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        deleteCategory: build.mutation<Studyset, DeleteCategoryParams>({
            query: ({ studysetUUID, categoriesToDelete }) => ({
                url: "studysets/deleteCategory",
                method: "POST",
                body: { studysetUUID, categoriesToDelete },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        updateLastViewed: build.mutation<Studyset, UpdateLastViewedParams>({
            query: ({ studysetUUID }) => ({
                url: "studysets/updateLastViewed",
                method: "POST",
                body: { studysetUUID },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        markCardAsImportant: build.mutation<
            Studyset,
            MarkCardAsImportantParams
        >({
            query: ({ cardUUID, newValue }) => ({
                url: "studysets/markCardAsImportant",
                method: "POST",
                body: { cardUUID, newValue },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        assignCardCategories: build.mutation<void, AssignCardCategoriesParams>({
            query: ({ cardUUID, categories }) => ({
                url: "studysets/assignCardCategories",
                method: "POST",
                body: { cardUUID, categories },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        createNote: build.mutation<void, CreateNoteParams>({
            query: ({ cardUUID }) => ({
                url: "studysets/createNote",
                method: "POST",
                body: { cardUUID },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        deleteNote: build.mutation<void, DeleteNoteParams>({
            query: ({ cardUUID, noteUUID }) => ({
                url: "studysets/deleteNote",
                method: "POST",
                body: { cardUUID, noteUUID },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        editNote: build.mutation<void, EditNoteParams>({
            query: ({ cardUUID, noteUUID, text }) => ({
                url: "studysets/editNote",
                method: "POST",
                body: { cardUUID, noteUUID, text },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
            ],
        }),
        createLabel: build.mutation<void, CreateLabelParams>({
            query: (body) => ({
                url: "studysets/createLabel",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Studyset", "User"],
        }),
        deleteLabel: build.mutation<void, DeleteLabelParams>({
            query: ({ userUUID, labelsToDelete }) => ({
                url: "studysets/deleteLabel",
                method: "POST",
                body: { userUUID, labelsToDelete },
            }),
            invalidatesTags: ["Studyset", "User"],
        }),
        editLabel: build.mutation<void, EditLabelParams>({
            query: ({ userUUID, index, newLabel, oldLabel }) => ({
                url: "studysets/editLabel",
                method: "POST",
                body: { userUUID, index, newLabel, oldLabel },
            }),
            invalidatesTags: ["Studyset", "User"],
        }),
        changeLabel: build.mutation<void, ChangeLabelParams>({
            query: ({ studysetUUID, newLabel }) => ({
                url: "studysets/changeLabel",
                method: "POST",
                body: { studysetUUID, newLabel },
            }),
            invalidatesTags: (_result, _error, arg) => [
                { type: "Studyset", id: arg.studysetUUID },
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
    useUpdateLastViewedMutation,
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
