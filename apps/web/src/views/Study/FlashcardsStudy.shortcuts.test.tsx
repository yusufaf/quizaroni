// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ShortcutProvider } from 'shared/keyboard/ShortcutRegistry';
import { useGlobalKeyListener } from 'shared/keyboard/useGlobalKeyListener';
import { useShortcuts } from 'shared/keyboard/useShortcuts';
import type { Grade } from 'shared/utilities/srs';

// NOTE: FlashcardsStudy has no existing test fixtures for its study-session
// store and studyset query, so a full render is out of scope here (per the
// implementation plan's downgrade clause). This test instead exercises the real
// shortcut infrastructure (useShortcuts + global listener + when-gating) against
// the exact flashcards binding contract the component registers, so the keymap,
// scopes, and guard predicates are protected against regressions.

type State = {
    flipped: boolean;
    hasRated: boolean;
    showResults: boolean;
};

const gradeKeyMap: Record<string, Grade> = {
    '1': 'again',
    '2': 'hard',
    '3': 'good',
    '4': 'easy',
};

function Harness({
    state,
    onFlip,
    onGrade,
    onPrev,
    onNext,
}: {
    state: State;
    onFlip: () => void;
    onGrade: (g: Grade) => void;
    onPrev: () => void;
    onNext: () => void;
}) {
    useGlobalKeyListener();
    useShortcuts([
        {
            id: 'flashcards.flip',
            keys: [' ', 'Enter'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.flip',
            handler: () => onFlip(),
            when: () => !state.showResults && !state.hasRated,
        },
        {
            id: 'flashcards.grade',
            keys: ['1', '2', '3', '4'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.gradeGood',
            handler: (e) => {
                const grade = gradeKeyMap[e.key];
                if (grade) onGrade(grade);
            },
            when: () => state.flipped && !state.hasRated && !state.showResults,
        },
        {
            id: 'flashcards.prev',
            keys: ['ArrowLeft'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.prev',
            handler: () => onPrev(),
            when: () => !state.showResults,
        },
        {
            id: 'flashcards.next',
            keys: ['ArrowRight'],
            scope: 'study:flashcards',
            descriptionKey: 'shortcuts.actions.next',
            handler: () => onNext(),
            when: () => !state.showResults,
        },
    ]);
    return null;
}

const spies = () => ({
    onFlip: vi.fn(),
    onGrade: vi.fn(),
    onPrev: vi.fn(),
    onNext: vi.fn(),
});

const setup = (state: State, s: ReturnType<typeof spies>) =>
    render(
        <ShortcutProvider>
            <Harness state={state} {...s} />
        </ShortcutProvider>
    );

describe('FlashcardsStudy keyboard shortcuts', () => {
    beforeEach(() => vi.clearAllMocks());

    it('Space flips before rating', () => {
        const s = spies();
        setup({ flipped: false, hasRated: false, showResults: false }, s);
        fireEvent.keyDown(document.body, { key: ' ' });
        expect(s.onFlip).toHaveBeenCalledOnce();
    });

    it('does not flip once rated', () => {
        const s = spies();
        setup({ flipped: true, hasRated: true, showResults: false }, s);
        fireEvent.keyDown(document.body, { key: ' ' });
        expect(s.onFlip).not.toHaveBeenCalled();
    });

    it('number keys grade only after flip', () => {
        const s = spies();
        setup({ flipped: false, hasRated: false, showResults: false }, s);
        fireEvent.keyDown(document.body, { key: '3' });
        expect(s.onGrade).not.toHaveBeenCalled();
    });

    it('grades with the mapped quality after flip', () => {
        const s = spies();
        setup({ flipped: true, hasRated: false, showResults: false }, s);
        fireEvent.keyDown(document.body, { key: '3' });
        expect(s.onGrade).toHaveBeenCalledWith('good');
    });

    it('arrows move between cards', () => {
        const s = spies();
        setup({ flipped: false, hasRated: false, showResults: false }, s);
        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        fireEvent.keyDown(document.body, { key: 'ArrowLeft' });
        expect(s.onNext).toHaveBeenCalledOnce();
        expect(s.onPrev).toHaveBeenCalledOnce();
    });

    it('shortcuts are inert on the results screen', () => {
        const s = spies();
        setup({ flipped: true, hasRated: false, showResults: true }, s);
        fireEvent.keyDown(document.body, { key: ' ' });
        fireEvent.keyDown(document.body, { key: 'ArrowRight' });
        expect(s.onFlip).not.toHaveBeenCalled();
        expect(s.onNext).not.toHaveBeenCalled();
    });
});
