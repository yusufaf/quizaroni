import api from "./api";
import { GetUserParams, UpdateDefaultThemeParams, UpdateMetadataParams, User } from "lib/types";


/* Endpoints
    router.post("/api/users/create", createUser);
    router.get("/api/users/get", getUser);
    router.post("/api/users/updateDefaultTheme", updateDefaultTheme);
    router.post("/api/users/updateUserMetadata", updateUserMetadata);
*/

export const usersApi = api.injectEndpoints({
    endpoints: (build) => ({
        getUser: build.query<User, GetUserParams>({
            query: ({ username }) => ({
                url: "users/get",
                method: "GET",
                params: { username },
            }),
            providesTags: (result, _error, _arg) => [
                { type: "User", id: result?.uuid },
            ],
        }),
        updateUserMetadata: build.mutation<void, UpdateMetadataParams>({
            query: ({ property, newValue, uuid }) => ({
                url: "users/updateMetadata",
                method: "POST",
                body: {
                    property,
                    newValue,
                    uuid,
                },
            }),
            invalidatesTags: ["User"],
        }),
        updateDefaultTheme: build.mutation<void, UpdateDefaultThemeParams>({
            query: ({ newTheme, uuid }) => ({
                url: "users/updateDefaultTheme",
                method: "POST",
                body: {
                    uuid,
                    newTheme
                },
            }),
            invalidatesTags: ["User"],
        }),
    }),
});

export const {
    useGetUserQuery,
    useUpdateUserMetadataMutation,
    useUpdateDefaultThemeMutation,
} = usersApi;