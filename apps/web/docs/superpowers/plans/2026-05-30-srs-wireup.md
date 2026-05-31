# Spaced Repetition Wire-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the already-implemented SM-2 spaced-repetition scheduler to users via a per-studyset "Review Due" flashcard mode, Again/Hard/Good/Easy grading, and durable Dexie persistence.

**Architecture:** Extract the inline SM-2 math from the zustand store into a pure, unit-tested module (`srs.ts`). Persist card progress to the existing Dexie `cardProgress` table through a new repository (replacing fragile localStorage). Add a `review` study mode that loads only due cards into the existing `FlashcardsStudy` component. Replace the 1–5 star rating with four labeled grade buttons that write through to Dexie.

**Tech Stack:** React 18 + TypeScript, Zustand, Dexie (IndexedDB), MUI v5, react-i18next, Vitest (`vp test`).

**Conventions:** rem units only (no px), no hardcoded user-facing strings (use `useTranslation`), Prettier (4 spaces, single quotes). Validate with `vp check` (format + lint + types) and `vp test`.

**Branch:** `feature/srs-wireup` (already created; spec already committed).

---

## File Structure

**New**

- `src/shared/utilities/srs.ts` — pure SM-2 math + grade mapping + due helpers. No I/O.
- `src/shared/utilities/srs.test.ts` — Vitest unit tests for `srs.ts`.
- `src/state/local/repositories/CardProgressRepository.ts` — Dexie CRUD for `cardProgress` + one-time localStorage migration.
- `src/shared/hooks/useDueCount.ts` — async due-count hook for a studyset.

**Modify**

- `src/state/local/db.ts` — bump to v2, add `[studysetUUID+nextReview]` compound index.
- `src/state/local/repositories/index.ts` — export the new repository.
- `src/state/stores/studySession.ts` — delegate to `computeSm2`, write through to Dexie, drop `cardProgress` Map + `getNextReviewCards`.
- `src/shared/constants/index.ts` — add `STUDY_MODES.REVIEW` + `STUDY_MODE_CONFIG` entry.
- `src/views/Study/StudyMode.tsx` — route `review` to `<FlashcardsStudy reviewMode />`.
- `src/views/Study/FlashcardsStudy.tsx` — `reviewMode` prop, due-card load, grade buttons, caught-up state, i18n.
- `src/views/ViewStudySet/StudyModesGrid/StudyModesGrid.tsx` — "Review Due (N)" tile.
- `src/i18n/locales/en/study.json`, `src/i18n/locales/es/study.json` — review-mode + due strings (`ratings.*` already exist).

**Note on tests:** the project has no jsdom/fake-indexeddb test environment, so only the pure `srs.ts` module is unit-tested. The repository and React wiring are thin glue validated via `vp check` (type/lint) and manual run.

---

## Task 1: SRS pure module

**Files:**

- Create: `src/shared/utilities/srs.ts`
- Test: `src/shared/utilities/srs.test.ts`

This moves the math currently inline in `src/state/stores/studySession.ts:152-211` into a pure module. Behavior must match exactly.

- [ ] **Step 1: Write the failing test**

