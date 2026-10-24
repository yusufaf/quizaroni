// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vite-plus/test';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { SUBJECT_IDS } from '@quizaroni/shared-types';
import type { SubjectId } from '@quizaroni/shared-types';
import { createLightTheme } from 'shared/theme/themes';
import SubjectChips from './SubjectChips';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const renderChips = (
    value: SubjectId | null = null,
    onChange = vi.fn<(subject: SubjectId | null) => void>()
) => {
    const view = render(
        <ThemeProvider theme={createLightTheme()}>
            <SubjectChips value={value} onChange={onChange} />
        </ThemeProvider>
    );
    const rerender = (next: SubjectId | null) =>
        view.rerender(
            <ThemeProvider theme={createLightTheme()}>
                <SubjectChips value={next} onChange={onChange} />
            </ThemeProvider>
        );
    return { ...view, onChange, rerender };
};

const group = () =>
    screen.getByRole('group', { name: 'community.subjectFilter' });
const chip = (name: string) => within(group()).getByRole('button', { name });
const pressed = () =>
    within(group())
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-pressed') === 'true')
        .map((b) => b.textContent);

const define = (el: HTMLElement, props: Record<string, number>) => {
    for (const [key, value] of Object.entries(props)) {
        Object.defineProperty(el, key, {
            value,
            writable: true,
            configurable: true,
        });
    }
};

const allStyles = () =>
    Array.from(document.querySelectorAll('style'))
        .map(
            (style) =>
                style.textContent ||
                Array.from(style.sheet?.cssRules ?? [])
                    .map((rule) => rule.cssText)
                    .join('')
        )
        .join('');

const escapeRegExp = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('SubjectChips', () => {
    it('renders All then every subject, in order, in a named group', () => {
        renderChips();
        expect(
            within(group())
                .getAllByRole('button')
                .map((b) => b.textContent)
        ).toEqual([
            'community.allSubjects',
            ...SUBJECT_IDS.map((id) => `common:subjects.${id}`),
        ]);
    });

    it('presses exactly the selected chip', () => {
        const { rerender } = renderChips();
        expect(pressed()).toEqual(['community.allSubjects']);
        rerender('math');
        expect(pressed()).toEqual(['common:subjects.math']);
    });

    it('reports a new selection, and ignores the pressed chip', () => {
        const { onChange } = renderChips('math');
        fireEvent.click(chip('common:subjects.science'));
        expect(onChange).toHaveBeenLastCalledWith('science');
        fireEvent.click(chip('community.allSubjects'));
        expect(onChange).toHaveBeenLastCalledWith(null);
        onChange.mockClear();
        fireEvent.click(chip('common:subjects.math'));
        expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps every chip a plain button in the tab order', () => {
        renderChips();
        for (const button of within(group()).getAllByRole('button')) {
            expect(button.tagName).toBe('BUTTON');
            expect(button.getAttribute('type')).toBe('button');
            expect(button.hasAttribute('tabindex')).toBe(false);
        }
    });

    it('fades the side that has more chips', () => {
        renderChips();
        const el = group();
        define(el, { scrollWidth: 600, clientWidth: 300, scrollLeft: 0 });
        fireEvent.scroll(el);
        expect(el.getAttribute('data-fade-start')).toBe('false');
        expect(el.getAttribute('data-fade-end')).toBe('true');

        el.scrollLeft = 300;
        fireEvent.scroll(el);
        expect(el.getAttribute('data-fade-start')).toBe('true');
        expect(el.getAttribute('data-fade-end')).toBe('false');
    });

    it('rechecks the fade when the chips resize, not only the row', () => {
        const observed: Element[] = [];
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe(target: Element) {
                    observed.push(target);
                }
                disconnect() {}
            }
        );
        try {
            renderChips();
            expect(observed).toContain(group());
            for (const button of within(group()).getAllByRole('button')) {
                expect(observed).toContain(button);
            }
        } finally {
            vi.unstubAllGlobals();
        }
    });

    it('turns off the chip transition for reduced motion', () => {
        renderChips();
        const cls = Array.from(chip('common:subjects.math').classList).find(
            (c) => c.startsWith('css-')
        );
        expect(cls).toBeTruthy();
        expect(allStyles()).toMatch(
            new RegExp(
                `@media \\(prefers-reduced-motion: ?reduce\\) ?\\{[^@]*\\.${escapeRegExp(cls!)} ?\\{[^}]*transition: ?none`
            )
        );
    });

    it('scrolls a newly pressed chip into view, and leaves a visible one', () => {
        const { rerender } = renderChips();
        const el = group();
        define(el, { clientWidth: 300, scrollLeft: 0 });
        define(chip('common:subjects.history'), {
            offsetLeft: 500,
            offsetWidth: 80,
        });
        rerender('history');
        expect(el.scrollLeft).toBe(312);

        define(chip('common:subjects.math'), {
            offsetLeft: 360,
            offsetWidth: 60,
        });
        rerender('math');
        expect(el.scrollLeft).toBe(312);
    });
});
