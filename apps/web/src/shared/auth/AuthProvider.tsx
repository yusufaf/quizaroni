import type { ReactNode } from 'react';
import { LogtoProvider, type LogtoConfig } from '@logto/react';
import { isSelfHost } from './backend';
import { SessionProvider } from './session/SessionProvider';

const logtoConfig: LogtoConfig = {
    endpoint: import.meta.env.VITE_LOGTO_ENDPOINT,
    appId: import.meta.env.VITE_LOGTO_APP_ID,
    // Requesting the API resource here means every access token issued to
    // this app carries an `aud` scoped to Quizaroni's API — never a token
    // usable against another project's API (see apiAuthorizer.ts).
    resources: [import.meta.env.VITE_LOGTO_API_RESOURCE],
};

export const AuthProvider = ({ children }: { children: ReactNode }) =>
    isSelfHost() ? (
        <SessionProvider>{children}</SessionProvider>
    ) : (
        <LogtoProvider config={logtoConfig}>{children}</LogtoProvider>
    );
