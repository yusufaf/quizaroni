// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ShortcutProvider, useShortcutRegistry } from './ShortcutRegistry';
import type { Shortcut } from './shortcutTypes';

const mk = (id: string): Shortcut => ({
    id,
    keys: ['x'],
    scope: 'global',
    descriptionKey: 'shortcuts.actions.test',
    handler: () => {},
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ShortcutProvider>{children}</ShortcutProvider>
);

describe('ShortcutRegistry', () => {
    it('register then getActive returns it; unregister removes it', () => {
        const { result } = renderHook(() => useShortcutRegistry(), { wrapper });
        act(() => result.current.register(mk('a')));
        expect(result.current.getActive().map((s) => s.id)).toContain('a');
        act(() => result.current.unregister('a'));
        expect(result.current.getActive().map((s) => s.id)).not.toContain('a');
    });

    it('re-registering same id replaces, no duplicates', () => {
        const { result } = renderHook(() => useShortcutRegistry(), { wrapper });
        act(() => result.current.register(mk('b')));
        act(() => result.current.register(mk('b')));
        expect(
            result.current.getActive().filter((s) => s.id === 'b')
        ).toHaveLength(1);
    });
});
