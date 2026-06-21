import { useEffect, useRef } from 'react';
import { useShortcutRegistry } from './ShortcutRegistry';
import type { Shortcut } from './shortcutTypes';

/**
 * Register a view's shortcuts while it is mounted. The bindings array may be
 * rebuilt every render (handlers closing over fresh state) — we register stable
 * proxies keyed by id that always delegate to the latest binding via a ref.
 * The set of ids must be stable across renders for a given mount.
 */
export function useShortcuts(bindings: Shortcut[]): void {
    const reg = useShortcutRegistry();
    const ref = useRef(bindings);
    ref.current = bindings;

    useEffect(() => {
        const ids = ref.current.map((b) => b.id);
        const find = (id: string) => ref.current.find((b) => b.id === id);
        ids.forEach((id) => {
            const original = find(id)!;
            reg.register({
                id: original.id,
                keys: original.keys,
                scope: original.scope,
                descriptionKey: original.descriptionKey,
                handler: (e) => find(id)?.handler(e),
                when: () => find(id)?.when?.() ?? true,
            });
        });
        return () => ids.forEach((id) => reg.unregister(id));
        // Register once per mount. reg functions are stable (useCallback).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