Create `src/shared/utilities/srs.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
    computeSm2,
    projectInterval,
    newProgress,
    isDue,
    sortByNextReview,
    GRADE_QUALITY,
} from './srs';
import type { CardProgress } from 'shared/types';

const base = (over: Partial<CardProgress> = {}): CardProgress => ({
    cardUUID: 'c1',
    lastStudied: '2026-01-01T00:00:00.000Z',
    nextReview: '2026-01-01T00:00:00.000Z',
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    masteryLevel: 'new',
    ...over,
});

describe('GRADE_QUALITY', () => {
    it('maps grades to SM-2 quality', () => {
        expect(GRADE_QUALITY).toEqual({
            again: 1,
            hard: 3,
            good: 4,
            easy: 5,
        });
    });
});

describe('newProgress', () => {
    it('creates a new card at interval 0, ease 2.5', () => {
        const p = newProgress('abc');
        expect(p.cardUUID).toBe('abc');
        expect(p.interval).toBe(0);
        expect(p.repetitions).toBe(0);
        expect(p.easeFactor).toBe(2.5);
        expect(p.masteryLevel).toBe('new');
    });
});

describe('computeSm2', () => {
    it('first successful review sets interval to 1 day', () => {
        const r = computeSm2(base(), 4);
        expect(r.repetitions).toBe(1);
        expect(r.interval).toBe(1);
        expect(r.masteryLevel).toBe('learning');
    });

    it('second successful review sets interval to 6 days', () => {
        const r = computeSm2(base({ repetitions: 1, interval: 1 }), 4);
        expect(r.repetitions).toBe(2);
        expect(r.interval).toBe(6);
        expect(r.masteryLevel).toBe('review');
    });

    it('third+ review multiplies interval by ease factor', () => {
        const r = computeSm2(
            base({ repetitions: 2, interval: 6, easeFactor: 2.5 }),
            4
        );
        expect(r.repetitions).toBe(3);
        expect(r.interval).toBe(15); // round(6 * 2.5)
    });

    it('failing quality (<3) resets repetitions and interval', () => {
        const r = computeSm2(
            base({ repetitions: 5, interval: 40, easeFactor: 2.2 }),
            1
        );
        expect(r.repetitions).toBe(0);
        expect(r.interval).toBe(1);
    });

    it('clamps ease factor to a 1.3 floor', () => {
        const r = computeSm2(base({ easeFactor: 1.3 }), 1);
        expect(r.easeFactor).toBe(1.3);
    });

    it('marks mastered at 5+ repetitions', () => {
        const r = computeSm2(
            base({ repetitions: 4, interval: 100, easeFactor: 2.5 }),
            5
        );
        expect(r.repetitions).toBe(5);
        expect(r.masteryLevel).toBe('mastered');
    });

    it('sets nextReview interval days in the future', () => {
        const r = computeSm2(base(), 4);
        const next = new Date(r.nextReview).getTime();
        const studied = new Date(r.lastStudied).getTime();
        const days = Math.round((next - studied) / (1000 * 60 * 60 * 24));
        expect(days).toBe(1);
    });
});

describe('projectInterval', () => {
    it('returns the interval computeSm2 would produce without mutating input', () => {
        const prev = base({ repetitions: 1, interval: 1 });
        const days = projectInterval(prev, 'good');
        expect(days).toBe(computeSm2(prev, GRADE_QUALITY.good).interval);
        expect(prev.interval).toBe(1); // unchanged
    });
});

describe('isDue / sortByNextReview', () => {
    const now = new Date('2026-06-01T00:00:00.000Z');

    it('isDue is true when nextReview <= now', () => {
        expect(
            isDue(base({ nextReview: '2026-05-31T00:00:00.000Z' }), now)
        ).toBe(true);
        expect(
            isDue(base({ nextReview: '2026-06-02T00:00:00.000Z' }), now)
        ).toBe(false);
    });

    it('sorts ascending by nextReview', () => {
        const a = base({
            cardUUID: 'a',
            nextReview: '2026-06-03T00:00:00.000Z',
        });
        const b = base({
            cardUUID: 'b',
            nextReview: '2026-06-01T00:00:00.000Z',
        });
        expect(sortByNextReview([a, b]).map((p) => p.cardUUID)).toEqual([
            'b',
            'a',
        ]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `vp test src/shared/utilities/srs.test.ts`
Expected: FAIL — cannot resolve `./srs` (module not found).

- [ ] **Step 3: Write minimal implementation**

Create `src/shared/utilities/srs.ts`:

```ts
import type { CardProgress, UUID } from 'shared/types';

export type Grade = 'again' | 'hard' | 'good' | 'easy';

// Grade -> SM-2 quality (0-5). >=3 is a passing recall.
export const GRADE_QUALITY: Record<Grade, number> = {
    again: 1,
    hard: 3,
    good: 4,
    easy: 5,
};

export function newProgress(cardUUID: UUID): CardProgress {
    const now = new Date().toISOString();
    return {
        cardUUID,
        lastStudied: now,
        nextReview: now,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        masteryLevel: 'new',
    };
}

function masteryFor(repetitions: number): CardProgress['masteryLevel'] {
    if (repetitions >= 5) return 'mastered';
    if (repetitions >= 2) return 'review';
    if (repetitions >= 1) return 'learning';
    return 'new';
}

// Pure SM-2 step. Returns a new CardProgress; does not mutate `prev`.
export function computeSm2(prev: CardProgress, quality: number): CardProgress {
    let { easeFactor, interval, repetitions } = prev;

    if (quality >= 3) {
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    } else {
        repetitions = 0;
        interval = 1;
    }

    easeFactor =
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    easeFactor = Math.max(1.3, easeFactor);

    const lastStudied = new Date();
    const nextReview = new Date(lastStudied);
    nextReview.setDate(nextReview.getDate() + interval);

    return {
        ...prev,
        lastStudied: lastStudied.toISOString(),
        nextReview: nextReview.toISOString(),
        easeFactor,
        interval,
        repetitions,
        masteryLevel: masteryFor(repetitions),
    };
}

