# Spaced Repetition Wire-Up — Design

**Issue:** #7 — Feature: Advanced Spaced Repetition (SRS) Algorithms
**Date:** 2026-05-30
**Scope:** Frontend only (`quizaroni/`). No CDK/backend changes.

## Problem

SRS is ~30% scaffolded but delivers no user value:

- SM-2 algorithm exists inline in `state/stores/studySession.ts` (`updateCardProgress`).
- `CardProgress` type and a Dexie `cardProgress` table (with `nextReview` index) exist.
- `getNextReviewCards` is defined but **never called** — nothing studies by due date.
- Progress persists to **localStorage** (zustand `persist`), not the Dexie table; the table is unused.
- Grading UI is a generic 1–5 star `Rating`, not the issue's "Again/Hard/Good/Easy".

## Decisions

1. **Algorithm:** Keep SM-2. Do not adopt FSRS. Focus on wiring the gaps.
2. **Review entry:** Per-studyset "Review Due" mode (not a global cross-set dashboard).
3. **Persistence:** Dexie `cardProgress` table, **local only**. No backend sync this issue (per-device progress).
4. **Mode wiring:** Flashcards only feeds SRS. MC/Typewrite/Matching unchanged.
5. **Grading UI:** Replace stars with Again / Hard / Good / Easy buttons.

## Architecture

### 1. SRS core (pure function)

New `src/shared/utilities/srs.ts`:

```ts
export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADE_QUALITY: Record<Grade, number> = {
    again: 1,
    hard: 3,
    good: 4,
    easy: 5,
};
// Pure. Moves the math currently inline in studySession.ts:152-211.
export function computeSm2(prev: CardProgress, quality: number): CardProgress;
// Helper for UI interval preview (no persistence side effects):
export function projectInterval(prev: CardProgress, grade: Grade): number;
```

SM-2 rules preserved exactly: pass = quality ≥ 3; ease factor floor 1.3; fail resets
repetitions to 0 and interval to 1; intervals 1 → 6 → round(interval × ease); mastery
thresholds (new/learning/review/mastered) unchanged.

### 2. Persistence (Dexie repository)

New `src/state/local/repositories/CardProgressRepository.ts`, matching the existing
`StudysetRepository`/`UserRepository` pattern:

- `upsert(progress, studysetUUID)` — write-through, sets `_syncStatus: 'pending'`, `_lastModified`.
- `getByCard(cardUUID)`
- `getDueForStudyset(studysetUUID, now)` — due = `nextReview <= now`, sorted asc.
- `getAllForStudyset(studysetUUID)`
- `getDueCount(studysetUUID, now)`

`db.ts`: bump `DB_VERSION` 1 → 2, add compound index `[studysetUUID+nextReview]` to the
`cardProgress` store for the due query. (`LocalCardProgress` already carries `studysetUUID`.)

`studySession.ts`: `updateCardProgress` delegates the math to `computeSm2`, then persists via
the repository instead of the zustand Map/localStorage. Drop `cardProgress` from the zustand
`partialize`/`merge` (live session stats stay in zustand). `getNextReviewCards` removed from the
store (superseded by the repository).

One-time migration: on app init, if legacy `study-session-storage` localStorage has
`cardProgress` entries and the Dexie table is empty, import them, then clear the legacy key.

### 3. Review Due mode

- `src/shared/constants/index.ts`: add `STUDY_MODES.REVIEW = 'review'` and a `STUDY_MODE_CONFIG`
  entry (title "Review Due", icon, color).
- `views/Study/StudyMode.tsx`: `case STUDY_MODES.REVIEW: return <FlashcardsStudy studysetId reviewMode />`.
- `views/Study/FlashcardsStudy.tsx`: add `reviewMode?: boolean` prop.
    - `reviewMode` on: load due cards via `getDueForStudyset(studysetId, now)` sorted by
      `nextReview` asc. If none due, render "All caught up 🎉" empty state instead of the session.
    - `reviewMode` off: current behavior (all cards).

### 4. Grading UI

Replace the 1–5 star `Rating` (FlashcardsStudy ~line 494) with four labeled buttons
(Again / Hard / Good / Easy). Each shows the projected next interval via `projectInterval`
(e.g. "3d"). Buttons map to `GRADE_QUALITY` → existing `updateCardProgress(cardUUID, quality)`,
which now write-throughs to Dexie. Used in both normal and review mode.

### 5. Due badge

New hook `src/shared/hooks/useDueCount.ts` (or alongside existing study hooks): reads
`getDueCount` for a studyset, returns `{ count, isLoading }`.
`views/ViewStudySet/StudyModesGrid/StudyModesGrid.tsx`: render a highlighted "Review Due (N)"
card (5th tile) that navigates to `/study/:uuid/review`. When N = 0, show a "caught up" state.

### 6. i18n

Add keys to `src/i18n/locales/{en,es}/common.json` and the `study` namespace:
grading labels (again/hard/good/easy), Review mode title/description, due count, caught-up text.
No hardcoded user-facing strings.

### 7. Tests (Vitest)

- `srs.test.ts`: `computeSm2` — first-pass interval = 1, second = 6, ease floor 1.3, fail
  resets repetitions/interval, mastery thresholds; `projectInterval` matches `computeSm2`.
- `CardProgressRepository.test.ts`: `getDueForStudyset` filters by `nextReview <= now` and
  scopes by `studysetUUID`; `upsert` is idempotent per `cardUUID`.

## Files

**New**

- `src/shared/utilities/srs.ts`
- `src/state/local/repositories/CardProgressRepository.ts`
- `src/shared/hooks/useDueCount.ts`
- `src/shared/utilities/srs.test.ts`
- `src/state/local/repositories/CardProgressRepository.test.ts`

**Edit**

- `src/state/local/db.ts` — v2, compound index
- `src/state/stores/studySession.ts` — delegate to `computeSm2`, persist via repo, drop localStorage cardProgress
- `src/shared/constants/index.ts` — `REVIEW` mode + config
- `src/views/Study/StudyMode.tsx` — review route case
- `src/views/Study/FlashcardsStudy.tsx` — `reviewMode` prop, due-card load, grading buttons, empty state
- `src/views/ViewStudySet/StudyModesGrid/StudyModesGrid.tsx` — Review Due tile
- `src/i18n/locales/en/common.json`, `src/i18n/locales/es/common.json`

## Out of scope

- FSRS algorithm.
- Backend/CDK sync of card progress across devices (syncQueue still `studyset|user` only).
- Global cross-studyset review dashboard.
- SRS in MC/Typewrite/Matching modes.
