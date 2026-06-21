// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShortcutProvider, useShortcutRegistry } from './ShortcutRegistry';
import { useGlobalKeyListener } from './useGlobalKeyListener';
import { ShortcutHelpModal } from './ShortcutHelpModal';
import { useEffect } from 'react';
import type { Shortcut } from './shortcutTypes';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

function Extra({ shortcuts }: { shortcuts: Shortcut[] }) {
    const reg = useShortcutRegistry();
    useEffect(() => {
        shortcuts.forEach((s) => reg.register(s));
    }, []);
    return null;
}

const navBinding: Shortcut = {
    id: 'nav.create',
    keys: ['c'],
    scope: 'nav',
    descriptionKey: 'shortcuts.actions.create',
    handler: () => {},
};

function Listener() {
    useGlobalKeyListener();
    return null;
}

const setup = () =>
    render(
        <ShortcutProvider>
            <Listener />
            <Extra shortcuts={[navBinding]} />
            <ShortcutHelpModal />
        </ShortcutProvider>
    );

describe('ShortcutHelpModal', () => {
    it('opens on ? and closes on Escape', async () => {
        setup();
        expect(screen.queryByText('shortcuts.title')).toBeNull();
        fireEvent.keyDown(document.body, { key: '?' });
        expect(screen.getByText('shortcuts.title')).toBeTruthy();
        fireEvent.keyDown(document.body, { key: 'Escape' });
        await waitFor(() =>
            expect(screen.queryByText('shortcuts.title')).toBeNull()
        );
    });

    it('lists active scope actions', () => {
        setup();
        fireEvent.keyDown(document.body, { key: '?' });
        expect(screen.getByText('shortcuts.actions.create')).toBeTruthy();
    });
});
