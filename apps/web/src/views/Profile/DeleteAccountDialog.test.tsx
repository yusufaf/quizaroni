// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createLightTheme } from 'shared/theme/themes';
import { AuthRequestError } from 'shared/auth/session/sessionClient';
import type { AccountDeletionInfo } from 'shared/types';
import DeleteAccountDialog from './DeleteAccountDialog';

const mocks = vi.hoisted(() => ({
    deleteAccount: vi.fn(),
    startSocialSignIn: vi.fn(),
    refetch: vi.fn(),
    handleClose: vi.fn(),
    assign: vi.fn(),
    info: {
        data: undefined as unknown,
        isFetching: false,
        isError: false,
    },
    providers: undefined as unknown,
    sessionUser: { id: 'u1', email: 'cached@example.com' } as unknown,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: Record<string, unknown>) =>
            o ? `${k}:${JSON.stringify(o)}` : k,
    }),
}));

vi.mock('shared/auth/session/SessionProvider', () => ({
    useSession: () => ({
        user: mocks.sessionUser,
        deleteAccount: mocks.deleteAccount,
    }),
}));

vi.mock('state/api/usersAPI', () => ({
    useAccountDeletionInfo: () => ({
        ...mocks.info,
        refetch: mocks.refetch,
    }),
}));

vi.mock('state/api/authProvidersAPI', () => ({
    useAuthProviders: () => mocks.providers,
}));

vi.mock('shared/auth/session/sessionClient', async (importOriginal) => ({
    ...(await importOriginal<
        typeof import('shared/auth/session/sessionClient')
    >()),
    startSocialSignIn: mocks.startSocialSignIn,
}));

const RETURN = '/profile?tab=Account&deleteAccount=1';

const PASSWORD_INFO: AccountDeletionInfo = {
    email: 'ada@example.com',
    reauth: 'password',
    recentSignInSecondsLeft: 0,
    providers: [],
    lastAdmin: false,
    studysets: 3,
    publishedStudysets: 1,
};

const RECENT_INFO: AccountDeletionInfo = {
    ...PASSWORD_INFO,
    reauth: 'recent-sign-in',
    recentSignInSecondsLeft: 300,
    providers: ['google'],
};

const STALE_INFO: AccountDeletionInfo = {
    ...RECENT_INFO,
    recentSignInSecondsLeft: 0,
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.info.data = PASSWORD_INFO;
    mocks.info.isFetching = false;
    mocks.info.isError = false;
    mocks.providers = {
        providers: ['google', 'github'],
        registrationOpen: true,
    };
    mocks.sessionUser = { id: 'u1', email: 'cached@example.com' };
    mocks.deleteAccount.mockResolvedValue(undefined);
    mocks.startSocialSignIn.mockResolvedValue(
        'https://accounts.google.com/o/oauth2/v2/auth?state=abc'
    );
    vi.stubGlobal('location', { ...window.location, assign: mocks.assign });
});

const renderDialog = (props: { reauthFailed?: boolean } = {}) =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <DeleteAccountDialog
                open
                handleClose={mocks.handleClose}
                {...props}
            />
        </ThemeProvider>
    );

const confirm = () =>
    screen.getByRole('button', {
        name: /deleteAccountDialog\.(confirmButton|deleting)/,
    }) as HTMLButtonElement;
const password = () =>
    screen.getByLabelText('deleteAccountDialog.passwordLabel');
const acknowledge = () =>
    screen.getByLabelText('deleteAccountDialog.acknowledge');
const typePassword = (value: string) =>
    fireEvent.change(password(), { target: { value } });

describe('DeleteAccountDialog loading', () => {
    it('shows a spinner while the details load, with no confirm button', () => {
        mocks.info.data = undefined;
        mocks.info.isFetching = true;
        renderDialog();
        expect(screen.getByRole('progressbar')).toBeTruthy();
        expect(
            screen.queryByRole('button', {
                name: 'deleteAccountDialog.confirmButton',
            })
        ).toBeNull();
    });

    it('shows an error and no confirm button when the details fail to load', () => {
        mocks.info.data = undefined;
        mocks.info.isError = true;
        renderDialog();
        expect(screen.getByText('deleteAccountDialog.loadFailed')).toBeTruthy();
        expect(
            screen.queryByRole('button', {
                name: 'deleteAccountDialog.confirmButton',
            })
        ).toBeNull();
    });
});

