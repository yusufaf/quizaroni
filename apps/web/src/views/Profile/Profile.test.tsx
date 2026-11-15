// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DEFAULT_USER_RESPONSE } from 'shared/constants';
import Profile from './Profile';

const ai = vi.hoisted(() => ({
    enabled: vi.fn<() => boolean | undefined>(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('state/api/aiAPI', () => ({ useAIChatEnabled: ai.enabled }));
vi.mock('state/api/usersAPI', () => ({
    useGetUser: () => ({ data: DEFAULT_USER_RESPONSE }),
}));
vi.mock('./ProfileCard', () => ({ default: () => null }));
vi.mock('./CustomizationTab', () => ({
    default: () => <div>customization panel</div>,
}));
vi.mock('./AchievementsTab', () => ({ default: () => null }));
vi.mock('./AccessibilityTab', () => ({ default: () => null }));
vi.mock('./AccountTab', () => ({ default: () => null }));
vi.mock('./JsonSettingsTab', () => ({ default: () => null }));
vi.mock('./AISettingsTab', () => ({ default: () => <div>ai panel</div> }));

const Location = () => <div data-testid="search">{useLocation().search}</div>;

const tree = () => (
    <MemoryRouter initialEntries={['/profile?tab=AI']}>
        <Routes>
            <Route
                path="/profile"
                element={
                    <>
                        <Profile />
                        <Location />
                    </>
                }
            />
        </Routes>
    </MemoryRouter>
);

const search = () => screen.getByTestId('search').textContent;

describe('Profile AI tab', () => {
    it('is shown and selectable when AI chat is on', () => {
        ai.enabled.mockReturnValue(true);
        render(tree());
        expect(screen.getByRole('tab', { name: 'AI Settings' })).toBeTruthy();
        expect(screen.getByText('ai panel')).toBeTruthy();
        expect(search()).toBe('?tab=AI');
    });

    it('is hidden when AI chat is off, and ?tab=AI falls back', async () => {
        ai.enabled.mockReturnValue(false);
        render(tree());
        expect(screen.queryByRole('tab', { name: 'AI Settings' })).toBeNull();
        expect(screen.queryByText('ai panel')).toBeNull();
        expect(screen.getByText('customization panel')).toBeTruthy();
        await waitFor(() => expect(search()).toBe('?tab=Customization'));
    });

    it('keeps ?tab=AI while the status loads, then opens it', async () => {
        ai.enabled.mockReturnValue(undefined);
        const { rerender } = render(tree());
        expect(screen.queryByRole('tab', { name: 'AI Settings' })).toBeNull();
        expect(search()).toBe('?tab=AI');

        ai.enabled.mockReturnValue(true);
        rerender(tree());
        await waitFor(() =>
            expect(screen.getByText('ai panel')).toBeTruthy()
        );
        expect(search()).toBe('?tab=AI');
    });
});
