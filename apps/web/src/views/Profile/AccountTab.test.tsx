// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createLightTheme } from 'shared/theme/themes';
import { DEFAULT_USER_DATA } from 'shared/constants';
import { HttpError } from 'state/api/awsAPI';
import AccountTab from './AccountTab';

// #45: Submit under Change Username called an empty stub, so nothing was sent.

const mocks = vi.hoisted(() => ({
    clearAccessToken: vi.fn(),
    updateUsername: vi.fn(),
    deleteAccount: vi.fn(),
    info: {
        data: {
            email: 'ada@example.com',
            reauth: 'password',
            recentSignInSecondsLeft: 0,
            providers: [],
            lastAdmin: false,
            studysets: 0,
            publishedStudysets: 0,
        },
        isFetching: false,
        isError: false,
        refetch: vi.fn(),
    },
    toast: {
        success: vi.fn(),
        warning: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('react-toastify', () => ({ toast: mocks.toast }));

vi.mock('@logto/react', () => ({
    useLogto: () => ({ clearAccessToken: mocks.clearAccessToken }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('shared/auth/session/SessionProvider', () => ({
    useSession: () => ({
        user: { id: 'u1', email: 'ada@example.com' },
        deleteAccount: mocks.deleteAccount,
    }),
}));

vi.mock('state/api/authProvidersAPI', () => ({
    useAuthProviders: () => undefined,
}));

vi.mock('state/api/usersAPI', () => ({
    useUpdateUsername: () => ({
        mutateAsync: mocks.updateUsername,
        isPending: false,
    }),
    useDownloadUserData: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useAccountDeletionInfo: () => mocks.info,
}));

const COMPLETE = {
    message: 'ok',
    studysetsUpdated: 2,
    studysetsFailed: 0,
    studysetsRenameComplete: true,
};

beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateUsername.mockResolvedValue(COMPLETE);
    mocks.clearAccessToken.mockResolvedValue(undefined);
});

const LocationProbe = () => {
    const { pathname, search } = useLocation();
    return <p data-testid="location">{`${pathname}${search}`}</p>;
};

const renderTab = (initialEntries = ['/profile?tab=Account']) =>
    render(
        <MemoryRouter initialEntries={initialEntries}>
            <ThemeProvider theme={createLightTheme()}>
                <AccountTab
                    userData={{ ...DEFAULT_USER_DATA, username: 'turtles' }}
                />
                <LocationProbe />
            </ThemeProvider>
        </MemoryRouter>
    );

const input = () =>
    screen.getByLabelText('account.usernameLabel') as HTMLInputElement;
const submit = () =>
    screen.getByRole('button', {
        name: 'common:buttons.submit',
    }) as HTMLButtonElement;
const enter = (value: string) =>
    fireEvent.change(input(), { target: { value } });

const RULE = 'account.usernameRule';

describe('AccountTab change username', () => {
    it('submits the entered username', async () => {
        renderTab();
        enter('new_name');
        fireEvent.click(submit());

        await waitFor(() =>
            expect(mocks.updateUsername).toHaveBeenCalledWith({
                username: 'new_name',
            })
        );
    });

    it('trims surrounding whitespace before submitting', async () => {
        renderTab();
        enter('  new_name  ');
        fireEvent.click(submit());

        await waitFor(() =>
            expect(mocks.updateUsername).toHaveBeenCalledWith({
                username: 'new_name',
            })
        );
    });

    it('on success clears the field, drops the cached access token and toasts', async () => {
        renderTab();
        enter('new_name');
        fireEvent.click(submit());

        await waitFor(() => expect(mocks.toast.success).toHaveBeenCalled());
        expect(mocks.clearAccessToken).toHaveBeenCalledTimes(1);
        expect(input().value).toBe('');
        expect(mocks.toast.warning).not.toHaveBeenCalled();
    });

    it('warns when the study set rename was incomplete', async () => {
        mocks.updateUsername.mockResolvedValue({
            ...COMPLETE,
            studysetsRenameComplete: false,
        });
        renderTab();
        enter('new_name');
        fireEvent.click(submit());

        await waitFor(() => expect(mocks.toast.warning).toHaveBeenCalled());
        expect(mocks.toast.success).toHaveBeenCalled();
    });

    it('says the name is taken on a 409 and keeps the field', async () => {
        mocks.updateUsername.mockRejectedValue(
            new HttpError(409, 'Username taken')
        );
        renderTab();
        enter('new_name');
        fireEvent.click(submit());

        await waitFor(() =>
            expect(mocks.toast.error).toHaveBeenCalledWith(
                'account.usernameTaken'
            )
        );
        expect(input().value).toBe('new_name');
        expect(mocks.clearAccessToken).not.toHaveBeenCalled();
    });

    it('shows the rule on a 400', async () => {
        mocks.updateUsername.mockRejectedValue(
            new HttpError(400, 'Invalid username')
        );
        renderTab();
        enter('new_name');
        fireEvent.click(submit());

        await waitFor(() =>
            expect(mocks.toast.error).toHaveBeenCalledWith(RULE)
        );
    });

    it('shows a generic error for other failures', async () => {
        mocks.updateUsername.mockRejectedValue(new Error('boom'));
        renderTab();
        enter('new_name');
        fireEvent.click(submit());

        await waitFor(() =>
            expect(mocks.toast.error).toHaveBeenCalledWith(
                'account.usernameChangeFailed'
            )
        );
        expect(input().value).toBe('new_name');
    });

    it.each(['ab', '1abc', 'has space', 'a'.repeat(33), 'dash-name'])(
        'disables Submit and shows the rule for %s',
        (value) => {
            renderTab();
            enter(value);

            expect(submit().disabled).toBe(true);
            expect(screen.getByText(RULE)).toBeTruthy();
            fireEvent.click(submit());
            expect(mocks.updateUsername).not.toHaveBeenCalled();
        }
    );

    it('disables Submit for the current username', () => {
        renderTab();
        enter('turtles');

        expect(submit().disabled).toBe(true);
        expect(screen.queryByText(RULE)).toBeNull();
    });
});

describe('AccountTab delete account', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    const DELETE_BUTTON = 'account.deleteAccount';

    it('hides the section outside a self-host build', () => {
        renderTab();
        expect(screen.queryByText(DELETE_BUTTON)).toBeNull();
    });

    describe('in a self-host build', () => {
        beforeEach(() => {
            vi.stubEnv('VITE_BACKEND', 'selfhost');
        });

        it('shows the section with the dialog closed', () => {
            renderTab();
            expect(
                screen.getByRole('button', { name: DELETE_BUTTON })
            ).toBeTruthy();
            expect(screen.queryByRole('dialog')).toBeNull();
        });

        it('opens the dialog from the button', () => {
            renderTab();
            fireEvent.click(
                screen.getByRole('button', { name: DELETE_BUTTON })
            );
            expect(screen.getByRole('dialog')).toBeTruthy();
        });

        it('opens the dialog when returning from a provider sign-in and drops the params', async () => {
            renderTab(['/profile?tab=Account&deleteAccount=1']);
            expect(screen.getByRole('dialog')).toBeTruthy();
            expect(
                screen.queryByText('deleteAccountDialog.errors.reauthFailed')
            ).toBeNull();
            await waitFor(() =>
                expect(screen.getByTestId('location').textContent).toBe(
                    '/profile?tab=Account'
                )
            );
            expect(screen.getByRole('dialog')).toBeTruthy();
        });

        it('says the re-authentication failed when the provider sent back an error', async () => {
            renderTab([
                '/profile?tab=Account&deleteAccount=1&error=access_denied&error_description=nope',
            ]);
            expect(
                screen.getByText('deleteAccountDialog.errors.reauthFailed')
            ).toBeTruthy();
            await waitFor(() =>
                expect(screen.getByTestId('location').textContent).toBe(
                    '/profile?tab=Account'
                )
            );
            expect(
                screen.getByText('deleteAccountDialog.errors.reauthFailed')
            ).toBeTruthy();
        });

        it('stays closed without the return param, even with an error', () => {
            renderTab(['/profile?tab=Account&error=x']);
            expect(screen.queryByRole('dialog')).toBeNull();
        });
    });
});
