# Keyboard Accessibility & Shortcuts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyboard shortcuts for studying (all 4 modes) and core navigation, plus a `?` help modal, driven by a single shortcut registry.

**Architecture:** A custom shortcut registry (React context) holds active bindings. One `window` keydown listener consults the registry, applies input/modifier guards, and dispatches. Views register their bindings via a `useShortcuts` hook on mount. The help modal renders from the same registry, so it is always in sync and context-aware.

**Tech Stack:** React 18, TypeScript, MUI v5, react-router-dom v6, Vitest, react-i18next.

---

## File Structure

New, all under `apps/web/src/shared/keyboard/`:

| File | Responsibility |
|------|----------------|
| `shortcutTypes.ts` | `ScopeId`, `Shortcut` types |
| `guards.ts` | `isTypingTarget`, `hasModifier` |
| `ShortcutRegistry.tsx` | Context, `ShortcutProvider`, `useShortcutRegistry` |
| `useShortcuts.ts` | Hook to register a view's bindings while mounted |
| `useGlobalKeyListener.ts` | Single window keydown listener + dispatch |
| `ShortcutHelpModal.tsx` | `?` help modal, renders from registry |
| `NavShortcuts.tsx` | Registers `nav` scope bindings; mounted off study routes |

Modified:
- `apps/web/src/App.tsx` — mount provider, listener, modal, NavShortcuts
- `apps/web/src/views/Study/FlashcardsStudy.tsx` — register flashcards bindings
- `apps/web/src/views/Study/MultipleChoiceStudy.tsx` — register mc bindings
- `apps/web/src/views/Study/TypeWriteStudy.tsx` — register typewrite bindings
- `apps/web/src/views/Study/MatchingStudy.tsx` — register matching bindings
- `apps/web/src/views/Home/HomeToolbar.tsx` — add `data-shortcut-search` to search field
- `apps/web/src/i18n/locales/en/common.json`, `.../es/common.json` — `shortcuts.*` strings

All commits run a commitlint hook: **subject ≤ ~50 chars, every body line ≤ 100 chars**. Keep messages short.

---

### Task 1: Types and guards

**Files:**
- Create: `apps/web/src/shared/keyboard/shortcutTypes.ts`
- Create: `apps/web/src/shared/keyboard/guards.ts`
- Test: `apps/web/src/shared/keyboard/guards.test.ts`

- [ ] **Step 1: Write the failing test**

`apps/web/src/shared/keyboard/guards.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isTypingTarget, hasModifier } from './guards';

const ev = (target: Partial<HTMLElement>, mods: Partial<KeyboardEvent> = {}) =>
    ({ target, ...mods }) as unknown as KeyboardEvent;

describe('isTypingTarget', () => {
    it('true for INPUT, TEXTAREA, SELECT', () => {
        expect(isTypingTarget(ev({ tagName: 'INPUT' }))).toBe(true);
        expect(isTypingTarget(ev({ tagName: 'TEXTAREA' }))).toBe(true);
        expect(isTypingTarget(ev({ tagName: 'SELECT' }))).toBe(true);
    });
    it('true for contenteditable', () => {
        expect(isTypingTarget(ev({ tagName: 'DIV', isContentEditable: true }))).toBe(true);
    });
    it('false for a plain div', () => {
        expect(isTypingTarget(ev({ tagName: 'DIV', isContentEditable: false }))).toBe(false);
    });
    it('false when no target', () => {
        expect(isTypingTarget(ev(null as unknown as HTMLElement))).toBe(false);
    });
});

describe('hasModifier', () => {
    it('true for ctrl/meta/alt, false for shift/none', () => {
        expect(hasModifier(ev({ tagName: 'DIV' }, { ctrlKey: true }))).toBe(true);
        expect(hasModifier(ev({ tagName: 'DIV' }, { metaKey: true }))).toBe(true);
        expect(hasModifier(ev({ tagName: 'DIV' }, { altKey: true }))).toBe(true);
        expect(hasModifier(ev({ tagName: 'DIV' }, { shiftKey: true }))).toBe(false);
        expect(hasModifier(ev({ tagName: 'DIV' }))).toBe(false);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/guards.test.ts`
Expected: FAIL — cannot find module `./guards`.

- [ ] **Step 3: Write the types**

`apps/web/src/shared/keyboard/shortcutTypes.ts`:
```ts
export type ScopeId =
    | 'global'
    | 'nav'
    | 'study:flashcards'
    | 'study:mc'
    | 'study:typewrite'
    | 'study:matching';

export interface Shortcut {
    /** Unique id, e.g. 'flashcards.flip'. Used as registry key. */
    id: string;
    /** Key combos that trigger this. Single keys use KeyboardEvent.key
     *  values (' ', 'Enter', 'ArrowLeft', '1', 'c', '/', '?', 'Escape').
     *  Two-key sequences use a space, e.g. 'g h'. */
    keys: string[];
    scope: ScopeId;
    /** i18n key under shortcuts.actions.* for the help modal. */
    descriptionKey: string;
    handler: (e: KeyboardEvent) => void;
    /** Optional predicate; binding only fires/lists when it returns true. */
    when?: () => boolean;
}
```

