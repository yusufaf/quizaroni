import { BASE_API_URL, getCommonPostRequestProps } from 'state/api/awsAPI';
import api from './api';
import {
    CreateUserParams,
    GetUserParams,
    GetUserResponse,
    UpdateDefaultThemeParams,
    UpdateEmailParams,
    UpdateUserMetadataParams,
    User,
} from 'shared/types';

/* Endpoints
    router.post("/api/users/create", createUser);
    router.get("/api/users/get", getUser);
    router.post("/api/users/updateDefaultTheme", updateDefaultTheme);
    router.post("/api/users/updateUserMetadata", updateUserMetadata);
    router.post("/api/users/updateEmail", updateUserEmail);
*/

export const usersApi = api.injectEndpoints({
    endpoints: (build) => ({
        createUser: build.mutation<void, CreateUserParams>({
            query: ({ email, username }) => ({
                url: 'users/create',
                method: 'POST',
                params: { email, username },
            }),
        }),
        getUser: build.query<GetUserResponse, void>({
            query: () => ({
                url: `${BASE_API_URL}/users/get-user`,
                ...getCommonPostRequestProps(),
            }),
            providesTags: (result, _error, _arg) => {
                // @ts-ignore - TODO: Update types
                const { user } = result;
                return [{ type: 'User', id: user.userUUID }];
            },
        }),
        updateUserMetadata: build.mutation<void, UpdateUserMetadataParams>({
            query: ({ updates }) => ({
                url: `${BASE_API_URL}/users/update-metadata`,
                ...getCommonPostRequestProps(),
                body: { updates },
            }),
            invalidatesTags: ['User'],
        }),
        updateDefaultTheme: build.mutation<void, UpdateDefaultThemeParams>({
            query: ({ newTheme, uuid }) => ({
                url: 'users/updateDefaultTheme',
                method: 'POST',
                body: {
                    uuid,
                    newTheme,
                },
            }),
            invalidatesTags: ['User'],
        }),
        updateEmail: build.mutation<void, UpdateEmailParams>({
            query: ({ username, newEmail }) => ({
                url: 'users/updateEmail',
                method: 'POST',
                body: {
                    username,
                    newEmail,
                },
            }),
            invalidatesTags: ['User'],
        }),
    }),
});

export const {
    useCreateUserMutation,
    useGetUserQuery,
    useUpdateUserMetadataMutation,
    useUpdateDefaultThemeMutation,
    useUpdateEmailMutation,
} = usersApi;
