import { useMemo } from 'react';
import { useSession } from './session/SessionProvider';

export type AuthApi = {
    isAuthenticated: boolean;
    signOut: () => Promise<void>;
};

export const useAuth = (): AuthApi => {
    const { isAuthenticated, signOut } = useSession();
    return useMemo(
        () => ({ isAuthenticated, signOut }),
        [isAuthenticated, signOut]
    );
};
