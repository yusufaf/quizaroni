import type { ParseKeys, TFunction } from 'i18next';
import { AuthRequestError } from 'shared/auth/session/sessionClient';

const BY_CODE: Record<string, ParseKeys<'auth'>> = {
    REGISTRATION_CLOSED: 'errors.registrationClosed',
    INVITE_INVALID: 'errors.inviteInvalid',
    INVALID_TOKEN: 'errors.resetLinkInvalid',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'errors.emailTaken',
    INVALID_EMAIL: 'errors.invalidEmail',
    INVALID_NAME: 'errors.nameRequired',
    PASSWORD_TOO_SHORT: 'errors.passwordLength',
    PASSWORD_TOO_LONG: 'errors.passwordLength',
};

// Codes the OAuth callback puts in ?error=: Better Auth's own (lowercase) and
// the server's (uppercase). Anything else, including a code the page was sent
// by a stranger, gets the generic message.
const OAUTH_BY_CODE: Record<string, string> = {
    account_not_linked: 'errors.accountNotLinked',
    signup_disabled: 'errors.noLinkedAccount',
    SOCIAL_EMAIL_UNVERIFIED: 'errors.socialEmailUnverified',
    access_denied: 'errors.socialCancelled',
    REGISTRATION_CLOSED: 'errors.registrationClosed',
    INVITE_INVALID: 'errors.inviteInvalid',
};

const lookup = (
    table: Record<string, string>,
    code: string | undefined
): string | undefined =>
    code !== undefined && Object.hasOwn(table, code) ? table[code] : undefined;

export const oauthErrorMessage = (code: string, t: Translate): string =>
    t(lookup(OAUTH_BY_CODE, code) ?? 'errors.socialFailed');

// Better Auth codes first: one status covers several causes (422 is both
// "email taken" and a failed insert; 400 covers email, name and password).
export const authErrorMessage = (
    err: unknown,
    t: TFunction<'auth'>
): string => {
    if (!(err instanceof AuthRequestError)) return t('errors.network');
    if (err.status === 401) return t('errors.invalidCredentials');
    if (err.status === 429) {
        return err.retryAfter === undefined
            ? t('errors.rateLimitedLater')
            : t('errors.rateLimited', { seconds: err.retryAfter });
    }
    const byCode = lookup(BY_CODE, err.code);
    if (byCode) return t(byCode);
    if (err.status === 403) return t('errors.forbidden');
    if (err.status === 400 || err.status === 413) {
        return t('errors.invalidInput');
    }
    return t('errors.network');
};
