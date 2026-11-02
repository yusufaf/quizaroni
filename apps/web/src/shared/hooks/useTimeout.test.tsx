// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { act, renderHook } from '@testing-library/react';
import useTimeout from './useTimeout';

describe('useTimeout', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs the callback once after the delay', () => {
        const fn = vi.fn();
        const { result } = renderHook(() => useTimeout());

        act(() => {
            result.current.schedule(fn, 500);
        });
        act(() => {
            vi.advanceTimersByTime(499);
        });
        expect(fn).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('does not run the callback after unmount', () => {
        const fn = vi.fn();
        const { result, unmount } = renderHook(() => useTimeout());

        act(() => {
            result.current.schedule(fn, 500);
        });
        unmount();
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(fn).not.toHaveBeenCalled();
    });

    it('replaces a pending timeout when scheduled again', () => {
        const a = vi.fn();
        const b = vi.fn();
        const { result } = renderHook(() => useTimeout());

        act(() => {
            result.current.schedule(a, 500);
            result.current.schedule(b, 500);
        });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(a).not.toHaveBeenCalled();
        expect(b).toHaveBeenCalledTimes(1);
    });

    it('clear cancels the pending timeout', () => {
        const fn = vi.fn();
        const { result } = renderHook(() => useTimeout());

        act(() => {
            result.current.schedule(fn, 500);
            result.current.clear();
        });
        act(() => {
            vi.advanceTimersByTime(500);
        });

        expect(fn).not.toHaveBeenCalled();
    });

    it('keeps the same functions across renders', () => {
        const { result, rerender } = renderHook(() => useTimeout());
        const first = result.current;

        rerender();

        expect(result.current.schedule).toBe(first.schedule);
        expect(result.current.clear).toBe(first.clear);
    });
});
