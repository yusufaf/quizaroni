// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import type { Studyset } from 'shared/types';
import AIChatPanel from './AIChatPanel';

const ai = vi.hoisted(() => ({
    enabled: vi.fn<() => boolean | undefined>(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('state/api/aiAPI', () => ({ useAIChatEnabled: ai.enabled }));
vi.mock('./AIChatDrawer', () => ({ default: () => <div>drawer</div> }));

const renderPanel = () =>
    render(
        <AIChatPanel
            selectedStudyset={{} as Studyset}
            notesDrawerPosition="right"
        />
    );

describe('AIChatPanel', () => {
    it('shows the open button when AI chat is on', () => {
        ai.enabled.mockReturnValue(true);
        renderPanel();
        expect(
            screen.getByRole('button', { name: 'aiChat.openPanel' })
        ).toBeTruthy();
    });

    it.each([false, undefined])(
        'renders nothing when the status is %s',
        (value) => {
            ai.enabled.mockReturnValue(value);
            renderPanel();
            expect(
                screen.queryByRole('button', { name: 'aiChat.openPanel' })
            ).toBeNull();
            expect(screen.queryByText('drawer')).toBeNull();
        }
    );
});
