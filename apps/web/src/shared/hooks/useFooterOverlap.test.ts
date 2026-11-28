// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { renderHook } from '@testing-library/react';
import useFooterOverlap, { FOOTER_OVERLAP_VAR } from './useFooterOverlap';

const readOverlap = () =>
    document.documentElement.style.getPropertyValue(FOOTER_OVERLAP_VAR);

describe('useFooterOverlap', () => {
    let footer: HTMLElement;
    let footerTop: number;

    beforeEach(() => {
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                disconnect() {}
            }
        );
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            cb(0);
            return 1;
        });
        vi.stubGlobal('innerHeight', 800);
        footer = document.createElement('footer');
        footer.getBoundingClientRect = () => ({ top: footerTop }) as DOMRect;
        document.body.appendChild(footer);
    });

    afterEach(() => {
        footer.remove();
        vi.unstubAllGlobals();
    });

    it('is zero while the footer is below the viewport', () => {
        footerTop = 1200;
        renderHook(() => useFooterOverlap());
        expect(readOverlap()).toBe('0px');
    });

    it('tracks the visible footer height as the page scrolls', () => {
        footerTop = 1200;
        renderHook(() => useFooterOverlap());

        footerTop = 710;
        window.dispatchEvent(new Event('scroll'));
        expect(readOverlap()).toBe('90px');
    });

    it('picks up a footer that mounts after the hook', () => {
        footer.remove();
        footerTop = 750;
        renderHook(() => useFooterOverlap());
        expect(readOverlap()).toBe('0px');

        document.body.appendChild(footer);
        window.dispatchEvent(new Event('resize'));
        expect(readOverlap()).toBe('50px');
    });

    it('removes the variable on unmount', () => {
        footerTop = 700;
        const { unmount } = renderHook(() => useFooterOverlap());
        expect(readOverlap()).toBe('100px');

        unmount();
        expect(readOverlap()).toBe('');
    });
});