- [ ] **Step 4: Write the guards**

`apps/web/src/shared/keyboard/guards.ts`:
```ts
export function isTypingTarget(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        t.isContentEditable === true
    );
}

/** Shift is intentionally NOT a modifier here (needed for '?'). */
export function hasModifier(e: KeyboardEvent): boolean {
    return e.ctrlKey || e.metaKey || e.altKey;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/guards.test.ts`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shared/keyboard/shortcutTypes.ts apps/web/src/shared/keyboard/guards.ts apps/web/src/shared/keyboard/guards.test.ts
git commit -m "feat(a11y): shortcut types and input guards"
```

---

### Task 2: Shortcut registry + provider

**Files:**
- Create: `apps/web/src/shared/keyboard/ShortcutRegistry.tsx`
- Test: `apps/web/src/shared/keyboard/ShortcutRegistry.test.tsx`

- [ ] **Step 1: Write the failing test**

`apps/web/src/shared/keyboard/ShortcutRegistry.test.tsx`:
```tsx
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
        expect(result.current.getActive().filter((s) => s.id === 'b')).toHaveLength(1);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/ShortcutRegistry.test.tsx`
Expected: FAIL — cannot find module `./ShortcutRegistry`.

- [ ] **Step 3: Write the registry**

`apps/web/src/shared/keyboard/ShortcutRegistry.tsx`:
```tsx
import {
    createContext,
    useContext,
    useRef,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import type { Shortcut } from './shortcutTypes';

interface RegistryApi {
    register: (s: Shortcut) => void;
    unregister: (id: string) => void;
    getActive: () => Shortcut[];
    /** Bumped on every change so consumers (help modal) re-render. */
    version: number;
}

const ShortcutContext = createContext<RegistryApi | null>(null);

export function ShortcutProvider({ children }: { children: ReactNode }) {
    const mapRef = useRef<Map<string, Shortcut>>(new Map());
    const [version, setVersion] = useState(0);

    const register = useCallback((s: Shortcut) => {
        mapRef.current.set(s.id, s);
        setVersion((v) => v + 1);
    }, []);

    const unregister = useCallback((id: string) => {
        mapRef.current.delete(id);
        setVersion((v) => v + 1);
    }, []);

    const getActive = useCallback(() => Array.from(mapRef.current.values()), []);

    return (
        <ShortcutContext.Provider value={{ register, unregister, getActive, version }}>
            {children}
        </ShortcutContext.Provider>
    );
}

export function useShortcutRegistry(): RegistryApi {
    const ctx = useContext(ShortcutContext);
    if (!ctx) {
        throw new Error('useShortcutRegistry must be used within ShortcutProvider');
    }
    return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/ShortcutRegistry.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/keyboard/ShortcutRegistry.tsx apps/web/src/shared/keyboard/ShortcutRegistry.test.tsx
git commit -m "feat(a11y): shortcut registry provider"
```

---

### Task 3: useShortcuts hook

Registers bindings once on mount and unregisters on unmount. Handlers always call the latest closure via a ref, so views never need to memoize.

**Files:**
- Create: `apps/web/src/shared/keyboard/useShortcuts.ts`

- [ ] **Step 1: Write the hook**

`apps/web/src/shared/keyboard/useShortcuts.ts`:
```ts
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
                when: () => (find(id)?.when?.() ?? true),
            });
        });
        return () => ids.forEach((id) => reg.unregister(id));
        // Register once per mount. reg functions are stable (useCallback).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/shared/keyboard/useShortcuts.ts
