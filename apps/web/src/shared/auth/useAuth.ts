import { useMemo } from 'react';
import { useLogto } from '@logto/react';
import { isSelfHost } from './backend';
import { useSessionAuth } from './session/SessionProvider';

export type AuthApi = {
    isAuthenticated: boolean;
    isLoading: boolean;
    signOut: () => Promise<void>;
    getAccessToken: () => Promise<string | undefined>;
    clearAccessToken: () => Promise<void>;
};

// logto's functions are read when called, so partial useLogto test mocks work.
export const useLogtoAuth = (): AuthApi => {
    const logto = useLogto();
    const { isAuthenticated, isLoading } = logto;
    return useMemo(
        () => ({
            isAuthenticated,
            isLoading: isLoading ?? false,
            signOut: () => logto.signOut(window.location.origin),
            getAccessToken: async () =>
                isAuthenticated
                    ? logto.getAccessToken(
                          import.meta.env.VITE_LOGTO_API_RESOURCE
                      )
                    : undefined,
            clearAccessToken: () => logto.clearAccessToken(),
        }),
        [isAuthenticated, isLoading, logto]
    );
};

// Chosen once at module load, so the hooks a component calls never change
// between renders.
export const useAuth: () => AuthApi = isSelfHost()
    ? useSessionAuth
    : useLogtoAuth;
