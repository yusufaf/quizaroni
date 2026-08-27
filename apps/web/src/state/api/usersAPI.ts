import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
} from '@tanstack/react-query';
import { BASE_API_URL, fetchJson, getCommonPostRequestProps } from './awsAPI';
import { validate } from 'shared/validation';
import {
    BaseResponseSchema,
    GetUserResponseSchema,
    UploadProfilePictureResponseSchema,
} from 'shared/schemas';
import {
    CreateUserRequest,
    DownloadUserDataRequest,
    GetUserRequest,
    GetUserResponse,
    UpdateDefaultThemeRequest,
    UpdateEmailRequest,
    UpdateNotificationPreferencesRequest,
    UpdateUserMetadataRequest,
    UploadProfilePictureRequest,
    User,
} from 'shared/types';

/* Endpoints
    router.post("/api/users/create", createUser);
    router.get("/api/users/get", getUser);
    router.post("/api/users/updateDefaultTheme", updateDefaultTheme);
    router.post("/api/users/updateUserMetadata", updateUserMetadata);
    router.post("/api/users/updateEmail", updateUserEmail);
*/

export const useGetUser = (
    options?: Omit<UseQueryOptions<GetUserResponse>, 'queryKey' | 'queryFn'>
) => {
    return useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            const data = await fetchJson(`${BASE_API_URL}/users/get-user`, {
                ...(await getCommonPostRequestProps()),
            });
            return validate({
                schema: GetUserResponseSchema,
                data,
                type: 'response',
                context: 'GetUser',
            });
        },
        ...options,
    });
};

export const useCreateUser = () => {
    return useMutation({
        mutationFn: async ({ email, username }: CreateUserRequest) => {
            const data = await fetchJson(`${BASE_API_URL}/users/create`, {
                ...(await getCommonPostRequestProps()),
                body: JSON.stringify({ email, username }),
            });
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'CreateUser',
            });
        },
    });
};

export const useUpdateUserMetadata = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ updates }: UpdateUserMetadataRequest) => {
            const data = await fetchJson(
                `${BASE_API_URL}/users/update-metadata`,
                {
                    ...(await getCommonPostRequestProps()),
                    body: JSON.stringify({ updates }),
                }
            );
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateUserMetadata',
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
            const data = await fetchJson(
                `${BASE_API_URL}/users/updateDefaultTheme`,
                {
                    ...(await getCommonPostRequestProps()),
                    body: JSON.stringify({ uuid, newTheme }),
                }
            );
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateDefaultTheme',
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
            const data = await fetchJson(`${BASE_API_URL}/users/updateEmail`, {
                ...(await getCommonPostRequestProps()),
                body: JSON.stringify({ username, newEmail }),
            });
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateEmail',
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
            const data = await fetchJson(
                `${BASE_API_URL}/users/download-user-data`,
                {
                    ...(await getCommonPostRequestProps()),
                    body: JSON.stringify(params),
                }
            );
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'DownloadUserData',
            });
        },
    });
};

export const useUploadProfilePicture = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            imageData,
            fileName,
            contentType,
        }: UploadProfilePictureRequest) => {
            const data = await fetchJson(
                `${BASE_API_URL}/users/upload-profile-picture`,
                {
                    ...(await getCommonPostRequestProps()),
                    body: JSON.stringify({ imageData, fileName, contentType }),
                }
            );
            return validate({
                schema: UploadProfilePictureResponseSchema,
                data,
                type: 'response',
                context: 'UploadProfilePicture',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};

export const useUpdateNotificationPreferences = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            updates,
        }: UpdateNotificationPreferencesRequest) => {
            const data = await fetchJson(
                `${BASE_API_URL}/users/update-notification-preferences`,
                {
                    ...(await getCommonPostRequestProps()),
                    body: JSON.stringify({ updates }),
                }
            );
            return validate({
                schema: BaseResponseSchema,
                data,
                type: 'response',
                context: 'UpdateNotificationPreferences',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
    });
};