describe('DeleteAccountDialog for a user with a password', () => {
    it('names the account from the server, not the cached session', () => {
        renderDialog();
        expect(
            screen.getByText(
                'deleteAccountDialog.accountLine:{"email":"ada@example.com"}'
            )
        ).toBeTruthy();
        expect(screen.queryByText(/cached@example\.com/)).toBeNull();
    });

    it('lists what is deleted and points to Download Data', () => {
        renderDialog();
        expect(
            screen.getByText('deleteAccountDialog.studysetsDeleted:{"count":3}')
        ).toBeTruthy();
        expect(
            screen.getByText('deleteAccountDialog.publishedDeleted:{"count":1}')
        ).toBeTruthy();
        expect(screen.getByText('deleteAccountDialog.copiesStay')).toBeTruthy();
        expect(
            screen.getByText('deleteAccountDialog.downloadHint')
        ).toBeTruthy();
    });

    it('leaves out the published line when nothing is published', () => {
        mocks.info.data = { ...PASSWORD_INFO, publishedStudysets: 0 };
        renderDialog();
        expect(screen.queryByText(/publishedDeleted/)).toBeNull();
    });

    it('keeps confirm disabled until the password is typed and the box ticked', () => {
        renderDialog();
        expect(confirm().disabled).toBe(true);
        typePassword('correct-horse-1');
        expect(confirm().disabled).toBe(true);
        fireEvent.click(acknowledge());
        expect(confirm().disabled).toBe(false);
        typePassword('');
        expect(confirm().disabled).toBe(true);
    });

    it('sends the password', async () => {
        renderDialog();
        typePassword('correct-horse-1');
        fireEvent.click(acknowledge());
        fireEvent.click(confirm());
        await waitFor(() =>
            expect(mocks.deleteAccount).toHaveBeenCalledWith({
                password: 'correct-horse-1',
            })
        );
    });

    it('disables confirm and says it is deleting while the request runs', async () => {
        mocks.deleteAccount.mockReturnValue(new Promise(() => {}));
        renderDialog();
        typePassword('correct-horse-1');
        fireEvent.click(acknowledge());
        fireEvent.click(confirm());
        await waitFor(() =>
            expect(
                screen.getByRole('button', {
                    name: 'deleteAccountDialog.deleting',
                })
            ).toBeTruthy()
        );
        expect(confirm().disabled).toBe(true);
        fireEvent.click(confirm());
        expect(mocks.deleteAccount).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['INVALID_PASSWORD', 400, 'deleteAccountDialog.errors.wrongPassword'],
        ['PASSWORD_REQUIRED', 400, 'deleteAccountDialog.errors.wrongPassword'],
        ['LAST_ADMIN', 403, 'deleteAccountDialog.errors.lastAdmin'],
        [undefined, 429, 'deleteAccountDialog.errors.rateLimited'],
        [undefined, 500, 'deleteAccountDialog.errors.failed'],
    ])(
        'shows the message for %s (%s) and stays open',
        async (code, status, key) => {
            mocks.deleteAccount.mockRejectedValue(
                new AuthRequestError(status, 'no', code)
            );
            renderDialog();
            typePassword('correct-horse-1');
            fireEvent.click(acknowledge());
            fireEvent.click(confirm());
            expect(await screen.findByText(key)).toBeTruthy();
            expect(mocks.handleClose).not.toHaveBeenCalled();
            expect(confirm().disabled).toBe(false);
        }
    );

    it('shows the generic message for a non-auth error', async () => {
        mocks.deleteAccount.mockRejectedValue(new TypeError('Failed to fetch'));
        renderDialog();
        typePassword('correct-horse-1');
        fireEvent.click(acknowledge());
        fireEvent.click(confirm());
        expect(
            await screen.findByText('deleteAccountDialog.errors.failed')
        ).toBeTruthy();
    });

    it('reloads the details when the sign-in turns out too old', async () => {
        mocks.deleteAccount.mockRejectedValue(
            new AuthRequestError(400, 'old', 'SESSION_EXPIRED')
        );
        renderDialog();
        typePassword('correct-horse-1');
        fireEvent.click(acknowledge());
        fireEvent.click(confirm());
        expect(
            await screen.findByText('deleteAccountDialog.errors.sessionExpired')
        ).toBeTruthy();
        expect(mocks.refetch).toHaveBeenCalled();
    });
});

