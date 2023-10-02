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
} from "lib/types";

/* Endpoints
	router.post("/api/studysets/create", createStudySet);
	router.get("/api/studysets/get", getStudySets);
	router.post("/api/studysets/delete", deleteStudySet);
	router.post("/api/studysets/updateMetadata", updateStudySetMetadata);
	router.post("/api/studysets/createCategory", createStudySetCategory);
	router.post("/api/studysets/editCategory", editStudySetCategory);
	router.post("/api/studysets/deleteCategory", deleteStudySetCategory);
	router.post("/api/studysets/updateLastViewed", updateLastViewed);
	router.post("/api/studysets/markCardAsImportant", markCardAsImportant);
	router.post("/api/studysets/assignCardCategories", assignCardCategories)
    router.post("/api/studysets/createNote", createNote);

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
            // providesTags: ["Studyset"],
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
            // invalidatesTags: ["Studyset"],
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
            // invalidatesTags: ["Studyset"],
            invalidatesTags: [{ type: "Studyset", id: "LIST" }],
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
            invalidatesTags: ["Studyset"],
        }),
        createCategory: build.mutation<Studyset, CreateCategoryParams>({
            query: ({ uuid, category }) => ({
                url: "studysets/createCategory",
                method: "POST",
                body: { uuid, category },
            }),
            invalidatesTags: ["Studyset"],
        }),
        editCategory: build.mutation<Studyset, EditCategoryParams>({
            query: ({ studysetUUID, index, newCategory, oldCategory }) => ({
                url: "studysets/editCategory",
                method: "POST",
                body: { studysetUUID, index, newCategory, oldCategory },
            }),
            invalidatesTags: ["Studyset"],
        }),
        deleteCategory: build.mutation<Studyset, DeleteCategoryParams>({
            query: ({ studysetUUID, categoryToDelete }) => ({
                url: "studysets/deleteCategory",
                method: "POST",
                body: { studysetUUID, categoryToDelete },
            }),
            invalidatesTags: ["Studyset"],
        }),
        updateLastViewed: build.mutation<Studyset, UpdateLastViewedParams>({
            query: ({ uuid }) => ({
                url: "studysets/updateLastViewed",
                method: "POST",
                body: { uuid },
            }),
            invalidatesTags: ["Studyset"],
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
            invalidatesTags: ["Studyset"],
        }),
        assignCardCategories: build.mutation<void, AssignCardCategoriesParams>({
            query: ({ cardUUID, categories }) => ({
                url: "studysets/assignCardCategories",
                method: "POST",
                body: { cardUUID, categories },
            }),
            invalidatesTags: ["Studyset"],
        }),
        createNote: build.mutation<void, CreateNoteParams>({
            query: ({ cardUUID }) => ({
                url: "studysets/createNote",
                method: "POST",
                body: { cardUUID },
            }),
            invalidatesTags: ["Studyset"],
        }),
        deleteNote: build.mutation<void, DeleteNoteParams>({
            query: ({ cardUUID, noteUUID }) => ({
                url: "studysets/deleteNote",
                method: "POST",
                body: { cardUUID, noteUUID },
            }),
            invalidatesTags: ["Studyset"],
        }),
        editNote: build.mutation<void, EditNoteParams>({
            query: ({ cardUUID, noteUUID, text }) => ({
                url: "studysets/editNote",
                method: "POST",
                body: { cardUUID, noteUUID, text },
            }),
            invalidatesTags: ["Studyset"],
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
            query: ({ userUUID, labelToDelete }) => ({
                url: "studysets/createLabel",
                method: "POST",
                body: { userUUID, labelToDelete },
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
            invalidatesTags: ["Studyset"],
        }),
    }),
});

export const {
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
    useCreateStudysetMutation,
    useDeleteStudysetMutation,
    useDuplicateStudysetMutation,
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
