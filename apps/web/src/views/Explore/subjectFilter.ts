import type { SubjectId } from '@quizaroni/shared-types';
import { QUERY_PARAMS } from 'shared/constants';
import { toSubjectId } from './communityFeed';

// Same width as the chip row's fade and scroll-padding (2rem).
export const REVEAL_PAD_PX = 32;

// An absent or empty param is All. Anything else that isn't a current id
// (retired, unknown, wrong case) is read as other, as stored sets are (#123).
// The URL itself is left as it is.
export const parseSubjectParam = (value: string | null): SubjectId | null =>
    value ? toSubjectId(value) : null;

// A copy, so other params (a future q) survive and `prev` isn't mutated.
export const withSubject = (
    prev: URLSearchParams,
    subject: SubjectId | null
): URLSearchParams => {
    const next = new URLSearchParams(prev);
    if (subject) next.set(QUERY_PARAMS.EXPLORE_SUBJECT, subject);
    else next.delete(QUERY_PARAMS.EXPLORE_SUBJECT);
    return next;
};

// Which sides of the chip row have more chips to scroll to. The 1px
// tolerance absorbs subpixel widths. LTR only.
export const scrollEdges = ({
    scrollLeft,
    scrollWidth,
    clientWidth,
}: {
    scrollLeft: number;
    scrollWidth: number;
    clientWidth: number;
}): { start: boolean; end: boolean } => ({
    start: scrollLeft > 1,
    end: scrollLeft + clientWidth < scrollWidth - 1,
});

/**
 * The scrollLeft that brings a chip clear of the fades, or null when it
 * already is. A chip wider than the view aligns its start. An overshoot past
 * the maximum scroll is clamped by the browser.
 */
export const revealScrollLeft = (
    view: { scrollLeft: number; clientWidth: number },
    chip: { offsetLeft: number; offsetWidth: number },
    pad = REVEAL_PAD_PX
): number | null => {
    const left = chip.offsetLeft - pad;
    const right = chip.offsetLeft + chip.offsetWidth + pad - view.clientWidth;
    if (chip.offsetLeft < view.scrollLeft + pad) return Math.max(0, left);
    if (
        chip.offsetLeft + chip.offsetWidth >
        view.scrollLeft + view.clientWidth - pad
    )
        return Math.min(left, right);
    return null;
};
