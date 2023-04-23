import { api } from "./api";
import { UUID, Studyset } from "src/lib/types";

type UpdateMetadataParams = {
    uuid: UUID;
    property: string;
    newValue: any;
};

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
*/

export const studysetsApi = api.injectEndpoints({
    endpoints: (build) => ({
        getStudysets: build.query<Studyset[], UUID>({
            query: (userUUID) => ({
                url: "studysets/get",
                method: "GET",
                params: { userUUID },
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
        deleteStudyset: build.mutation<void, UUID>({
            query: (UUID) => ({
                url: "studysets/delete",
                method: "POST",
                body: {UUID},
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
        createCategory: build.mutation<Studyset, Studyset>({
            query: (body) => ({
                url: "studysets/createCategory",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Studysets"],
        }),

        editCategory: build.mutation<Studyset, Studyset>({
            query: (body) => ({
                url: "studysets/editCategory",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Studysets"],
        }),
        deleteCategory: build.mutation<Studyset, Studyset>({
            query: (body) => ({
                url: "studysets/deleteCategory",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Studysets"],
        }),
        updateLastViewed: build.mutation<Studyset, UUID>({
            query: (uuid) => ({
                url: "studysets/updateLastViewed",
                method: "POST",
                body: {uuid},
            }),
            invalidatesTags: ["Studysets"],
        }),
        markCardAsImportant: build.mutation<Studyset, Studyset>({
            query: (body) => ({
                url: "studysets/markCardAsImportant",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Studysets"],
        }),
    }),
});

export const {
    useGetStudysetsQuery,
    useCreateStudysetMutation,
    useDeleteStudysetMutation,
    useUpdateStudysetMetadataMutation,
    useCreateCategoryMutation,
    useEditCategoryMutation,
    useDeleteCategoryMutation,
    useUpdateLastViewedMutation,
    useMarkCardAsImportantMutation,
} = studysetsApi;
