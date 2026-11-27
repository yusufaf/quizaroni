import { useQuery } from '@tanstack/react-query';
import { AIStatusResponseSchema } from 'shared/schemas';
import { validate } from 'shared/validation';
import { BASE_API_URL, fetchJson } from './apiClient';

export const AI_STATUS_KEY = ['ai', 'status'];

// True only when the instance allows AI chat. undefined while the first
// status request is in flight.
export const useAIChatEnabled = (): boolean | undefined => {
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
        retry: false,
        staleTime: 5 * 60_000,
    });
    // Keep the last good answer when a background refetch fails.
    if (data) return data.enabled;
    return isError ? false : undefined;
};
