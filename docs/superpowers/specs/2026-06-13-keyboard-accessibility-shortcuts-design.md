# Keyboard Accessibility & Shortcuts — Design

**Issue:** #5 — Enhancement: Comprehensive Keyboard Accessibility & Shortcuts
**Date:** 2026-06-13
**Scope (this iteration):** Shortcuts only — study shortcuts, app-navigation shortcuts, and a global help modal. The full app-wide WCAG focus/tabindex audit is explicitly **deferred** to a follow-up issue.

## Goal

Make Quizaroni controllable from the keyboard for the most common flows: studying (all 4 modes), core navigation, and discoverability of shortcuts via a help modal. A single source of truth (a shortcut registry) drives both dispatch and the help modal so they never drift.

## Architecture (Approach A — custom registry, no new dependency)

A lightweight registry holds the set of currently-active shortcut bindings. A single `window` keydown listener consults the registry and dispatches. The help modal renders from the same registry, so it is automatically context-aware (only shows bindings for currently-active scopes).

### New files (`apps/web/src/shared/keyboard/`)

| File | Responsibility |
|------|----------------|
| `shortcutTypes.ts` | `Shortcut`, `ScopeId`, `KeyCombo` types. A `Shortcut` = `{ id, keys, scope, descriptionKey (i18n), handler, when? }`. |
| `ShortcutRegistry.tsx` | React context + `ShortcutProvider`. Holds active bindings in a ref/state map keyed by shortcut id. Exposes `register`, `unregister`, `getActive()`. |
| `useShortcuts.ts` | Hook. Registers an array of bindings for a scope on mount, unregisters on unmount. Stable via refs so handlers can close over latest state without re-registering. |
| `useGlobalKeyListener.ts` | Mounts one `window` `keydown` listener. Normalizes the event to a combo string, applies guards, finds the matching active binding, calls its handler, `preventDefault` on match. Handles the two-key (`g` then `h`) sequence with a short timeout buffer. |
| `guards.ts` | `isTypingTarget(e)` → true when focus is in `input`/`textarea`/`select`/`contenteditable`. `hasModifier(e)` → true when ctrl/meta/alt held. |
| `ShortcutHelpModal.tsx` | MUI `Dialog`. Reads registry, groups active bindings by scope label, renders a two-column (keys / action) list. Opened/closed via global scope bindings. |

### Wiring

`ShortcutProvider` wraps the app near the root (around `AppRoutes`). `useGlobalKeyListener()` and `<ShortcutHelpModal />` are mounted once inside the provider. Per-view shortcuts are registered by each view calling `useShortcuts(scope, bindings)`.

### Scopes

- `global` — always active (help modal toggle, Esc).
- `nav` — active on non-study pages (registered by a small wrapper or by NavBar-level mount).
- `study:flashcards`, `study:mc`, `study:typewrite`, `study:matching` — registered by the respective study component while mounted.

Only one study scope is active at a time (one study component mounts at a time). `nav` and study scopes are mutually exclusive in practice (different routes).

## Shortcut Map

### Global (always active)
| Keys | Action |
|------|--------|
| `?` | Toggle the help modal |
| `Esc` | Close the help modal (and yields to MUI dialogs' own Esc) |

### Nav (non-study pages)
| Keys | Action |
|------|--------|
| `c` | Navigate to `/create` |
| `/` | Focus the page search field (element tagged `data-shortcut-search`) |
| `g` then `h` | Navigate home (`/`) |
| `g` then `e` | Navigate to `/explore` |

### Flashcards / Review (`FlashcardsStudy.tsx`, shared)
| Keys | Action |
|------|--------|
| `Space` / `Enter` | Flip card |
| `1` `2` `3` `4` | Grade again / hard / good / easy (only when flipped & not yet rated) |
| `←` / `→` | Previous / next card |

### Multiple Choice (`MultipleChoiceStudy.tsx`)
| Keys | Action |
|------|--------|
| `1`..`N` | Select the option at that position (visible order) |
| `Enter` | Confirm selection / advance to next |

### Type Write (`TypeWriteStudy.tsx`)
| Keys | Action |
|------|--------|
| `Enter` | Submit answer (existing behavior, kept) |
| `Enter` (after feedback) | Advance to next card |

### Matching (`MatchingStudy.tsx`)
| Keys | Action |
|------|--------|
| `1`..`N` | Select the tile at that position (visible order) |
| `←` `→` `↑` `↓` | Move highlight between tiles |
| `Enter` | Select highlighted tile |

> Number-key selection (`1-N`) maps to the **visible on-screen order** of options/tiles.

## Help Modal

- MUI `Dialog`, titled (i18n) "Keyboard shortcuts".
- Renders sections per active scope, each with a human label (i18n) and a key/action table.
- `<kbd>`-styled key chips.
- i18n: new keys under `shortcuts.*` added to `en/common.json` and `es/common.json`.

## Guarding (centralized in `useGlobalKeyListener`)

1. If `isTypingTarget(e)` → ignore all shortcuts **except** `Esc`. (So typing answers/search never triggers grading/nav.)
2. If `hasModifier(e)` → ignore (don't clobber `Ctrl+/`, `Cmd+K`, browser shortcuts). Exception: none needed this iteration.
3. `?` (Shift+/) still resolves to the help toggle because we match on `e.key === '?'`, not the raw `/`.
4. On a matched binding, call `preventDefault()` to stop page scroll (e.g. Space) and default actions.

## Data Flow

```
window keydown
  → useGlobalKeyListener
      → guards (isTypingTarget / hasModifier)
      → resolve combo (incl. pending two-key sequence)
      → registry.getActive() → find binding by scope+combo
      → binding.handler(e); e.preventDefault()
```

Views register/unregister their bindings via `useShortcuts` on mount/unmount, so `getActive()` always reflects the current screen.

## Error / Edge Handling

- No matching binding → no-op, event propagates normally.
- Two-key sequence timeout (~800ms) → pending prefix cleared.
- Help modal open → study/nav bindings still registered but the modal's own Esc/`?` handling takes priority for closing; number keys do nothing harmful (modal has no inputs).
- Grade keys guarded by the existing `flipped && !hasRated` condition reused from click handlers (no duplicate logic — call the same `handleGrade`).

## Testing

- `guards.test.ts` — `isTypingTarget` across input/textarea/contenteditable/normal; `hasModifier`.
- `ShortcutRegistry.test.tsx` — register/unregister, `getActive` reflects mounted scopes, dispatch picks correct handler.
- `useGlobalKeyListener` — typing target suppresses non-Esc; modifier suppresses; two-key sequence resolves and times out.
- Study (extend existing tests where present): keydown flips, grades (when flipped), navigates in Flashcards; `1-N` selects in MC/Matching; Enter advances in TypeWrite.
- `ShortcutHelpModal.test.tsx` — `?` opens, lists only active-scope bindings, `Esc` closes.

## Out of Scope (deferred follow-up)

- App-wide tabindex/focus-state audit across every view.
- Remappable/customizable shortcuts.
- Shortcut conflict UI / per-user config.

## Files Touched (summary)

- **New:** `apps/web/src/shared/keyboard/*` (7 files + tests).
- **Modified:** root mount (`App.tsx` or `AppRoutes.tsx`) for provider/listener/modal; `FlashcardsStudy.tsx`, `MultipleChoiceStudy.tsx`, `TypeWriteStudy.tsx`, `MatchingStudy.tsx` to register bindings; `HomeToolbar.tsx` (+ Explore search) to add `data-shortcut-search`; NavBar or a nav wrapper for `nav` scope; `i18n/locales/en|es/common.json` for `shortcuts.*` strings.
