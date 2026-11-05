import { AuthRequestError } from 'shared/auth/session/sessionClient';

type Translate = (key: string, options?: Record<string, unknown>) => string;

const BY_CODE: Record<string, string> = {
    REGISTRATION_CLOSED: 'errors.registrationClosed',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'errors.emailTaken',
    INVALID_EMAIL: 'errors.invalidEmail',
    INVALID_NAME: 'errors.nameRequired',
    PASSWORD_TOO_SHORT: 'errors.passwordLength',
    PASSWORD_TOO_LONG: 'errors.passwordLength',
};

// Better Auth codes first: one status covers several causes (422 is both
// "email taken" and a failed insert; 400 covers email, name and password).
export const authErrorMessage = (err: unknown, t: Translate): string => {
    if (!(err instanceof AuthRequestError)) return t('errors.network');
    if (err.status === 401) return t('errors.invalidCredentials');
    if (err.status === 429) {
        return err.retryAfter === undefined
            ? t('errors.rateLimitedLater')
            : t('errors.rateLimited', { seconds: err.retryAfter });
    }
    const byCode = err.code ? BY_CODE[err.code] : undefined;
    if (byCode) return t(byCode);
    if (err.status === 403) return t('errors.forbidden');
    if (err.status === 400 || err.status === 413) {
        return t('errors.invalidInput');
    }
    return t('errors.network');
};
