import { api } from "./api";
import {
    UUID,
    Studyset,
    CreateCategoryParams,
    UpdateMetadataParams,
    DeleteCategoryParams,
    EditCategoryParams,
    MarkCardAsImportantParams,
    DeleteStudysetParams,
} from "lib/types";
import {
    setSelectedStudySet,
    selectSelectedStudySet,
} from "state/slices/studysetsSlice";
import { store } from "state/store";

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
const selectedStudySetMutation = {
    transformResponse: (response, meta, arg) => {
        console.log("Transform response = ", { response, meta, arg });
        // your transformation logic goes here

        const state = store.getState();
        const selectedStudySet = selectSelectedStudySet(state);

        // If a mutation is being made on a study set, update the selected study set in the Redux store.
        if (selectedStudySet && arg.uuid === selectedStudySet.uuid) {
        }

        return response;
    },
};

export const studysetsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getAllStudysets: build.query<Studyset[], UUID>({
            query: (userUUID) => ({
                url: "studysets/getAll",
                method: "GET",
                params: { userUUID },
            }),
            providesTags: ["Studysets"],
        }),
        getStudyset: build.query<Studyset, UUID>({
            query: (uuid) => ({
                url: "studysets/get",
                method: "GET",
                params: { uuid },
            }),
            providesTags: ["Studysets"],
        }),
        createStudyset: build.mutation<Studyset, any>({
            query: (body) => ({
                url: "studysets/create",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Studysets"],
        }),
        deleteStudyset: build.mutation<void, DeleteStudysetParams>({
            query: ({ uuid }) => ({
                url: "studysets/delete",
                method: "POST",
                body: { uuid },
            }),
            invalidatesTags: ["Studysets"],
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
            invalidatesTags: ["Studysets"],
        }),
        createCategory: build.mutation<Studyset, CreateCategoryParams>({
            query: ({ uuid, category }) => ({
                url: "studysets/createCategory",
                method: "POST",
                body: { uuid, category },
            }),
            invalidatesTags: ["Studysets"],
        }),
        editCategory: build.mutation<Studyset, EditCategoryParams>({
            query: ({ uuid, index, newCategory }) => ({
                url: "studysets/editCategory",
                method: "POST",
                body: { uuid, index, newCategory },
            }),
            invalidatesTags: ["Studysets"],
        }),
        deleteCategory: build.mutation<Studyset, DeleteCategoryParams>({
            query: ({ uuid, categoryToDelete }) => ({
                url: "studysets/deleteCategory",
                method: "POST",
                body: { uuid, categoryToDelete },
            }),
            invalidatesTags: ["Studysets"],
        }),
        updateLastViewed: build.mutation<Studyset, UUID>({
            query: (uuid) => ({
                url: "studysets/updateLastViewed",
                method: "POST",
                body: { uuid },
            }),
            invalidatesTags: ["Studysets"],
        }),
        markCardAsImportant: build.mutation<Studyset, MarkCardAsImportantParams>({
            query: ({uuid, newValue}) => ({
                url: "studysets/markCardAsImportant",
                method: "POST",
                body: {uuid, newValue},
            }),
            invalidatesTags: ["Studysets"],
        }),
        assignCardCategories: build.mutation<void, any>({
            query: ({ uuid, categories }) => ({
                url: "studysets/assignCardCategories",
                method: "POST",
                body: { uuid, categories },
            }),
            invalidatesTags: ["Studysets"],
            ...selectedStudySetMutation,
        }),
    }),
});

export const {
    useGetAllStudysetsQuery,
    useGetStudysetQuery,
    useCreateStudysetMutation,
    useDeleteStudysetMutation,
    useUpdateStudysetMetadataMutation,
    useCreateCategoryMutation,
    useEditCategoryMutation,
    useDeleteCategoryMutation,
    useUpdateLastViewedMutation,
    useMarkCardAsImportantMutation,
    useAssignCardCategoriesMutation,
} = studysetsApi;
