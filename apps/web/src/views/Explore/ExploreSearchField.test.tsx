// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { createLightTheme } from 'shared/theme/themes';
import ExploreSearchField from './ExploreSearchField';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// Shows the router's path and search, and steps back through its history.
const LocationProbe = () => {
    const { pathname, search } = useLocation();
    const navigate = useNavigate();
    return (
        <>
            <span data-testid="location">{`${pathname}${search}`}</span>
            <button type="button" onClick={() => void navigate(-1)}>
                probe-back
            </button>
        </>
    );
};

const renderField = (entries = ['/explore'], index = entries.length - 1) =>
    render(
        <ThemeProvider theme={createLightTheme()}>
            <MemoryRouter initialEntries={entries} initialIndex={index}>
                <ExploreSearchField />
                <LocationProbe />
            </MemoryRouter>
        </ThemeProvider>
    );

const box = () =>
    screen.getByRole('searchbox', { name: 'search.label' }) as HTMLInputElement;
const location = () => screen.getByTestId('location').textContent;
const type = (value: string) => fireEvent.change(box(), { target: { value } });
const advance = (ms: number) =>
    act(() => {
        vi.advanceTimersByTime(ms);
    });
const flush = () => advance(300);
const back = () => fireEvent.click(screen.getByText('probe-back'));
const clear = () =>
    fireEvent.click(screen.getByRole('button', { name: 'search.clear' }));

describe('ExploreSearchField (#137)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('is a labelled searchbox inside a search landmark that / can focus', () => {
        renderField();
        expect(screen.getByRole('search').contains(box())).toBe(true);
        expect(box().getAttribute('data-shortcut-search')).toBe('true');
    });

    it('fills from ?q=', () => {
        renderField(['/explore?q=biolog%C3%ADa']);
        expect(box().value).toBe('biología');
    });

    it('writes ?q= once, 300ms after the last keystroke', () => {
        renderField();
        type('b');
        advance(100);
        type('bi');
        advance(100);
        type('bio');
        advance(299);
        expect(location()).toBe('/explore');
        advance(1);
        expect(location()).toBe('/explore?q=bio');
    });

    it('keeps the subject', () => {
        renderField(['/explore?subject=law']);
        type('bio');
        flush();
        expect(location()).toBe('/explore?subject=law&q=bio');
    });

    it('commits on Enter without waiting', () => {
        renderField();
        type('bio');
        fireEvent.keyDown(box(), { key: 'Enter' });
        expect(location()).toBe('/explore?q=bio');
    });

    // Clicking a subject chip blurs the field first, so the search lands
    // before the chip's change instead of after it as a second push.
    it('commits on blur without waiting', () => {
        renderField();
        type('bio');
        fireEvent.blur(box());
        expect(location()).toBe('/explore?q=bio');
    });

    it('pushes when a search starts and replaces while refining', () => {
        renderField();
        type('bio');
        flush();
        type('biol');
        flush();
        expect(location()).toBe('/explore?q=biol');

        back();
        expect(location()).toBe('/explore');
        expect(box().value).toBe('');
    });

    it('follows Back to an earlier query', () => {
        renderField(['/explore?q=chem', '/explore']);
        type('bio');
        flush();

        back();
        expect(box().value).toBe('');
        back();
        expect(location()).toBe('/explore?q=chem');
        expect(box().value).toBe('chem');
    });

    it('clears q at once and keeps focus in the field', () => {
        renderField();
        type('bio');
        flush();
        clear();
        expect(location()).toBe('/explore');
        expect(box().value).toBe('');
        expect(document.activeElement).toBe(box());
    });

    it('removes q for a whitespace-only draft', () => {
        renderField();
        type('bio');
        flush();
        type('   ');
        flush();
        expect(location()).toBe('/explore');
    });

    it('steps back when clearing a search it started, instead of adding a duplicate entry', () => {
        renderField(['/home', '/explore']);
        type('bio');
        flush();
        clear();
        expect(location()).toBe('/explore');

        back();
        expect(location()).toBe('/home');
    });

    it('still steps back after the search was refined', () => {
        renderField(['/home', '/explore']);
        type('bio');
        flush();
        type('biol');
        flush();
        clear();
        expect(location()).toBe('/explore');

        back();
        expect(location()).toBe('/home');
    });

    it('replaces when clearing a search that arrived by link', () => {
        renderField(['/home', '/explore?q=bio']);
        expect(box().value).toBe('bio');
        clear();
        expect(location()).toBe('/explore');

        back();
        expect(location()).toBe('/home');
    });
});
