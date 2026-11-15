// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import Admin from './Admin';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: Record<string, unknown>) =>
            o ? `${k}:${JSON.stringify(o)}` : k,
        i18n: { language: 'en' },
    }),
}));

vi.mock('shared/auth/backend', () => ({ isSelfHost: () => true }));

const session = { user: { id: 'a1', email: 'admin@example.com', name: 'Admin', role: 'admin' } };
vi.mock('shared/auth/session/SessionProvider', () => ({
    useSession: () => session,
}));

vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        POSITION: { BOTTOM_LEFT: 'bottom-left' },
    },
}));

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

const NOW = '2026-11-14T10:00:00.000Z';
const LATER = '2026-11-21T10:00:00.000Z';
const INVITE = {
    id: 'inv-1',
    email: null,
    maxUses: 5,
    uses: 2,
    status: 'active',
    createdAt: NOW,
    expiresAt: LATER,
    revokedAt: null,
};
const MESSAGE = {
    id: 'm1',
    kind: 'password_reset',
    to: 'bea@example.com',
    subject: 'Reset your Quizaroni password',
    link: 'http://localhost/reset-password?token=abc',
    delivery: 'failed',
    createdAt: NOW,
    expiresAt: LATER,
};
const LINK = 'http://localhost/signUp?invite=tok';

const fetchMock = vi.fn<typeof fetch>();

const routeFetch = (o: { invites?: unknown[]; messages?: unknown[] } = {}) =>
    fetchMock.mockImplementation(async (input, init) => {
        const url = String(input);
        if (url === '/api/admin/invites' && init?.method === 'POST') {
            return json(
                {
                    invite: { ...INVITE, id: 'inv-2', maxUses: 1, uses: 0 },
                    link: LINK,
                },
                201
            );
        }
        if (url === '/api/admin/invites') {
            return json({ invites: o.invites ?? [INVITE] });
        }
        if (url.endsWith('/revoke')) {
            return json({ invite: { ...INVITE, status: 'revoked', revokedAt: NOW } });
        }
        if (url === '/api/admin/outbox') {
            return json({ smtp: false, messages: o.messages ?? [MESSAGE] });
        }
        return json({ message: 'Not found' }, 404);
    });

const renderAdmin = () =>
    render(
        <QueryClientProvider
            client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
            <Admin />
        </QueryClientProvider>
    );

const postBodies = (path: string) =>
    fetchMock.mock.calls
        .filter(([url, init]) => String(url) === path && init?.method === 'POST')
        .map(([, init]) => JSON.parse(String(init?.body)));

beforeEach(() => {
    session.user.role = 'admin';
    fetchMock.mockReset();
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('Admin', () => {
    it('tells a non-admin the page is admin-only and loads nothing', () => {
        session.user.role = 'user';
        routeFetch();
        renderAdmin();
        expect(screen.getByText('notAdmin')).toBeTruthy();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('lists invites and outbox messages', async () => {
        routeFetch();
        renderAdmin();
        const table = await screen.findByRole('table', { name: 'invitesTitle' });
        expect(within(table).getByText('anyone')).toBeTruthy();
        expect(within(table).getByText('2/5')).toBeTruthy();
        expect(within(table).getByText('statuses.active')).toBeTruthy();
        expect(await screen.findByText('kinds.password_reset · bea@example.com')).toBeTruthy();
        expect(screen.getByText('deliveryFailed')).toBeTruthy();
        expect(screen.getByText('smtpOff')).toBeTruthy();
        expect(screen.getByDisplayValue(MESSAGE.link)).toBeTruthy();
    });

    it('creates an invite with the defaults and shows its link', async () => {
        routeFetch();
        renderAdmin();
        fireEvent.click(screen.getByRole('button', { name: 'createInvite' }));
        expect(await screen.findByDisplayValue(LINK)).toBeTruthy();
        expect(screen.getByText('linkShownOnce')).toBeTruthy();
        expect(postBodies('/api/admin/invites')).toEqual([{ days: 7, maxUses: 1 }]);
    });

    it('sends an email invite without max uses', async () => {
        routeFetch();
        renderAdmin();
        fireEvent.change(screen.getByLabelText(/inviteEmail/), {
            target: { value: ' bea@example.com ' },
        });
        expect((screen.getByLabelText(/maxUses/) as HTMLInputElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'createInvite' }));
        await screen.findByDisplayValue(LINK);
        expect(postBodies('/api/admin/invites')).toEqual([
            { email: 'bea@example.com', days: 7 },
        ]);
    });

    it('copies a link to the clipboard', async () => {
        const writeText = vi.fn(async () => {});
        vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
        routeFetch({ invites: [] });
        renderAdmin();
        const button = await screen.findByRole('button', {
            name: 'copyLinkFor:{"label":"link"}',
        });
        fireEvent.click(button);
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(MESSAGE.link));
        expect(toast.success).toHaveBeenCalledWith('copied', expect.anything());
    });

    it('selects the link for copying by hand when the clipboard is missing', async () => {
        vi.stubGlobal('navigator', { ...navigator, clipboard: undefined });
        routeFetch({ invites: [] });
        renderAdmin();
        const button = await screen.findByRole('button', {
            name: 'copyLinkFor:{"label":"link"}',
        });
        fireEvent.click(button);
        await waitFor(() =>
            expect(toast.error).toHaveBeenCalledWith('copyManually', expect.anything())
        );
        const field = screen.getByDisplayValue(MESSAGE.link) as HTMLInputElement;
        expect(document.activeElement).toBe(field);
        expect(field.selectionStart).toBe(0);
        expect(field.selectionEnd).toBe(MESSAGE.link.length);
    });

    it('revokes an active invite', async () => {
        routeFetch();
        renderAdmin();
        fireEvent.click(
            await screen.findByRole('button', {
                name: 'revokeFor:{"target":"anyone"}',
            })
        );
        await waitFor(() =>
            expect(postBodies('/api/admin/invites/inv-1/revoke')).toEqual([{}])
        );
    });

    it('says when there are no invites or messages', async () => {
        routeFetch({ invites: [], messages: [] });
        renderAdmin();
        expect(await screen.findByText('noInvites')).toBeTruthy();
        expect(await screen.findByText('outboxEmpty')).toBeTruthy();
    });
});
