import { describe, it, expect } from 'vite-plus/test';
import {
    parseSubjectParam,
    revealScrollLeft,
    scrollEdges,
    withSubject,
} from './subjectFilter';

describe('parseSubjectParam', () => {
    it('reads a current subject id', () => {
        expect(parseSubjectParam('math')).toBe('math');
        expect(parseSubjectParam('other')).toBe('other');
    });

    it('reads a missing or empty param as All', () => {
        expect(parseSubjectParam(null)).toBeNull();
        expect(parseSubjectParam('')).toBeNull();
    });

    it('reads a retired or unknown id as other', () => {
        expect(parseSubjectParam('astrology')).toBe('other');
        expect(parseSubjectParam('Math')).toBe('other');
    });
});

describe('withSubject', () => {
    it('sets the subject and keeps other params', () => {
        expect(withSubject(new URLSearchParams('q=x'), 'law').toString()).toBe(
            'q=x&subject=law'
        );
    });

    it('removes the subject for All', () => {
        expect(
            withSubject(new URLSearchParams('subject=law&q=x'), null).toString()
        ).toBe('q=x');
    });

    it('leaves the input untouched', () => {
        const prev = new URLSearchParams('subject=law');
        withSubject(prev, 'math');
        expect(prev.toString()).toBe('subject=law');
    });
});

describe('scrollEdges', () => {
    const edges = (scrollLeft: number, scrollWidth = 600, clientWidth = 300) =>
        scrollEdges({ scrollLeft, scrollWidth, clientWidth });

    it('fades nothing when the row fits', () => {
        expect(edges(0, 300)).toEqual({ start: false, end: false });
    });

    it('treats subpixel slack as fitting', () => {
        expect(edges(0, 300.5)).toEqual({ start: false, end: false });
    });

    it('fades the side that has more chips', () => {
        expect(edges(0)).toEqual({ start: false, end: true });
        expect(edges(150)).toEqual({ start: true, end: true });
        expect(edges(300)).toEqual({ start: true, end: false });
    });
});

describe('revealScrollLeft', () => {
    const view = (scrollLeft: number) => ({ scrollLeft, clientWidth: 300 });
    const chip = (offsetLeft: number, offsetWidth = 80) => ({
        offsetLeft,
        offsetWidth,
    });

    it('leaves a chip that is already clear of the fades', () => {
        expect(revealScrollLeft(view(0), chip(100))).toBeNull();
    });

    it('scrolls forward to a chip past the end', () => {
        expect(revealScrollLeft(view(0), chip(500))).toBe(312);
    });

    it('scrolls back to a chip before the start', () => {
        expect(revealScrollLeft(view(200), chip(40))).toBe(8);
    });

    it('never scrolls below 0', () => {
        expect(revealScrollLeft(view(50), chip(10))).toBe(0);
    });

    it('aligns the start of a chip wider than the view', () => {
        expect(revealScrollLeft(view(0), chip(400, 400))).toBe(368);
    });
});