git commit -m "feat(a11y): useShortcuts registration hook"
```

---

### Task 4: Global key listener + dispatch

**Files:**
- Create: `apps/web/src/shared/keyboard/useGlobalKeyListener.ts`
- Test: `apps/web/src/shared/keyboard/useGlobalKeyListener.test.tsx`

- [ ] **Step 1: Write the failing test**

`apps/web/src/shared/keyboard/useGlobalKeyListener.test.tsx`:
```tsx
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
        setup([{ id: 'c', keys: ['c'], scope: 'nav', descriptionKey: 'k', handler: fn }]);
        fireEvent.keyDown(document.body, { key: 'c' });
        expect(fn).toHaveBeenCalledOnce();
    });

    it('suppresses non-Escape shortcuts while typing', () => {
        const fn = vi.fn();
        const { getByTestId } = setup([
            { id: 'c', keys: ['c'], scope: 'nav', descriptionKey: 'k', handler: fn },
        ]);
        fireEvent.keyDown(getByTestId('field'), { key: 'c' });
        expect(fn).not.toHaveBeenCalled();
    });

    it('allows Escape while typing', () => {
        const fn = vi.fn();
        const { getByTestId } = setup([
            { id: 'esc', keys: ['Escape'], scope: 'global', descriptionKey: 'k', handler: fn },
        ]);
        fireEvent.keyDown(getByTestId('field'), { key: 'Escape' });
        expect(fn).toHaveBeenCalledOnce();
    });

    it('ignores shortcuts when a ctrl modifier is held', () => {
        const fn = vi.fn();
        setup([{ id: 'c', keys: ['c'], scope: 'nav', descriptionKey: 'k', handler: fn }]);
        fireEvent.keyDown(document.body, { key: 'c', ctrlKey: true });
        expect(fn).not.toHaveBeenCalled();
    });

    it('skips a binding whose when() is false', () => {
        const fn = vi.fn();
        setup([
            { id: 'g', keys: ['1'], scope: 'study:flashcards', descriptionKey: 'k', handler: fn, when: () => false },
        ]);
        fireEvent.keyDown(document.body, { key: '1' });
        expect(fn).not.toHaveBeenCalled();
    });

    it('resolves a two-key sequence g h', () => {
        const fn = vi.fn();
        setup([{ id: 'gh', keys: ['g h'], scope: 'nav', descriptionKey: 'k', handler: fn }]);
        fireEvent.keyDown(document.body, { key: 'g' });
        fireEvent.keyDown(document.body, { key: 'h' });
        expect(fn).toHaveBeenCalledOnce();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/useGlobalKeyListener.test.tsx`
Expected: FAIL — cannot find module `./useGlobalKeyListener`.

- [ ] **Step 3: Write the listener**

`apps/web/src/shared/keyboard/useGlobalKeyListener.ts`:
```ts
import { useEffect, useRef } from 'react';
import { useShortcutRegistry } from './ShortcutRegistry';
import { isTypingTarget, hasModifier } from './guards';

const SEQUENCE_TIMEOUT_MS = 800;

export function useGlobalKeyListener(): void {
    const reg = useShortcutRegistry();
    const pendingRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const clearPending = () => {
            pendingRef.current = null;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const onKey = (e: KeyboardEvent) => {
            if (hasModifier(e)) return;
            const typing = isTypingTarget(e);
            const active = reg.getActive();

            // Resolve combo, consuming any pending prefix.
            let combo = e.key;
            if (pendingRef.current) {
                combo = `${pendingRef.current} ${e.key}`;
                clearPending();
            }

            const match = active.find(
                (s) =>
                    s.keys.includes(combo) &&
                    (!typing || combo === 'Escape') &&
                    (s.when ? s.when() : true)
            );

            if (match) {
                e.preventDefault();
                match.handler(e);
                return;
            }

            // Start a new two-key sequence if some active binding expects it.
            if (
                !typing &&
                active.some((s) => s.keys.some((k) => k.startsWith(`${e.key} `)))
            ) {
                pendingRef.current = e.key;
                timerRef.current = setTimeout(clearPending, SEQUENCE_TIMEOUT_MS);
            }
        };

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            clearPending();
        };
    }, [reg]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/useGlobalKeyListener.test.tsx`
Expected: PASS (all 6 cases).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/keyboard/useGlobalKeyListener.ts apps/web/src/shared/keyboard/useGlobalKeyListener.test.tsx
git commit -m "feat(a11y): global key listener and dispatch"
```

---

### Task 5: Help modal + i18n strings

**Files:**
- Create: `apps/web/src/shared/keyboard/ShortcutHelpModal.tsx`
- Test: `apps/web/src/shared/keyboard/ShortcutHelpModal.test.tsx`
- Modify: `apps/web/src/i18n/locales/en/common.json`
- Modify: `apps/web/src/i18n/locales/es/common.json`

- [ ] **Step 1: Add i18n strings**

In `en/common.json`, add a top-level `"shortcuts"` object (match the file's existing 4-space indentation and trailing-comma style):
```json
"shortcuts": {
    "title": "Keyboard shortcuts",
    "close": "Close",
    "scopes": {
        "global": "General",
        "nav": "Navigation",
        "study:flashcards": "Flashcards",
        "study:mc": "Multiple choice",
        "study:typewrite": "Type the answer",
        "study:matching": "Matching"
    },
    "actions": {
        "help": "Show this help",
        "escape": "Close dialog / help",
        "create": "Create a new set",
        "search": "Focus search",
        "goHome": "Go to home",
        "goExplore": "Go to explore",
        "flip": "Flip card",
        "gradeAgain": "Grade: Again",
        "gradeHard": "Grade: Hard",
        "gradeGood": "Grade: Good",
        "gradeEasy": "Grade: Easy",
        "prev": "Previous card",
        "next": "Next card",
        "selectOption": "Select option 1-9",
        "selectTile": "Select tile 1-9",
        "moveHighlight": "Move highlight",
        "confirm": "Confirm / next",
        "submit": "Submit answer"
    }
}
```

In `es/common.json`, add the same structure with Spanish values:
```json
"shortcuts": {
    "title": "Atajos de teclado",
    "close": "Cerrar",
    "scopes": {
        "global": "General",
        "nav": "Navegación",
        "study:flashcards": "Tarjetas",
        "study:mc": "Opción múltiple",
        "study:typewrite": "Escribe la respuesta",
        "study:matching": "Emparejar"
    },
    "actions": {
        "help": "Mostrar esta ayuda",
        "escape": "Cerrar diálogo / ayuda",
        "create": "Crear un conjunto nuevo",
        "search": "Enfocar búsqueda",
        "goHome": "Ir al inicio",
        "goExplore": "Ir a explorar",
        "flip": "Voltear tarjeta",
        "gradeAgain": "Calificar: Otra vez",
        "gradeHard": "Calificar: Difícil",
        "gradeGood": "Calificar: Bien",
        "gradeEasy": "Calificar: Fácil",
        "prev": "Tarjeta anterior",
        "next": "Tarjeta siguiente",
        "selectOption": "Seleccionar opción 1-9",
        "selectTile": "Seleccionar ficha 1-9",
        "moveHighlight": "Mover resaltado",
        "confirm": "Confirmar / siguiente",
        "submit": "Enviar respuesta"
    }
}
```

- [ ] **Step 2: Write the failing test**

`apps/web/src/shared/keyboard/ShortcutHelpModal.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    id: 'nav.create', keys: ['c'], scope: 'nav',
    descriptionKey: 'shortcuts.actions.create', handler: () => {},
};

const setup = () =>
    render(
        <ShortcutProvider>
            <Listener />
            <Extra shortcuts={[navBinding]} />
            <ShortcutHelpModal />
        </ShortcutProvider>
    );

function Listener() {
    useGlobalKeyListener();
    return null;
}

describe('ShortcutHelpModal', () => {
    it('opens on ? and closes on Escape', () => {
        setup();
        expect(screen.queryByText('shortcuts.title')).toBeNull();
        fireEvent.keyDown(document.body, { key: '?' });
        expect(screen.getByText('shortcuts.title')).toBeInTheDocument();
        fireEvent.keyDown(document.body, { key: 'Escape' });
        expect(screen.queryByText('shortcuts.title')).toBeNull();
    });

    it('lists active scope actions', () => {
        setup();
        fireEvent.keyDown(document.body, { key: '?' });
        expect(screen.getByText('shortcuts.actions.create')).toBeInTheDocument();
    });
});
```
> Note: add `import { vi } from 'vitest'` at the top if your test setup does not inject `vi` globally.

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/ShortcutHelpModal.test.tsx`
Expected: FAIL — cannot find module `./ShortcutHelpModal`.

- [ ] **Step 4: Write the modal**

`apps/web/src/shared/keyboard/ShortcutHelpModal.tsx`:
```tsx
import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useShortcuts } from './useShortcuts';
import { useShortcutRegistry } from './ShortcutRegistry';
import type { ScopeId, Shortcut } from './shortcutTypes';

const SCOPE_ORDER: ScopeId[] = [
    'global',
    'nav',
    'study:flashcards',
    'study:mc',
    'study:typewrite',
    'study:matching',
];

const Kbd = ({ children }: { children: string }) => (
    <Box
        component="kbd"
        sx={{
            px: 0.75,
            py: 0.25,
            mx: 0.25,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            bgcolor: 'action.hover',
        }}
    >
        {children}
    </Box>
);

const prettyKey = (k: string): string =>
    k === ' '
        ? 'Space'
        : k
              .replace('ArrowLeft', '←')
              .replace('ArrowRight', '→')
              .replace('ArrowUp', '↑')
              .replace('ArrowDown', '↓');

export function ShortcutHelpModal() {
    const { t } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const reg = useShortcutRegistry();

    useShortcuts([
        {
            id: 'global.help',
            keys: ['?'],
            scope: 'global',
            descriptionKey: 'shortcuts.actions.help',
            handler: () => setOpen((o) => !o),
        },
        {
            id: 'global.escape',
            keys: ['Escape'],
            scope: 'global',
            descriptionKey: 'shortcuts.actions.escape',
            handler: () => setOpen(false),
            when: () => open,
        },
    ]);

    // reg.version referenced so the list re-reads when bindings change.
    void reg.version;
    const active = reg.getActive().filter((s) => (s.when ? s.when() : true));
    const byScope = SCOPE_ORDER.map((scope) => ({
        scope,
        items: active.filter((s) => s.scope === scope),
    })).filter((g) => g.items.length > 0);

    return (
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{t('shortcuts.title')}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {byScope.map((group) => (
                        <Box key={group.scope}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t(`shortcuts.scopes.${group.scope}`)}
                            </Typography>
                            {group.items.map((s: Shortcut) => (
                                <Box
                                    key={s.id}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        py: 0.5,
                                    }}
                                >
                                    <Typography variant="body2">
                                        {t(s.descriptionKey)}
                                    </Typography>
                                    <Box>
                                        {s.keys.map((k) => (
                                            <Kbd key={k}>
                                                {k
                                                    .split(' ')
                                                    .map(prettyKey)
                                                    .join(' ')}
                                            </Kbd>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
```
> The help modal opening does not block other bindings, but it has no inputs, so stray number keys are harmless. The `global.escape` `when: () => open` ensures Escape only closes help when help is open, leaving MUI dialogs' own Escape behavior intact otherwise.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard/ShortcutHelpModal.test.tsx`
Expected: PASS.

- [ ] **Step 6: Verify both JSON files are valid**

Run: `cd apps/web && node -e "require('./src/i18n/locales/en/common.json'); require('./src/i18n/locales/es/common.json'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/shared/keyboard/ShortcutHelpModal.tsx apps/web/src/shared/keyboard/ShortcutHelpModal.test.tsx apps/web/src/i18n/locales/en/common.json apps/web/src/i18n/locales/es/common.json
git commit -m "feat(a11y): shortcut help modal and strings"
```

---

### Task 6: Nav scope bindings

**Files:**
- Create: `apps/web/src/shared/keyboard/NavShortcuts.tsx`
- Modify: `apps/web/src/views/Home/HomeToolbar.tsx`

- [ ] **Step 1: Tag the search field**

In `apps/web/src/views/Home/HomeToolbar.tsx`, find the `searchField` `TextField` (around line 152) and add an inputProps data attribute so the `/` shortcut can focus it. Change:
```tsx
        <TextField
            placeholder={t('home.toolbar.searchPlaceholder')}
            fullWidth={isSmallScreen}
            InputProps={{
```
to add `inputProps` (note: lowercase `inputProps` targets the underlying `<input>`):
```tsx
        <TextField
            placeholder={t('home.toolbar.searchPlaceholder')}
            fullWidth={isSmallScreen}
            inputProps={{ 'data-shortcut-search': 'true' }}
            InputProps={{
```

- [ ] **Step 2: Write NavShortcuts**

`apps/web/src/shared/keyboard/NavShortcuts.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import { useShortcuts } from './useShortcuts';

/** Mounted only on non-study routes (see App.tsx). Registers nav shortcuts. */
export function NavShortcuts() {
    const navigate = useNavigate();

    useShortcuts([
        {
            id: 'nav.create',
            keys: ['c'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.create',
            handler: () => navigate('/create'),
        },
        {
            id: 'nav.search',
            keys: ['/'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.search',
            handler: () => {
                const el = document.querySelector<HTMLInputElement>(
                    '[data-shortcut-search]'
                );
                el?.focus();
            },
        },
        {
            id: 'nav.home',
            keys: ['g h'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.goHome',
            handler: () => navigate('/'),
        },
        {
            id: 'nav.explore',
            keys: ['g e'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.goExplore',
            handler: () => navigate('/explore'),
        },
    ]);

    return null;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/keyboard/NavShortcuts.tsx apps/web/src/views/Home/HomeToolbar.tsx
git commit -m "feat(a11y): nav shortcuts and search tag"
```

---

### Task 7: Wire provider, listener, modal, nav into App

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add imports**

At the top of `apps/web/src/App.tsx`, add:
```tsx
import { useLocation } from "react-router-dom";
import { ShortcutProvider } from "shared/keyboard/ShortcutRegistry";
import { useGlobalKeyListener } from "shared/keyboard/useGlobalKeyListener";
import { ShortcutHelpModal } from "shared/keyboard/ShortcutHelpModal";
import { NavShortcuts } from "shared/keyboard/NavShortcuts";
```
> Confirm `App` is rendered inside a Router (check `apps/web/src/index.tsx` for `<BrowserRouter>`). `useLocation` requires it. If App is NOT inside a Router, instead place the Router around the app in `index.tsx` first, or move this wiring into `AppRoutes.tsx` (which is inside `<Routes>`). Verify before proceeding.

- [ ] **Step 2: Add an inner component that uses the listener and location**

In `apps/web/src/App.tsx`, define a small inner component (above `App`) that runs the listener and conditionally mounts `NavShortcuts` off study routes:
```tsx
const ShortcutLayer = () => {
    useGlobalKeyListener();
    const location = useLocation();
    const isStudyRoute = location.pathname.startsWith("/study/");
    return (
        <>
            {!isStudyRoute && <NavShortcuts />}
            <ShortcutHelpModal />
        </>
    );
};
```

- [ ] **Step 3: Wrap the tree with ShortcutProvider and mount ShortcutLayer**

Change the `App` return so the existing tree is wrapped by `ShortcutProvider` and `ShortcutLayer` is mounted once. Replace the outer `<QueryClientProvider ...>` opening so it contains the provider:
```tsx
  return (
    <QueryClientProvider client={queryClient}>
      <ShortcutProvider>
        <GlobalSyncInitializer enableSync={true} />
        <GamificationSyncInitializer />
        <AppWrapper>
          <NavBar />
          {loadingActions.length > 0 && <LoadingIndicator />}
          <MainContent>
            <AppRoutes />
          </MainContent>
          <Footer />
        </AppWrapper>
        <FeedbackDialog />
        <ToastContainer theme={theme} />
        <GlobalConfirmDialog />
        <ManageLabelsDialog />
        <ConfirmationCodeDialog />
        <ShortcutLayer />
      </ShortcutProvider>
    </QueryClientProvider>
  );
```

- [ ] **Step 4: Typecheck and build**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "feat(a11y): mount shortcut layer in app"
```

---

### Task 8: Flashcards / Review bindings

`FlashcardsStudy.tsx` already has `handleFlip`, `handleGrade(grade)`, `handleNext`, `handlePrevious`, and state `flipped`, `hasRated`, `showResults`, plus `isFirstCard`, `isLastCard`, and `GRADES`. Register bindings that reuse these.

**Files:**
- Modify: `apps/web/src/views/Study/FlashcardsStudy.tsx`
- Test: `apps/web/src/views/Study/FlashcardsStudy.shortcuts.test.tsx`

- [ ] **Step 1: Add the import and binding registration**

In `apps/web/src/views/Study/FlashcardsStudy.tsx`, add the import near the other shared imports:
```tsx
import { useShortcuts } from 'shared/keyboard/useShortcuts';
```
Then, inside the component AFTER `handleFlip`, `handleGrade`, `handleNext`, `handlePrevious` and the `GRADES` array are defined (so they are in scope), add:
```tsx
    const gradeKeyMap: Record<string, Grade> = {
        '1': 'again',
        '2': 'hard',
        '3': 'good',
        '4': 'easy',
    };

    useShortcuts([
        {
            id: 'flashcards.flip',
            keys: [' ', 'Enter'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.flip',
            handler: () => handleFlip(),
            when: () => !showResults && !hasRated,
        },
        {
            id: 'flashcards.grade',
            keys: ['1', '2', '3', '4'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.gradeGood',
            handler: (e) => {
                const grade = gradeKeyMap[e.key];
                if (grade) handleGrade(grade);
            },
            when: () => flipped && !hasRated && !showResults,
        },
        {
            id: 'flashcards.prev',
            keys: ['ArrowLeft'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.prev',
            handler: () => handlePrevious(),
            when: () => !showResults,
        },
        {
            id: 'flashcards.next',
            keys: ['ArrowRight'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.next',
            handler: () => handleNext(),
            when: () => !showResults,
        },
    ]);
```
> `Grade` is already imported in this file (used by `handleGrade`). The four grade keys share one binding; the help modal will show them as `1 2 3 4` against the "Grade: Good" label — acceptable for this iteration. If a per-grade list is wanted later, split into four bindings.

- [ ] **Step 2: Write the test**

`apps/web/src/views/Study/FlashcardsStudy.shortcuts.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ShortcutProvider } from 'shared/keyboard/ShortcutRegistry';
import { useGlobalKeyListener } from 'shared/keyboard/useGlobalKeyListener';

// NOTE: This test renders FlashcardsStudy with its real store. If the existing
// FlashcardsStudy tests use specific mocks/fixtures for useStudySessionStore and
// the studyset query, mirror that setup here (copy the mock block from the
// nearest existing Study test). The assertions below check shortcut wiring.

function Listener() {
    useGlobalKeyListener();
    return null;
}

// Replace `renderStudy` body with the project's standard way of mounting
// FlashcardsStudy (see existing Study tests for required providers/props).
async function renderStudy() {
    const FlashcardsStudy = (await import('./FlashcardsStudy')).default;
    return render(
        <MemoryRouter>
            <ShortcutProvider>
                <Listener />
                <FlashcardsStudy studysetId="test-set" />
            </ShortcutProvider>
        </MemoryRouter>
    );
}

describe('FlashcardsStudy keyboard shortcuts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Space flips the card (front -> shows back)', async () => {
        const { getByText, queryByText } = await renderStudy();
        // Adjust the visible front/back text to your fixture's card content.
        fireEvent.keyDown(document.body, { key: ' ' });
        await waitFor(() => {
            // After flip, the "Click to flip" hint should no longer show.
            expect(queryByText(/click to flip/i)).toBeNull();
        });
        void getByText;
    });
});
```
> This study-mode test depends on the existing test fixtures for `useStudySessionStore` and the studyset data query. Before writing assertions, open the nearest existing Study test (search `src/views/Study` for `*.test.*`); if none exists, build the minimal store mock so a card renders, then assert: Space removes the "Click to flip" hint, ArrowRight advances the card index, and pressing `3` after flipping calls grade. If wiring a full render proves heavy, downgrade this task to a focused unit test that registers the same binding array against a mock and asserts `when()`/`handler` behavior (the binding objects are plain data).

- [ ] **Step 3: Run the test**

Run: `cd apps/web && pnpm vp test run src/views/Study/FlashcardsStudy.shortcuts.test.tsx`
Expected: PASS (after fixture wiring). If the full render is impractical, the downgraded unit test must still pass.

- [ ] **Step 4: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/Study/FlashcardsStudy.tsx apps/web/src/views/Study/FlashcardsStudy.shortcuts.test.tsx
git commit -m "feat(a11y): flashcards study shortcuts"
```

---

### Task 9: Multiple choice bindings

**Files:**
- Modify: `apps/web/src/views/Study/MultipleChoiceStudy.tsx`

- [ ] **Step 1: Identify the existing handlers**

Open `apps/web/src/views/Study/MultipleChoiceStudy.tsx`. Locate:
- the array of options rendered for the current question (its variable name and length),
- the handler called when an option is clicked (e.g. `handleSelect(option)` or `handleAnswer(index)`),
- the handler/condition for advancing to the next question (e.g. `handleNext`),
- any "answered/locked" state that disables selection after answering.

Record their exact names — you will reference them in Step 2.

- [ ] **Step 2: Register bindings**

Add the import:
```tsx
import { useShortcuts } from 'shared/keyboard/useShortcuts';
```
After the handlers/state identified in Step 1 are in scope, add (substituting the real names found in Step 1 for `options`, `handleSelectByIndex`, `handleNext`, `isAnswered`):
```tsx
    useShortcuts([
        {
            id: 'mc.select',
            keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            scope: 'study:mc',
            descriptionKey: 'shortcuts.actions.selectOption',
            handler: (e) => {
                const idx = Number(e.key) - 1;
                if (idx >= 0 && idx < options.length) {
                    handleSelectByIndex(idx);
                }
            },
            when: () => !isAnswered,
        },
        {
            id: 'mc.next',
            keys: ['Enter'],
            scope: 'study:mc',
            descriptionKey: 'shortcuts.actions.confirm',
            handler: () => handleNext(),
            when: () => isAnswered,
        },
    ]);
```
> If the click handler takes the option object rather than an index, call it as `handleSelect(options[idx])`. If there is no `isAnswered` flag, use whatever boolean gates the UI's "next" button (e.g. `showFeedback`). Keep the `when` guards aligned with the on-screen button enablement so keyboard and mouse behave identically.

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke (defer full run to Task 12)**

Confirm the file compiles. Behavior is verified manually in Task 12.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/views/Study/MultipleChoiceStudy.tsx
git commit -m "feat(a11y): multiple choice study shortcuts"
```

---

### Task 10: Type Write bindings

`TypeWriteStudy.tsx` already submits on Enter via `handleKeyPress` (line ~212). Add a registry binding only for advancing after feedback, and leave the existing in-field Enter submit as-is (the global listener ignores keystrokes while the input is focused, so it will not conflict).

**Files:**
- Modify: `apps/web/src/views/Study/TypeWriteStudy.tsx`

- [ ] **Step 1: Identify handlers**

Open `apps/web/src/views/Study/TypeWriteStudy.tsx`. Locate the "next card" handler (e.g. `handleNext`) and the post-answer state flag (the existing `showFeedback` referenced at line ~213).

- [ ] **Step 2: Register the advance binding**

Add the import:
```tsx
import { useShortcuts } from 'shared/keyboard/useShortcuts';
```
After the handler/state are in scope, add (substituting real names):
```tsx
    useShortcuts([
        {
            id: 'typewrite.next',
            keys: ['Enter'],
            scope: 'study:typewrite',
            descriptionKey: 'shortcuts.actions.confirm',
            handler: () => handleNext(),
            // Only after feedback is shown AND focus is not in the input
            // (global listener already skips key events from the textarea/input).
            when: () => showFeedback,
        },
    ]);
```
> Why this is safe: while the user is typing, focus is in the input, so `isTypingTarget` is true and the global listener ignores Enter — the existing `handleKeyPress` submit still runs. After submit, if the input loses focus (or feedback view replaces it), Enter advances. If in this component the input keeps focus after submit, this binding will not fire and the existing handler should own "next"; in that case verify the existing handler already advances on a second Enter and skip adding the binding.

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/Study/TypeWriteStudy.tsx
git commit -m "feat(a11y): type-write study shortcuts"
```

---

### Task 11: Matching bindings

**Files:**
- Modify: `apps/web/src/views/Study/MatchingStudy.tsx`

- [ ] **Step 1: Identify rendering and handlers**

Open `apps/web/src/views/Study/MatchingStudy.tsx`. Locate:
- the array(s) of tiles rendered (and combined visible order/length),
- the handler called when a tile is clicked (e.g. `handleTileClick(tile)` or `(index)`),
- any state for a currently highlighted/selected tile (if none exists, you will add a local `highlightIndex` state).

- [ ] **Step 2: Add highlight state if absent, and register bindings**

Add the import:
```tsx
import { useShortcuts } from 'shared/keyboard/useShortcuts';
```
If there is no highlight state, add near the other `useState` calls:
```tsx
    const [highlightIndex, setHighlightIndex] = useState(0);
```
Then register (substitute `tiles`, `handleTileSelect` with the real names from Step 1):
```tsx
    useShortcuts([
        {
            id: 'matching.select',
            keys: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
            scope: 'study:matching',
            descriptionKey: 'shortcuts.actions.selectTile',
            handler: (e) => {
                const idx = Number(e.key) - 1;
                if (idx >= 0 && idx < tiles.length) handleTileSelect(tiles[idx]);
            },
        },
        {
            id: 'matching.move',
            keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'],
            scope: 'study:matching',
            descriptionKey: 'shortcuts.actions.moveHighlight',
            handler: (e) => {
                setHighlightIndex((i) => {
                    if (tiles.length === 0) return 0;
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
                        return (i - 1 + tiles.length) % tiles.length;
                    return (i + 1) % tiles.length;
                });
            },
        },
        {
            id: 'matching.confirm',
            keys: ['Enter'],
            scope: 'study:matching',
            descriptionKey: 'shortcuts.actions.confirm',
            handler: () => {
                if (tiles[highlightIndex]) handleTileSelect(tiles[highlightIndex]);
            },
        },
    ]);
```
> Optionally apply a visible focus ring to the tile at `highlightIndex` (e.g. an `sx` border when `index === highlightIndex`) so arrow navigation is visible. If matching already manages selection differently, keep `1-9` direct-select as the primary path and only add arrow/Enter if it maps cleanly. Do not fight the existing matching state machine.

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/views/Study/MatchingStudy.tsx
git commit -m "feat(a11y): matching study shortcuts"
```

---

### Task 12: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full keyboard test suite**

Run: `cd apps/web && pnpm vp test run src/shared/keyboard`
Expected: all pass.

- [ ] **Step 2: Run the full unit suite + typecheck**

Run: `cd apps/web && pnpm vp test run && pnpm exec tsc --noEmit`
Expected: no failures, no type errors. (If unrelated pre-existing failures appear, note them; they are out of scope.)

- [ ] **Step 3: Manual smoke in the browser**

Start the app (`pnpm dev` from `apps/web` or the repo's documented run command) and verify:
- Press `?` anywhere → help modal opens; `Esc` closes it.
- On Home: `c` → goes to create; `/` → focuses the search box; `g` then `h` → home; `g` then `e` → explore.
- Typing in the Home search box: pressing `c` types "c" (does NOT navigate).
- Flashcards: `Space` flips; after flip `1/2/3/4` grade; `←/→` move between cards.
- Multiple choice: `1-N` selects an option; `Enter` advances after answering.
- Type-write: typing answer + `Enter` submits (unchanged); behavior after feedback advances.
- Matching: `1-N` selects tiles (and arrows move highlight if implemented).

- [ ] **Step 4: Final review against the spec**

Re-read `docs/superpowers/specs/2026-06-13-keyboard-accessibility-shortcuts-design.md` and confirm every shortcut in the map is implemented or explicitly noted as adapted.

- [ ] **Step 5: Push and open PR (only when asked)**

```bash
git push -u origin feat/keyboard-shortcuts-issue-5
gh pr create --fill --base main
```
PR body should reference issue #5 and note the focus/tabindex audit is deferred.

---

## Notes for the implementer

- **commitlint:** subject line short and in `type(scope): summary` form; body lines ≤ 100 chars.
- **Don't touch** the 8 unrelated files already modified in the working tree on `main`; this work is on branch `feat/keyboard-shortcuts-issue-5`.
- **Single source of truth:** never hand-maintain a shortcut list for the help modal — it always reads the registry.
- **Guards live only in `useGlobalKeyListener`** — do not add per-view `keydown` listeners (except the pre-existing in-field `handleKeyPress` in TypeWrite, which stays).
- **Run command:** confirm the dev/test command from `apps/web/package.json` scripts if `pnpm dev` / `pnpm vitest` differ.
