import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BASE_API_URL, getCommonPostRequestProps } from './awsAPI';
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

export const useGetUser = () => {
    return useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const response = await fetch(`${BASE_API_URL}/users/get-user`, {
                ...getCommonPostRequestProps(),
            });
            return response.json() as Promise<GetUserResponse>;
        },
    });
};

export const useCreateUser = () => {
    return useMutation({
        mutationFn: async ({ email, username }: CreateUserRequest) => {
            await fetch('users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, username }),
            });
        },
    });
};

export const useUpdateUserMetadata = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ updates }: UpdateUserMetadataRequest) => {
            await fetch(`${BASE_API_URL}/users/update-metadata`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify({ updates }),
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
            await fetch('users/updateDefaultTheme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uuid, newTheme }),
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
            await fetch('users/updateEmail', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, newEmail }),
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
            await fetch(`${BASE_API_URL}/users/download-user-data`, {
                ...getCommonPostRequestProps(),
                body: JSON.stringify(params),
            });
        },
    });
};
