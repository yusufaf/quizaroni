import { describe, expect, it } from 'vite-plus/test';
import { AuthRequestError } from 'shared/auth/session/sessionClient';
import { authErrorMessage, oauthErrorMessage } from './authErrorMessage';

const t = (key: string) => key;

describe('oauthErrorMessage', () => {
    it.each([
        ['account_not_linked', 'errors.accountNotLinked'],
        ['signup_disabled', 'errors.noLinkedAccount'],
        ['SOCIAL_EMAIL_UNVERIFIED', 'errors.socialEmailUnverified'],
        ['access_denied', 'errors.socialCancelled'],
        ['REGISTRATION_CLOSED', 'errors.registrationClosed'],
        ['INVITE_INVALID', 'errors.inviteInvalid'],
    ])('maps %s', (code, key) => {
        expect(oauthErrorMessage(code, t)).toBe(key);
    });

    it.each([
        'state_mismatch',
        'invalid_code',
        'something_new',
        '',
        'constructor',
        '__proto__',
        'toString',
        'hasOwnProperty',
    ])('falls back to the generic message for %j', (code) => {
        expect(oauthErrorMessage(code, t)).toBe('errors.socialFailed');
    });
});

describe('authErrorMessage', () => {
    it('does not read inherited keys as error codes', () => {
        for (const code of ['constructor', '__proto__', 'toString']) {
            const err = new AuthRequestError(403, 'x', code);
            expect(authErrorMessage(err, t)).toBe('errors.forbidden');
        }
    });

    it('still maps a known code', () => {
        const err = new AuthRequestError(403, 'x', 'REGISTRATION_CLOSED');
        expect(authErrorMessage(err, t)).toBe('errors.registrationClosed');
    });
});
