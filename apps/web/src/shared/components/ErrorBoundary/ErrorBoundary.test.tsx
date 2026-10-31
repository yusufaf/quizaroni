// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePwaStore } from 'state/stores/pwa';
import ErrorBoundary from './ErrorBoundary';
import CrashFallback from './CrashFallback';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const skipWaiting = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('state/local/pwa/registerSW', () => ({ skipWaiting }));

const Boom = ({ crash }: { crash: boolean }) => {
    if (crash) throw new Error('boom');
    return <p>page content</p>;
};

const renderBoundary = (crash: boolean, resetKey = '/profile') =>
    render(
        <ErrorBoundary fallback={<CrashFallback />} resetKey={resetKey}>
            <Boom crash={crash} />
        </ErrorBoundary>
    );

describe('ErrorBoundary', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        usePwaStore.setState({ needRefresh: false });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        skipWaiting.mockClear();
    });

    it('renders its children when nothing throws', () => {
        renderBoundary(false);

        expect(screen.getByText('page content')).toBeTruthy();
    });

    it('shows the fallback instead of unmounting when a child throws', () => {
        renderBoundary(true);

        expect(screen.getByText('errorBoundary.title')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'pwa.reload' })).toBeTruthy();
    });

    it('offers the waiting version when one is ready', async () => {
        renderBoundary(true);

        act(() => usePwaStore.setState({ needRefresh: true }));
        fireEvent.click(
            screen.getByRole('button', {
                name: 'errorBoundary.updateAndReload',
            })
        );

        expect(screen.getByText('errorBoundary.updateBody')).toBeTruthy();
        expect(skipWaiting).toHaveBeenCalledOnce();
    });

    it('clears the error when the reset key changes', () => {
        const { rerender } = renderBoundary(true);

        rerender(
            <ErrorBoundary fallback={<CrashFallback />} resetKey="/">
                <Boom crash={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('page content')).toBeTruthy();
    });
});
