import type { TFunction } from 'i18next';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { oauthErrorMessage } from './authErrorMessage';

// The OAuth callback returns to /login or /signUp with ?error=<code>. The
// message is read once, then the params are dropped from the URL so a reload
// or a shared link doesn't show it again. Only the code is used: the
// error_description is whatever the provider or a stranger put in the link.
export const useOAuthError = (t: TFunction<'auth'>): string | null => {
    const [params] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [message] = useState(() => {
        const code = params.get('error');
        return code ? oauthErrorMessage(code, t) : null;
    });

    useEffect(() => {
        if (!params.has('error') && !params.has('error_description')) return;
        const rest = new URLSearchParams(params);
        rest.delete('error');
        rest.delete('error_description');
        const search = rest.toString();
        void navigate(
            { pathname: location.pathname, search: search ? `?${search}` : '' },
            { replace: true, state: location.state }
        );
    }, [params, location.pathname, location.state, navigate]);

    return message;
};
