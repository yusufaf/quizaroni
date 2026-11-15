import { useQuery } from '@tanstack/react-query';
import { isSelfHost } from 'shared/auth/backend';
import { AIStatusResponseSchema } from 'shared/schemas';
import { validate } from 'shared/validation';
import { BASE_API_URL, fetchJson } from './awsAPI';

export const AI_STATUS_KEY = ['ai', 'status'];

// True only when the self-host instance allows AI chat. undefined while the
// first status request is in flight; the hosted build has no AI route.
export const useAIChatEnabled = (): boolean | undefined => {
    const selfHost = isSelfHost();
    const { data, isError } = useQuery({
        queryKey: AI_STATUS_KEY,
        queryFn: async () => {
            const body = await fetchJson(`${BASE_API_URL}/ai/status`, {
                credentials: 'same-origin',
            });
            return validate({
                schema: AIStatusResponseSchema,
                data: body,
                type: 'response',
                context: 'AIStatus',
                reThrow: true,
            });
        },
        enabled: selfHost,
        retry: false,
        staleTime: 5 * 60_000,
    });
    if (!selfHost) return false;
    // Keep the last good answer when a background refetch fails.
    if (data) return data.enabled;
    return isError ? false : undefined;
};
