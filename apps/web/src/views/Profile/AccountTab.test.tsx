// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createLightTheme } from 'shared/theme/themes';
import { DEFAULT_USER_DATA } from 'shared/constants';
import { HttpError } from 'state/api/awsAPI';
import AccountTab from './AccountTab';

// #45: Submit under Change Username called an empty stub, so nothing was sent.

const mocks = vi.hoisted(() => ({
    clearAccessToken: vi.fn(),
    updateUsername: vi.fn(),
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

vi.mock('state/api/usersAPI', () => ({
    useUpdateUsername: () => ({
        mutateAsync: mocks.updateUsername,
        isPending: false,
    }),
    useDownloadUserData: () => ({ mutateAsync: vi.fn(), isPending: false }),
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

const renderTab = () =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <AccountTab
                userData={{ ...DEFAULT_USER_DATA, username: 'turtles' }}
            />
        </ThemeProvider>
    );

const input = () => screen.getByLabelText('Username') as HTMLInputElement;
const submit = () =>
    screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
const enter = (value: string) =>
    fireEvent.change(input(), { target: { value } });

const RULE = '3-32 letters, numbers or underscores, not starting with a number';

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
                'That username is taken'
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
                'Failed to change username'
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
