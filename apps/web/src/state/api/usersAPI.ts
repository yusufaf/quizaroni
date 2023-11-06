import api from "./api";
import { UpdateMetadataParams } from "lib/types";


/* Endpoints
    router.post("/api/users/create", createUser);
    router.get("/api/users/get", getUser);
    router.post("/api/users/updateDefaultTheme", updateDefaultTheme);
    router.post("/api/users/updateUserMetadata", updateUserMetadata);
*/

export const usersApi = api.injectEndpoints({
    endpoints: (build) => ({
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
    }),
});

export const {
    useUpdateUserMetadataMutation
} = usersApi;