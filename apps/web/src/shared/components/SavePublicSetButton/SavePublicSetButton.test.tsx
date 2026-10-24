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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createLightTheme } from 'shared/theme/themes';
import SavePublicSetButton from './SavePublicSetButton';

let authenticated = false;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@logto/react', () => ({
    useLogto: () => ({ isAuthenticated: authenticated }),
}));

vi.mock('react-router-dom', () => {
    const FakeLink = ({
        to,
        state,
        children,
        ...rest
    }: {
        to: string;
        state?: unknown;
        children: React.ReactNode;
    }) => (
        <a href={to} data-state={JSON.stringify(state)} {...rest}>
            {children}
        </a>
    );
    return { Link: FakeLink };
});

const toastMock = vi.hoisted(() => ({
    success: vi.fn(),
    error: vi.fn(),
    POSITION: { BOTTOM_LEFT: 'bottom-left' },
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

const UUID = '11111111-1111-4111-8111-111111111111';

const respond = (status: number, body: unknown) =>
    Promise.resolve(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    );

let fetchMock: ReturnType<typeof vi.fn>;

const renderButton = (variant: 'text' | 'icon' = 'text') =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <QueryClientProvider
                client={
                    new QueryClient({
                        defaultOptions: { mutations: { retry: false } },
                    })
                }
            >
                <SavePublicSetButton
                    studysetUUID={UUID}
                    title="Cell biology"
                    variant={variant}
                />
            </QueryClientProvider>
        </ThemeProvider>
    );

const copyCalls = () =>
    fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/studysets/copy-public-studyset')
    );

describe('SavePublicSetButton', () => {
    beforeEach(() => {
        authenticated = false;
        fetchMock = vi.fn(() =>
            respond(200, {
                message: 'Successfully saved study set',
                studyset: {},
            })
        );
        vi.stubGlobal('fetch', fetchMock);
        toastMock.success.mockClear();
        toastMock.error.mockClear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it.each(['text', 'icon'] as const)(
        'sends a logged-out visitor to login and back to the set (%s)',
        (variant) => {
            renderButton(variant);

            const link = screen.getByRole('link');
            expect(link.getAttribute('href')).toBe('/login');
            expect(JSON.parse(link.getAttribute('data-state') ?? '{}')).toEqual(
                {
                    from: `/view/${UUID}`,
                }
            );
            fireEvent.click(link);
            expect(fetchMock).not.toHaveBeenCalled();
        }
    );

    it('saves the set for a signed-in user', async () => {
        authenticated = true;
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: 'save.action' }));

        await screen.findByRole('button', { name: 'save.saved' });
        const [url, init] = copyCalls()[0] as unknown as [string, RequestInit];
        expect(url.endsWith('/studysets/copy-public-studyset')).toBe(true);
        expect(init.body).toBe(JSON.stringify({ studysetUUID: UUID }));
        expect(toastMock.success).toHaveBeenCalledWith('save.success', {
            position: 'bottom-left',
        });
    });

    it('does not save twice', async () => {
        authenticated = true;
        renderButton();

        const button = screen.getByRole('button', { name: 'save.action' });
        fireEvent.click(button);
        fireEvent.click(button);
        await screen.findByRole('button', { name: 'save.saved' });
        fireEvent.click(screen.getByRole('button', { name: 'save.saved' }));

        expect(copyCalls()).toHaveLength(1);
        expect(
            screen
                .getByRole('button', { name: 'save.saved' })
                .getAttribute('aria-disabled')
        ).toBe('true');
        expect(
            screen
                .getByRole('button', { name: 'save.saved' })
                .hasAttribute('disabled')
        ).toBe(false);
    });

    it('says when the set is no longer public', async () => {
        authenticated = true;
        fetchMock.mockImplementation(() =>
            respond(404, {
                message: 'This study set is private or does not exist.',
            })
        );
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: 'save.action' }));

        await waitFor(() =>
            expect(toastMock.error).toHaveBeenCalledWith('save.unavailable', {
                position: 'bottom-left',
            })
        );
        expect(
            screen.getByRole('button', { name: 'save.action' })
        ).toBeTruthy();
    });

    it('reports other failures generically', async () => {
        authenticated = true;
        fetchMock.mockImplementation(() => respond(500, { message: 'Error' }));
        renderButton();

        fireEvent.click(screen.getByRole('button', { name: 'save.action' }));

        await waitFor(() =>
            expect(toastMock.error).toHaveBeenCalledWith('save.error', {
                position: 'bottom-left',
            })
        );
    });

    // Per-call mutate() callbacks are skipped once the component unmounts.
    it.each([
        [200, 'success', 'save.success'],
        [500, 'error', 'save.error'],
    ] as const)(
        'still reports a %s save after the button unmounts',
        async (status, kind, message) => {
            authenticated = true;
            let reply!: () => void;
            fetchMock.mockImplementation(
                () =>
                    new Promise<Response>((resolve) => {
                        reply = () =>
                            resolve(
                                new Response(JSON.stringify({ message: 'x' }), {
                                    status,
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                })
                            );
                    })
            );
            const { unmount } = renderButton();

            fireEvent.click(
                screen.getByRole('button', { name: 'save.action' })
            );
            await waitFor(() => expect(copyCalls()).toHaveLength(1));
            unmount();
            reply();

            await waitFor(() =>
                expect(toastMock[kind]).toHaveBeenCalledWith(message, {
                    position: 'bottom-left',
                })
            );
        }
    );

    it('names the card action after the set', async () => {
        authenticated = true;
        renderButton('icon');

        fireEvent.click(screen.getByRole('button', { name: 'save.cardLabel' }));

        await screen.findByRole('button', { name: 'save.savedCardLabel' });
    });
});