// Interval (days) a given grade would yield, without side effects.
export function projectInterval(prev: CardProgress, grade: Grade): number {
    return computeSm2(prev, GRADE_QUALITY[grade]).interval;
}

export function isDue(progress: CardProgress, now: Date = new Date()): boolean {
    return new Date(progress.nextReview).getTime() <= now.getTime();
}

export function sortByNextReview(list: CardProgress[]): CardProgress[] {
    return [...list].sort(
        (a, b) =>
            new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `vp test src/shared/utilities/srs.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/shared/utilities/srs.ts src/shared/utilities/srs.test.ts
git commit -m "feat(srs): extract pure SM-2 module with tests"
```

---

## Task 2: Dexie v2 + CardProgressRepository

**Files:**

- Modify: `src/state/local/db.ts:65-77` (stores) and `:53-54` (version)
- Create: `src/state/local/repositories/CardProgressRepository.ts`
- Modify: `src/state/local/repositories/index.ts`
- Modify: `src/state/local/index.ts` (export type already present; add repo export passthrough)

- [ ] **Step 1: Bump Dexie version and add compound index**

In `src/state/local/db.ts`, change:

```ts
const DB_VERSION = 1;
```

to:

```ts
const DB_VERSION = 2;
```

And change the `cardProgress` store line inside `db.version(DB_VERSION).stores({ ... })`:

```ts
        cardProgress: 'cardUUID, studysetUUID, nextReview, _syncStatus',
```

to:

```ts
        cardProgress:
            'cardUUID, studysetUUID, nextReview, _syncStatus, [studysetUUID+nextReview]',
```

(Dexie applies the new schema as an upgrade; existing rows are preserved.)

- [ ] **Step 2: Create the repository**

Create `src/state/local/repositories/CardProgressRepository.ts`:

```ts
import { getDatabase, type LocalCardProgress } from '../db';
import type { CardProgress, UUID } from 'shared/types';

const LEGACY_KEY = 'study-session-storage';
const MIGRATION_FLAG = 'srs-progress-migrated-v1';

// Repository for SM-2 card progress - always hits local Dexie DB.
// Local-only for now (no backend sync); rows are marked pending for a future sync layer.
export class CardProgressRepository {
    private db = getDatabase();
    private migrated = false;

    // ===== Read =====

    async getByCard(cardUUID: UUID): Promise<LocalCardProgress | undefined> {
        await this.ensureMigrated();
        return await this.db.cardProgress.get(cardUUID);
    }

    async getAllForStudyset(studysetUUID: UUID): Promise<LocalCardProgress[]> {
        await this.ensureMigrated();
        return await this.db.cardProgress
            .where('studysetUUID')
            .equals(studysetUUID)
            .toArray();
    }

    async getDueForStudyset(
        studysetUUID: UUID,
        now: Date = new Date()
    ): Promise<LocalCardProgress[]> {
        await this.ensureMigrated();
        const nowIso = now.toISOString();
        // Compound index [studysetUUID+nextReview]: bound the range to this set,
        // upper-bounded by now (ISO strings sort chronologically).
        return await this.db.cardProgress
            .where('[studysetUUID+nextReview]')
            .between([studysetUUID, ''], [studysetUUID, nowIso], true, true)
            .toArray();
    }

    async getDueCount(
        studysetUUID: UUID,
        now: Date = new Date()
    ): Promise<number> {
        const due = await this.getDueForStudyset(studysetUUID, now);
        return due.length;
    }

    // ===== Write =====

    async upsert(
        progress: CardProgress,
        studysetUUID: UUID
    ): Promise<LocalCardProgress> {
        await this.ensureMigrated();
        const local: LocalCardProgress = {
            ...progress,
            studysetUUID,
            _syncStatus: 'pending',
            _lastModified: Date.now(),
        };
        await this.db.cardProgress.put(local);
        return local;
    }

    // ===== Migration (one-time, lazy, idempotent) =====

    private async ensureMigrated(): Promise<void> {
        if (this.migrated) return;
        this.migrated = true;

        if (
            typeof localStorage === 'undefined' ||
            localStorage.getItem(MIGRATION_FLAG)
        ) {
            return;
        }

        try {
            const raw = localStorage.getItem(LEGACY_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // zustand persist shape: { state: { cardProgress: [[uuid, progress], ...] } }
                const entries: [string, CardProgress][] =
                    parsed?.state?.cardProgress ?? [];
                const rows: LocalCardProgress[] = entries
                    .map(([, p]) => p)
                    .filter((p) => p && p.cardUUID)
                    .map((p) => ({
                        ...p,
                        // studysetUUID was not tracked in the legacy Map; mark unknown.
                        studysetUUID: '',
                        _syncStatus: 'pending' as const,
                        _lastModified: Date.now(),
                    }));
                if (rows.length > 0) {
                    await this.db.cardProgress.bulkPut(rows);
                }
            }
        } catch {
            // Corrupt legacy data is non-fatal; skip migration.
        } finally {
            localStorage.setItem(MIGRATION_FLAG, '1');
        }
    }
}

// Singleton instance
export const cardProgressRepository = new CardProgressRepository();
```

> Note: legacy localStorage progress had no `studysetUUID`, so migrated rows use `''` and will not surface in any set's due query — they exist only so historical ease/interval is not lost if a future feature keys off `cardUUID`. New progress written post-migration always carries the real `studysetUUID`.

- [ ] **Step 3: Export the repository**

In `src/state/local/repositories/index.ts`, add:

```ts
export {
    CardProgressRepository,
    cardProgressRepository,
} from './CardProgressRepository';
```

In `src/state/local/index.ts`, extend the repositories export block:

```ts
// Repositories
export {
    studysetRepository,
    userRepository,
    cardProgressRepository,
    StudysetRepository,
    UserRepository,
    CardProgressRepository,
} from './repositories';
```

- [ ] **Step 4: Type-check and lint**

Run: `vp check`
Expected: PASS (no type or lint errors).

- [ ] **Step 5: Commit**

```bash
git add src/state/local/db.ts src/state/local/repositories/CardProgressRepository.ts src/state/local/repositories/index.ts src/state/local/index.ts
git commit -m "feat(srs): add CardProgressRepository and Dexie v2 due index"
```

---

## Task 3: Store delegates to computeSm2 and persists to Dexie

**Files:**

- Modify: `src/state/stores/studySession.ts`

Replace the inline SM-2 math with `computeSm2`, write through to Dexie via the repository, and remove the now-dead `cardProgress` Map and `getNextReviewCards` (superseded by the repository).

- [ ] **Step 1: Update imports**

At the top of `src/state/stores/studySession.ts`, after the existing imports, add:

```ts
import { computeSm2, newProgress } from 'shared/utilities/srs';
import { cardProgressRepository } from 'state/local/repositories';
```

Remove `CardProgress` from the `shared/types` import if it is no longer referenced after this task (the store no longer holds a `Map<string, CardProgress>`).

- [ ] **Step 2: Update the store type**

In the `StudySessionStore` type, remove these two members:

```ts
// Progress tracking
cardProgress: Map<string, CardProgress>;
```

and

```ts
    getNextReviewCards: (studysetUUID: string) => string[];
```

Change the progress action signature comment/line:

```ts
    // Progress management (SM-2 algorithm)
    updateCardProgress: (cardUUID: string, quality: number) => void;
```

stays the same signature (still `(cardUUID, quality) => void`) — implementation becomes async-fire-and-forget.

- [ ] **Step 3: Remove the cardProgress initial state**

In `create(...)`, delete the line:

```ts
            cardProgress: new Map(),
```

- [ ] **Step 4: Replace updateCardProgress implementation**

Replace the entire `updateCardProgress: (cardUUID, quality) => { ... }` block (currently `studySession.ts:152-218`) with:

```ts
            // SM-2 spaced repetition — pure math in shared/utilities/srs,
            // persisted to Dexie via cardProgressRepository (local-first).
            updateCardProgress: (cardUUID, quality) => {
                const studysetUUID = get().activeSession?.studysetUUID;
                if (!studysetUUID) return;

                void (async () => {
                    const existing =
                        await cardProgressRepository.getByCard(cardUUID);
                    const prev = existing ?? newProgress(cardUUID);
                    const updated = computeSm2(prev, quality);
                    await cardProgressRepository.upsert(updated, studysetUUID);
                })();
            },
```

- [ ] **Step 5: Remove getNextReviewCards implementation**

Delete the entire `getNextReviewCards: (studysetUUID) => { ... }` block (currently `studySession.ts:220-225`).

- [ ] **Step 6: Drop cardProgress from persistence**

In the `persist(...)` options at the bottom, change `partialize` from:

```ts
            partialize: (state) => ({
                cardProgress: Array.from(state.cardProgress.entries()),
                statistics: {
```

to:

```ts
            partialize: (state) => ({
                statistics: {
```

And change `merge` from:

```ts
            merge: (persistedState, currentState) => {
                const persisted = persistedState as any;
                return {
                    ...currentState,
                    cardProgress: new Map(persisted.cardProgress || []),
                    statistics: {
```

to:

```ts
            merge: (persistedState, currentState) => {
                const persisted = persistedState as any;
                return {
                    ...currentState,
                    statistics: {
```

- [ ] **Step 7: Type-check, lint, and run existing tests**

Run: `vp check && vp test`
Expected: PASS. (`vp check` confirms no remaining references to `cardProgress` Map or `getNextReviewCards`.)

- [ ] **Step 8: Commit**

```bash
git add src/state/stores/studySession.ts
git commit -m "refactor(srs): persist card progress to Dexie via computeSm2"
```

---

## Task 4: Review mode constant, config, and i18n

**Files:**

- Modify: `src/shared/constants/index.ts:117-157`
- Modify: `src/i18n/locales/en/study.json`
- Modify: `src/i18n/locales/es/study.json`

- [ ] **Step 1: Add the REVIEW mode and config**

In `src/shared/constants/index.ts`, change `STUDY_MODES`:

```ts
export const STUDY_MODES = {
    FLASHCARDS: 'flashcards',
    MULTIPLE_CHOICE: 'multiple-choice',
    MATCHING: 'matching',
    TYPE_WRITE: 'type-write',
    REVIEW: 'review',
} as const;
```

Add a `STUDY_MODE_CONFIG` entry after the `TYPE_WRITE` block (before the closing `};`):

```ts
  [STUDY_MODES.REVIEW]: {
    id: "review",
    title: "Review Due",
    description: "Study only the cards due today",
    icon: "Schedule",
    color: "#A78BFA",
    features: ["Spaced repetition", "Due cards only", "Optimized retention"],
  },
```

> `Schedule` is a valid `@mui/icons-material` export; it is registered in the icon map in Task 6.

- [ ] **Step 2: Add English strings**

In `src/i18n/locales/en/study.json`, add a `modes.review` object (mirroring the other modes) and a top-level `review` block. Inside `"modes"`, after `"typeWrite"`, add:

```json
        "review": {
            "title": "Review Due",
            "description": "Study only the cards due today",
            "features": {
                "spacedRepetition": "Spaced repetition",
                "dueCardsOnly": "Due cards only",
                "optimizedRetention": "Optimized retention"
            }
        }
```

At the top level of the file (sibling to `"ratings"`), add:

```json
    "review": {
        "due": "Review Due",
        "dueCount": "{{count}} card due",
        "dueCount_plural": "{{count}} cards due",
        "caughtUp": "All caught up!",
        "caughtUpSubtitle": "No cards are due for review right now.",
        "ratePrompt": "How well did you recall this?"
    },
```

- [ ] **Step 3: Add Spanish strings**

In `src/i18n/locales/es/study.json`, inside `"modes"` after `"typeWrite"`, add:

```json
        "review": {
            "title": "Repaso pendiente",
            "description": "Estudia solo las tarjetas pendientes de hoy",
            "features": {
                "spacedRepetition": "Repetición espaciada",
                "dueCardsOnly": "Solo tarjetas pendientes",
                "optimizedRetention": "Retención optimizada"
            }
        }
```

At the top level (sibling to `"ratings"`), add:

```json
    "review": {
        "due": "Repaso pendiente",
        "dueCount": "{{count}} tarjeta pendiente",
        "dueCount_plural": "{{count}} tarjetas pendientes",
        "caughtUp": "¡Todo al día!",
        "caughtUpSubtitle": "No hay tarjetas pendientes de repaso ahora mismo.",
        "ratePrompt": "¿Qué tan bien lo recordaste?"
    },
```

- [ ] **Step 4: Validate JSON + types**

Run: `vp check`
Expected: PASS (valid JSON, no type errors).

- [ ] **Step 5: Commit**

```bash
git add src/shared/constants/index.ts src/i18n/locales/en/study.json src/i18n/locales/es/study.json
git commit -m "feat(srs): add review study mode constant, config, and i18n"
```

---

## Task 5: Route the review mode

**Files:**

- Modify: `src/views/Study/StudyMode.tsx`

- [ ] **Step 1: Add the review case**

In `src/views/Study/StudyMode.tsx`, add a case before `default:`:

```tsx
        case STUDY_MODES.REVIEW:
            return <FlashcardsStudy studysetId={studysetId} reviewMode />;
```

(`FlashcardsStudy` is already imported. The `reviewMode` prop is added in Task 6.)

- [ ] **Step 2: Type-check**

Run: `vp check`
Expected: FAIL at this point — `Property 'reviewMode' does not exist`. This is expected; Task 6 adds the prop. Do NOT commit yet; proceed to Task 6 and commit them together.

---

## Task 6: FlashcardsStudy — reviewMode, grade buttons, due load, caught-up state

**Files:**

- Modify: `src/views/Study/FlashcardsStudy.tsx`

This is the core task. Add `reviewMode`, load due cards in review mode, replace the star `Rating` with four grade buttons showing projected intervals, add a caught-up empty state, and translate new strings.

- [ ] **Step 1: Update imports and props**

In `src/views/Study/FlashcardsStudy.tsx`:

Add to the MUI import (`@mui/material`): `Button`, `Stack`. Remove `Rating` (no longer used).

Add new imports below the existing ones:

```tsx
import { useTranslation } from 'react-i18next';
import { cardProgressRepository } from 'state/local/repositories';
import {
    newProgress,
    projectInterval,
    GRADE_QUALITY,
    type Grade,
} from 'shared/utilities/srs';
import type { CardProgress } from 'shared/types';
```

Change the `Props` type and component signature:

```tsx
type Props = {
  studysetId: string;
  reviewMode?: boolean;
};

const FlashcardsStudy = ({ studysetId, reviewMode = false }: Props) => {
  const { t } = useTranslation("study");
```

- [ ] **Step 2: Add state for due cards and current-card progress**

After the existing `useState` declarations (near `const lightboxCooldownRef = useRef(false);`), add:

```tsx
const [dueCardUUIDs, setDueCardUUIDs] = useState<string[] | null>(null);
const [cardProgress, setCardProgress] = useState<CardProgress | null>(null);
```

- [ ] **Step 3: Load due cards in review mode**

Add this effect after the existing session-init effect:

```tsx
// In review mode, resolve which cards are due before starting the session.
useEffect(() => {
    if (!reviewMode) {
        setDueCardUUIDs(null);
        return;
    }
    let cancelled = false;
    (async () => {
        const due = await cardProgressRepository.getDueForStudyset(studysetId);
        // getDueForStudyset already returns ascending by nextReview.
        if (!cancelled) setDueCardUUIDs(due.map((p) => p.cardUUID));
    })();
    return () => {
        cancelled = true;
    };
}, [reviewMode, studysetId]);
```

- [ ] **Step 4: Build the session from due cards when in review mode**

Replace the existing session-init effect body so the card list is filtered in review mode. Change:

```tsx
  // Initialize session
  useEffect(() => {
    if (studyset?.cards?.length > 0 && !activeSession) {
      startSession({
        studysetUUID: studysetId,
        mode: STUDY_MODES.FLASHCARDS,
        cards: studyset.cards,
        settings: {
```

to:

```tsx
  // Initialize session
  useEffect(() => {
    // In review mode, wait until due UUIDs have resolved.
    if (reviewMode && dueCardUUIDs === null) return;

    const sessionCards =
      reviewMode && dueCardUUIDs
        ? studyset.cards.filter((c) => dueCardUUIDs.includes(c.cardUUID))
        : studyset?.cards;

    if (sessionCards?.length > 0 && !activeSession) {
      startSession({
        studysetUUID: studysetId,
        mode: reviewMode ? STUDY_MODES.REVIEW : STUDY_MODES.FLASHCARDS,
        cards: sessionCards,
        settings: {
```

Also add `reviewMode` and `dueCardUUIDs` to that effect's dependency array (currently `[studyset?.cards, studysetId, activeSession]`):

```tsx
  }, [studyset?.cards, studysetId, activeSession, reviewMode, dueCardUUIDs]);
```

- [ ] **Step 5: Add the caught-up empty state**

Immediately before the existing loading guard (`if (isLoading || !activeSession ...)`), add:

```tsx
// Review mode with nothing due: show a caught-up state instead of a session.
if (reviewMode && dueCardUUIDs !== null && dueCardUUIDs.length === 0) {
    return (
        <BasePage
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                gap: '1rem',
            }}
        >
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {t('review.caughtUp')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                {t('review.caughtUpSubtitle')}
            </Typography>
        </BasePage>
    );
}
```

- [ ] **Step 6: Load the current card's progress when it flips**

Add an effect after `currentCard` is defined (after the `const isFirstCard = ...` line):

```tsx
// Load SM-2 progress for the current card so grade buttons can preview intervals.
useEffect(() => {
    let cancelled = false;
    (async () => {
        const existing = await cardProgressRepository.getByCard(
            currentCard.cardUUID
        );
        if (!cancelled) {
            setCardProgress(existing ?? newProgress(currentCard.cardUUID));
        }
    })();
    return () => {
        cancelled = true;
    };
}, [currentCard.cardUUID]);
```

- [ ] **Step 7: Replace handleRating with a grade handler**

Replace the existing `handleRating` function:

```tsx
  const handleRating = (quality: number) => {
    if (quality === 0 || hasRated) return;
    ...
  };
```

with:

```tsx
const handleGrade = (grade: Grade) => {
    if (hasRated) return;
    const quality = GRADE_QUALITY[grade];

    setHasRated(true);

    updateCardProgress(currentCard.cardUUID, quality);

    const isCorrect = quality >= 3;
    const timeSpent = Math.floor((Date.now() - activeSession.startTime) / 1000);
    recordAnswer({
        cardUUID: currentCard.cardUUID,
        correct: isCorrect,
        timeSpent,
        hintsUsed: 0,
    });

    if (isCorrect) {
        incrementScore(100);
        updateStreak(true);
    } else {
        updateStreak(false);
    }

    if (activeSession.settings.autoAdvance) {
        setTimeout(() => {
            handleNext();
        }, 500);
    }
};
```

- [ ] **Step 8: Helper to format projected intervals**

Add this near the other small helpers (e.g. after `playAudio`):

```tsx
const intervalLabel = (grade: Grade): string => {
    if (!cardProgress) return '';
    const days = projectInterval(cardProgress, grade);
    return days < 1 ? '<1d' : `${days}d`;
};

const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];
```

- [ ] **Step 9: Replace the star Rating block with grade buttons**

Replace the entire `{/* Rating Section */}` `<Fade>...</Fade>` block (currently FlashcardsStudy `:468-509`) with:

```tsx
{
    /* Grading Section */
}
<Fade in={showRating && !hasRated}>
    <Box
        sx={{
            p: '1.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            width: '100%',
            borderBottomLeftRadius: '1rem',
            borderBottomRightRadius: '1rem',
        }}
    >
        <Typography variant="body2" sx={{ mb: '0.75rem', textAlign: 'center' }}>
            {t('review.ratePrompt')}
        </Typography>
        <Stack direction="row" spacing="0.5rem" justifyContent="center">
            {GRADES.map((grade) => (
                <Button
                    key={grade}
                    variant="contained"
                    color={grade === 'again' ? 'error' : 'inherit'}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleGrade(grade);
                    }}
                    sx={{
                        flexDirection: 'column',
                        minWidth: '5rem',
                        textTransform: 'none',
                        lineHeight: 1.2,
                    }}
                >
                    <span>{t(`ratings.${grade}`)}</span>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                        {intervalLabel(grade)}
                    </Typography>
                </Button>
            ))}
        </Stack>
    </Box>
</Fade>;
```

- [ ] **Step 10: Reset current-card progress on navigation**

In `handleNext` and `handlePrevious` and `handleStudyAgain`, the `setCardProgress` reload is already handled by the Step 6 effect (keyed on `currentCard.cardUUID`). No change needed — verify by reading those handlers; they already reset `flipped`/`showRating`/`hasRated`.

- [ ] **Step 11: Type-check, lint, build**

Run: `vp check`
Expected: PASS (this also clears the Task 5 error since `reviewMode` now exists).

- [ ] **Step 12: Commit (Tasks 5 + 6 together)**

```bash
git add src/views/Study/StudyMode.tsx src/views/Study/FlashcardsStudy.tsx
git commit -m "feat(srs): review mode and Again/Hard/Good/Easy grading in flashcards"
```

---

## Task 7: Due-count hook and Review Due tile

**Files:**

- Create: `src/shared/hooks/useDueCount.ts`
- Modify: `src/views/ViewStudySet/StudyModesGrid/StudyModesGrid.tsx`

- [ ] **Step 1: Create the hook**

Create `src/shared/hooks/useDueCount.ts`:

```ts
import { useState, useEffect } from 'react';
import { cardProgressRepository } from 'state/local/repositories';

// Returns the number of cards currently due for review in a studyset.
export function useDueCount(studysetUUID: string): {
    count: number;
    isLoading: boolean;
} {
    const [count, setCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        (async () => {
            const due = await cardProgressRepository.getDueCount(studysetUUID);
            if (!cancelled) {
                setCount(due);
                setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [studysetUUID]);

    return { count, isLoading };
}
```

- [ ] **Step 2: Render the Review Due tile**

In `src/views/ViewStudySet/StudyModesGrid/StudyModesGrid.tsx`:

Add to the icon imports from `@mui/icons-material`: `Schedule`. Add `Schedule` to `ICON_MAP`:

```tsx
const ICON_MAP = {
    ViewCarousel,
    Quiz,
    Extension,
    Keyboard,
    Schedule,
};
```

Add `review: 'review'` to `MODE_TRANSLATION_KEYS`:

```tsx
const MODE_TRANSLATION_KEYS: Record<string, string> = {
    flashcards: 'flashcards',
    'multiple-choice': 'multipleChoice',
    matching: 'matching',
    'type-write': 'typeWrite',
    review: 'review',
};
```

Import the hook at the top:

```tsx
import { useDueCount } from 'shared/hooks/useDueCount';
```

`Object.values(STUDY_MODES)` now includes `review`, so the `review` tile renders automatically through the existing `.map`. To show the due count, add the hook call inside the component (top level, before `return`):

```tsx
const { count: dueCount } = useDueCount(studysetUUID);
```

Then, in the `.map` render, override the title for the review tile. Replace the `<StudyModeTitle>` line:

```tsx
<StudyModeTitle variant="subtitle1">
    {t(`modes.${translationKey}.title`)}
</StudyModeTitle>
```

with:

```tsx
<StudyModeTitle variant="subtitle1">
    {mode.id === 'review'
        ? t('review.dueCount', {
              count: dueCount,
          })
        : t(`modes.${translationKey}.title`)}
</StudyModeTitle>
```

(The tile navigates to `/study/:uuid/review` via the existing `handleModeClick(mode.id)`, since `mode.id === 'review'`.)

- [ ] **Step 3: Type-check, lint, build**

Run: `vp check && vp build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/hooks/useDueCount.ts src/views/ViewStudySet/StudyModesGrid/StudyModesGrid.tsx
git commit -m "feat(srs): surface Review Due tile with due count"
```

---

## Task 8: Manual verification

**Files:** none (manual run).

- [ ] **Step 1: Run the app**

Run: `vp dev`
Open the app, open a studyset.

- [ ] **Step 2: Verify the flow**

- ViewStudySet shows a "Review Due" tile (5th) with a due count (e.g. "0 cards due" on a fresh set).
- Open Flashcards (normal mode), flip a card → four buttons **Again / Hard / Good / Easy**, each with a projected interval (e.g. Good "1d"). Grade a few cards.
- Reopen ViewStudySet → the Review Due count reflects graded cards that are due.
- Click Review Due:
    - If cards are due → session loads only those cards.
    - If none due → "All caught up!" state.
- Reload the page → progress persists (Dexie). Confirm in DevTools → Application → IndexedDB → `quizaroni_v1` → `cardProgress`.

- [ ] **Step 3: Full check**

Run: `vp check && vp test`
Expected: PASS.

---

## Self-Review Notes

- **Spec coverage:** SM-2 pure module (T1) ✓; Dexie persistence + repo (T2) ✓; store rewire + migration (T2/T3) ✓; review mode entry (T4/T5/T6) ✓; grade buttons w/ interval preview (T6) ✓; due badge (T7) ✓; i18n en+es (T4) ✓; tests (T1) ✓. Backend sync, FSRS, global dashboard, non-flashcard modes are explicitly out of scope.
- **Deviation from spec:** repository unit test dropped (no jsdom/fake-indexeddb env); the pure due/sort logic in `srs.ts` is tested instead. Repo is thin glue over Dexie + tested helpers.
- **Type consistency:** `computeSm2(prev, quality)`, `projectInterval(prev, grade)`, `GRADE_QUALITY[grade]`, `cardProgressRepository.{getByCard,getDueForStudyset,getDueCount,upsert}`, `useDueCount(uuid) -> {count,isLoading}` used consistently across tasks.
