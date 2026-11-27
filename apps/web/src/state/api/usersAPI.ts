import {
    useQuery,
    useMutation,
    useQueryClient,
    UseQueryOptions,
} from '@tanstack/react-query';
import {
    BASE_API_URL,
    fetchJson,
    getCommonPostRequestProps,
} from './apiClient';
import { SOCIAL_PROVIDERS } from 'shared/auth/session/sessionClient';
import { downloadObjectAsJSON } from 'shared/utilities/general';
import { validate } from 'shared/validation';
import {
    AccountDeletionInfoSchema,
    BaseResponseSchema,
    GetUserResponseSchema,
    UpdateUsernameResponseSchema,
    UploadProfilePictureResponseSchema,
} from 'shared/schemas';
import {
    AccountDeletionInfo,
    DownloadUserDataRequest,
    GetUserRequest,
    GetUserResponse,
    UpdateNotificationPreferencesRequest,
    UpdateUserMetadataRequest,
    UpdateUsernameRequest,
    UploadProfilePictureRequest,
    User,
} from 'shared/types';

/* Endpoints
    router.get("/api/users/get", getUser);
    router.post("/api/users/updateUserMetadata", updateUserMetadata);
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

export const ACCOUNT_DELETION_KEY = ['user', 'account-deletion'];

// What deleting the signed-in account would remove and how it must be
// confirmed. Never cached: the time left on a recent sign-in goes stale.
export const useAccountDeletionInfo = (enabled: boolean) =>
    useQuery({
        queryKey: ACCOUNT_DELETION_KEY,
        queryFn: async (): Promise<AccountDeletionInfo> => {
            const data = await fetchJson(
                `${BASE_API_URL}/users/account-deletion`,
                { credentials: 'same-origin' }
            );
            const parsed = validate({
                schema: AccountDeletionInfoSchema,
                data,
                type: 'response',
                context: 'AccountDeletionInfo',
                reThrow: true,
            });
            return {
                ...parsed,
                providers: SOCIAL_PROVIDERS.filter((id) =>
                    parsed.providers.includes(id)
                ),
            };
        },
        enabled,
        retry: false,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
    });

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

export const useUpdateUsername = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ username }: UpdateUsernameRequest) => {
            const data = await fetchJson(
                `${BASE_API_URL}/users/update-username`,
                {
                    ...(await getCommonPostRequestProps()),
                    body: JSON.stringify({ username }),
                }
            );
            return validate({
                schema: UpdateUsernameResponseSchema,
                data,
                type: 'response',
                context: 'UpdateUsername',
            });
        },
        onSuccess: () => {
            // Every view that shows the user's name as a set's author.
            for (const queryKey of [
                ['user'],
                ['studysets'],
                ['public-studyset'],
                ['explore-feed'],
                ['explore-featured'],
            ]) {
                queryClient.invalidateQueries({ queryKey });
            }
        },
    });
};

// The self-host server returns the export itself; save it as a file.
export const downloadUserData = async ({
    includeStudysets,
}: DownloadUserDataRequest): Promise<void> => {
    const data = await fetchJson<object>(
        `${BASE_API_URL}/users/download-user-data`,
        {
            ...(await getCommonPostRequestProps()),
            body: JSON.stringify({ includeStudysets }),
        }
    );
    downloadObjectAsJSON(
        data,
        `quizaroni-data-${new Date().toISOString().slice(0, 10)}.json`
    );
};

export const useDownloadUserData = () => {
    return useMutation({
        mutationFn: downloadUserData,
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
