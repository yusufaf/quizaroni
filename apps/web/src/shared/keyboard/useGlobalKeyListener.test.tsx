// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ShortcutProvider, useShortcutRegistry } from './ShortcutRegistry';
import { useGlobalKeyListener } from './useGlobalKeyListener';
import type { Shortcut } from './shortcutTypes';
import { useEffect } from 'react';

function Harness({ shortcuts }: { shortcuts: Shortcut[] }) {
    useGlobalKeyListener();
    const reg = useShortcutRegistry();
    useEffect(() => {
        shortcuts.forEach((s) => reg.register(s));
        return () => shortcuts.forEach((s) => reg.unregister(s.id));
    }, []);
    return <input data-testid="field" />;
}

const setup = (shortcuts: Shortcut[]) =>
    render(
        <ShortcutProvider>
            <Harness shortcuts={shortcuts} />
        </ShortcutProvider>
    );

describe('useGlobalKeyListener', () => {
    it('fires a matching single-key binding', () => {
        const fn = vi.fn();
        setup([
            {
                id: 'c',
                keys: ['c'],
                scope: 'nav',
                descriptionKey: 'k',
                handler: fn,
            },
        ]);
        fireEvent.keyDown(document.body, { key: 'c' });
        expect(fn).toHaveBeenCalledOnce();
    });

    it('suppresses non-Escape shortcuts while typing', () => {
        const fn = vi.fn();
        const { getByTestId } = setup([
            {
                id: 'c',
                keys: ['c'],
                scope: 'nav',
                descriptionKey: 'k',
                handler: fn,
            },
        ]);
        fireEvent.keyDown(getByTestId('field'), { key: 'c' });
        expect(fn).not.toHaveBeenCalled();
    });

    it('allows Escape while typing', () => {
        const fn = vi.fn();
        const { getByTestId } = setup([
            {
                id: 'esc',
                keys: ['Escape'],
                scope: 'global',
                descriptionKey: 'k',
                handler: fn,
            },
        ]);
        fireEvent.keyDown(getByTestId('field'), { key: 'Escape' });
        expect(fn).toHaveBeenCalledOnce();
    });

    it('ignores shortcuts when a ctrl modifier is held', () => {
        const fn = vi.fn();
        setup([
            {
                id: 'c',
                keys: ['c'],
                scope: 'nav',
                descriptionKey: 'k',
                handler: fn,
            },
        ]);
        fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true });
        expect(fn).not.toHaveBeenCalled();
    });

    it('skips a binding whose when() is false', () => {
        const fn = vi.fn();
        setup([
            {
                id: 'g',
                keys: ['1'],
                scope: 'study:flashcards',
                descriptionKey: 'k',
                handler: fn,
                when: () => false,
            },
        ]);
        fireEvent.keyDown(document.body, { key: '1' });
        expect(fn).not.toHaveBeenCalled();
    });

    it('resolves a two-key sequence g h', () => {
        const fn = vi.fn();
        setup([
            {
                id: 'gh',
                keys: ['g h'],
                scope: 'nav',
                descriptionKey: 'k',
                handler: fn,
            },
        ]);
        fireEvent.keyDown(document.body, { key: 'g' });
        fireEvent.keyDown(document.body, { key: 'h' });
        expect(fn).toHaveBeenCalledOnce();
    });
});
