import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { BASE_API_URL, getCommonPostRequestProps } from './awsAPI';
import { validate } from 'shared/validation';
import { BaseResponseSchema, GetUserResponseSchema } from 'shared/schemas';
import {
    CreateUserRequest,
    DownloadUserDataRequest,
    GetUserRequest,
    GetUserResponse,
    UpdateDefaultThemeRequest,
    UpdateEmailRequest,
    UpdateUserMetadataRequest,
    User,
} from 'shared/types';

/* Endpoints
    router.post("/api/users/create", createUser);
    router.get("/api/users/get", getUser);
    router.post("/api/users/updateDefaultTheme", updateDefaultTheme);
    router.post("/api/users/updateUserMetadata", updateUserMetadata);
    router.post("/api/users/updateEmail", updateUserEmail);
*/

export const useGetUser = (options?: Omit<UseQueryOptions<GetUserResponse>, 'queryKey' | 'queryFn'>) => {
    return useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const response = await fetch(`${BASE_API_URL}/users/get-user`, {
                ...getCommonPostRequestProps(),
            });
            const data = await response.json();
            return validate({
                schema: GetUserResponseSchema,
                data,
                type: 'response',
                context: 'GetUser'
            });
        },
        ...options,
    });
};

export const useCreateUser = () => {
    return useMutation({
        mutationFn: async ({ email, username }: CreateUserRequest) => {
            const response = await fetch(`${BASE_API_URL}/users/create`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ email, username }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'CreateUser'
            });
        },
    });
};

export const useUpdateUserMetadata = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ updates }: UpdateUserMetadataRequest) => {
            const response = await fetch(`${BASE_API_URL}/users/update-metadata`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ updates }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateUserMetadata'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

export const useUpdateDefaultTheme = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ newTheme, uuid }: UpdateDefaultThemeRequest) => {
            const response = await fetch(`${BASE_API_URL}/users/updateDefaultTheme`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ uuid, newTheme }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateDefaultTheme'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

export const useUpdateEmail = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ username, newEmail }: UpdateEmailRequest) => {
            const response = await fetch(`${BASE_API_URL}/users/updateEmail`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ username, newEmail }),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateEmail'
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

export const useDownloadUserData = () => {
    return useMutation({
        mutationFn: async (params: DownloadUserDataRequest) => {
            const response = await fetch(`${BASE_API_URL}/users/download-user-data`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify(params),
            });
            const data = await response.json();
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'DownloadUserData'
            });
        },
    });
};
