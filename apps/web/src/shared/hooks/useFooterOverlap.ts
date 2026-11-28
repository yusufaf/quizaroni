import { useEffect } from 'react';

export const FOOTER_OVERLAP_VAR = '--footer-overlap';

/**
 * Publishes how many pixels of the site footer are scrolled into view as the
 * `--footer-overlap` CSS variable on the root element, so viewport-fixed side
 * panels can shorten themselves and stop above the footer.
 *
 * Writing a CSS variable instead of React state keeps scrolling from
 * re-rendering the panels.
 */
const useFooterOverlap = () => {
    useEffect(() => {
        const footer = document.querySelector('footer');
        if (!footer) return;

        const root = document.documentElement;
        let frame = 0;
        let lastOverlap = -1;

        const update = () => {
            frame = 0;
            const overlap = Math.max(
                0,
                Math.round(
                    window.innerHeight - footer.getBoundingClientRect().top
                )
            );
            if (overlap === lastOverlap) return;
            lastOverlap = overlap;
            root.style.setProperty(FOOTER_OVERLAP_VAR, `${overlap}px`);
        };

        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        // Content above the footer can grow or shrink without a scroll event
        // (an accordion opening, cards loading), which moves the footer.
        const resizeObserver = new ResizeObserver(schedule);
        resizeObserver.observe(document.body);

        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            resizeObserver.disconnect();
            if (frame) cancelAnimationFrame(frame);
            root.style.removeProperty(FOOTER_OVERLAP_VAR);
        };
    }, []);
};

export default useFooterOverlap;