describe('DeleteAccountDialog for a user without a password', () => {
    it('needs only the box ticked while the sign-in is recent', async () => {
        mocks.info.data = RECENT_INFO;
        renderDialog();
        expect(
            screen.getByText('deleteAccountDialog.recentSignIn')
        ).toBeTruthy();
        expect(
            screen.queryByLabelText('deleteAccountDialog.passwordLabel')
        ).toBeNull();
        expect(
            screen.getByText(
                'deleteAccountDialog.accountLine:{"email":"ada@example.com"}'
            )
        ).toBeTruthy();
        expect(confirm().disabled).toBe(true);
        fireEvent.click(acknowledge());
        expect(confirm().disabled).toBe(false);
        fireEvent.click(confirm());
        await waitFor(() =>
            expect(mocks.deleteAccount).toHaveBeenCalledWith({})
        );
    });

    it('asks to sign in again with the linked provider once the sign-in is old', () => {
        mocks.info.data = STALE_INFO;
        renderDialog();
        expect(
            screen.getByText('deleteAccountDialog.reauthIntro')
        ).toBeTruthy();
        expect(
            screen.getByText(
                'deleteAccountDialog.accountLine:{"email":"ada@example.com"}'
            )
        ).toBeTruthy();
        expect(
            screen.getByRole('button', {
                name: 'deleteAccountDialog.reauthButton:{"provider":"Google"}',
            })
        ).toBeTruthy();
        expect(
            screen.queryByRole('button', {
                name: 'deleteAccountDialog.confirmButton',
            })
        ).toBeNull();
    });

    it('only offers providers that are linked and still configured', () => {
        mocks.info.data = { ...STALE_INFO, providers: ['google', 'github'] };
        mocks.providers = { providers: ['github'], registrationOpen: true };
        renderDialog();
        expect(
            screen.queryByRole('button', {
                name: /reauthButton:\{"provider":"Google"\}/,
            })
        ).toBeNull();
        expect(
            screen.getByRole('button', {
                name: 'deleteAccountDialog.reauthButton:{"provider":"GitHub"}',
            })
        ).toBeTruthy();
    });

    it('starts the provider sign-in and returns to this dialog', async () => {
        mocks.info.data = STALE_INFO;
        renderDialog();
        fireEvent.click(
            screen.getByRole('button', {
                name: 'deleteAccountDialog.reauthButton:{"provider":"Google"}',
            })
        );
        await waitFor(() =>
            expect(mocks.startSocialSignIn).toHaveBeenCalledWith({
                provider: 'google',
                callbackURL: RETURN,
                errorCallbackURL: RETURN,
            })
        );
        await waitFor(() =>
            expect(mocks.assign).toHaveBeenCalledWith(
                'https://accounts.google.com/o/oauth2/v2/auth?state=abc'
            )
        );
    });

    it('points to Forgot password when no provider can be used', () => {
        mocks.info.data = STALE_INFO;
        mocks.providers = { providers: [], registrationOpen: true };
        renderDialog();
        expect(
            screen.getByText('deleteAccountDialog.reauthUnavailable')
        ).toBeTruthy();
        expect(
            screen.queryByRole('button', { name: /reauthButton/ })
        ).toBeNull();
        expect(
            screen.queryByRole('button', {
                name: 'deleteAccountDialog.confirmButton',
            })
        ).toBeNull();
    });

    it('shows the failure when the provider sign-in cannot start', async () => {
        mocks.info.data = STALE_INFO;
        mocks.startSocialSignIn.mockRejectedValue(new Error('nope'));
        renderDialog();
        fireEvent.click(
            screen.getByRole('button', {
                name: 'deleteAccountDialog.reauthButton:{"provider":"Google"}',
            })
        );
        expect(
            await screen.findByText('deleteAccountDialog.errors.reauthFailed')
        ).toBeTruthy();
        expect(mocks.assign).not.toHaveBeenCalled();
    });
});

describe('DeleteAccountDialog reauthFailed', () => {
    it('shows the re-auth failure above the view', () => {
        mocks.info.data = STALE_INFO;
        renderDialog({ reauthFailed: true });
        expect(
            screen.getByText('deleteAccountDialog.errors.reauthFailed')
        ).toBeTruthy();
        expect(
            screen.getByText('deleteAccountDialog.reauthIntro')
        ).toBeTruthy();
    });

    it('is not shown otherwise', () => {
        mocks.info.data = STALE_INFO;
        renderDialog();
        expect(
            screen.queryByText('deleteAccountDialog.errors.reauthFailed')
        ).toBeNull();
    });
});

describe('DeleteAccountDialog for the only admin', () => {
    it('explains and offers no way to confirm', () => {
        mocks.info.data = { ...PASSWORD_INFO, lastAdmin: true };
        renderDialog();
        expect(screen.getByText('deleteAccountDialog.lastAdmin')).toBeTruthy();
        expect(
            screen.queryByRole('button', {
                name: 'deleteAccountDialog.confirmButton',
            })
        ).toBeNull();
        expect(
            screen.queryByLabelText('deleteAccountDialog.passwordLabel')
        ).toBeNull();
    });
});
