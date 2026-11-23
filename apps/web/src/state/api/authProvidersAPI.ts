import { useQuery } from '@tanstack/react-query';
import { isSelfHost } from 'shared/auth/backend';
import {
    SOCIAL_PROVIDERS,
    type SocialProvider,
} from 'shared/auth/session/sessionClient';
import { AuthProvidersResponseSchema } from 'shared/schemas';
import { validate } from 'shared/validation';
import { BASE_API_URL, fetchJson } from './awsAPI';

export const AUTH_PROVIDERS_KEY = ['auth', 'providers'];

export type AuthProviders = {
    providers: SocialProvider[];
    registrationOpen: boolean;
};

// The sign-in methods the self-host server offers besides email and password.
// undefined while loading, on failure and in the hosted build, so the forms
// simply show no extra buttons.
export const useAuthProviders = (): AuthProviders | undefined => {
    const selfHost = isSelfHost();
    const { data } = useQuery({
        queryKey: AUTH_PROVIDERS_KEY,
        queryFn: async (): Promise<AuthProviders> => {
            const body = await fetchJson(`${BASE_API_URL}/auth/providers`, {
                credentials: 'same-origin',
            });
            const parsed = validate({
                schema: AuthProvidersResponseSchema,
                data: body,
                type: 'response',
                context: 'AuthProviders',
                reThrow: true,
            });
            return {
                providers: SOCIAL_PROVIDERS.filter((id) =>
                    parsed.providers.includes(id)
                ),
                registrationOpen: parsed.registrationOpen,
            };
        },
        enabled: selfHost,
        retry: false,
        staleTime: 60_000,
    });
    return selfHost ? data : undefined;
};
