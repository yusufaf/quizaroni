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
            query: ({ uuid, index, newCategory }) => ({
                url: "studysets/editCategory",
                method: "POST",
                body: { uuid, index, newCategory },
            }),
            invalidatesTags: ["Studyset"],
        }),
        deleteCategory: build.mutation<Studyset, DeleteCategoryParams>({
            query: ({ uuid, categoryToDelete }) => ({
                url: "studysets/deleteCategory",
                method: "POST",
                body: { uuid, categoryToDelete },
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
        createLabel: build.mutation<void, CreateLabelParams>({
            query: (body) => ({
                url: "studysets/createLabel",
                method: "POST",
                body,
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
} = studysetsApi;
