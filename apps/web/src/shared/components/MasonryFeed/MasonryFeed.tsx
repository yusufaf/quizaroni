import styled from '@emotion/styled';
import {
    MutableRefObject,
    ReactNode,
    Ref,
    useCallback,
    useLayoutEffect,
    useRef,
} from 'react';
import { computeRowSpan, countGridColumns } from './computeRowSpan';
import {
    MASONRY_COLUMN_GAP,
    MASONRY_GRID_COLUMNS,
    MASONRY_ROW_UNIT_PX,
} from './masonryLayout';

// No `grid-auto-rows` here: it stays `auto` (plain grid flow) until a flush
// switches it to the row unit together with the spans. No `dense` and no
// `order`, so DOM order (and tab order) always matches data order.
const FeedList = styled('ul')({
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'grid',
    gridTemplateColumns: MASONRY_GRID_COLUMNS,
    columnGap: MASONRY_COLUMN_GAP,
    rowGap: 0,
});

const FeedItem = styled('li')({
    alignSelf: 'start',
    minWidth: 0,
});

// The vertical gap lives inside the measured box, so row-gap stays 0 and the
// 8px row unit leaves less than 8px of slack under a card.
const FeedItemInner = styled('div')({
    paddingBottom: '1.5rem',
});

type MasonryFeedProps<T> = {
    items: readonly T[];
    getKey: (item: T) => string;
    renderItem: (item: T, index: number) => ReactNode;
    busy?: boolean;
    'aria-labelledby'?: string;
    listRef?: Ref<HTMLUListElement>;
};

/**
 * CSS-grid masonry: each card spans as many small implicit rows as its height
 * needs, measured with one shared ResizeObserver. The observer callback only
 * marks cards dirty; all reads and writes happen in one animation-frame flush,
 * because writing spans inside the callback resizes the observed list in the
 * same frame and raises "ResizeObserver loop completed with undelivered
 * notifications". At one column, or without ResizeObserver, it is a plain list.
 */
const MasonryFeed = <T,>({
    items,
    getKey,
    renderItem,
    busy = false,
    'aria-labelledby': ariaLabelledBy,
    listRef,
}: MasonryFeedProps<T>) => {
    const ulRef = useRef<HTMLUListElement | null>(null);
    const roRef = useRef<ResizeObserver | null>(null);
    const wrappersRef = useRef(new Map<string, HTMLDivElement>());
    const refCallbacksRef = useRef(
        new Map<string, (el: HTMLDivElement | null) => void>()
    );
    const measuredRef = useRef(new WeakSet<HTMLElement>());
    const dirtyRef = useRef(new Set<HTMLElement>());
    const frameRef = useRef<number | null>(null);
    const lastWidthRef = useRef<number | null>(null);
    // A ref, not state: the row unit and the spans must change in the same
    // frame, or the grid paints once half-switched.
    const masonryRef = useRef(false);

    const flush = useCallback((targets: Iterable<HTMLElement>) => {
        const ul = ulRef.current;
        if (!ul) return;

        const style = getComputedStyle(ul);
        if (countGridColumns(style.gridTemplateColumns) <= 1) {
            ul.style.gridAutoRows = '';
            wrappersRef.current.forEach((wrapper) => {
                if (wrapper.parentElement)
                    wrapper.parentElement.style.gridRowEnd = '';
            });
            masonryRef.current = false;
            measuredRef.current = new WeakSet();
            return;
        }

        const rowGap = parseFloat(style.rowGap) || 0;
        // Switching on: every card needs a span, or it would sit on 8px rows.
        const toMeasure = masonryRef.current
            ? Array.from(targets).filter((wrapper) => wrapper.isConnected)
            : Array.from(wrappersRef.current.values());
        const heights = toMeasure.map(
            (wrapper) => wrapper.getBoundingClientRect().height
        );

        ul.style.gridAutoRows = `${MASONRY_ROW_UNIT_PX}px`;
        toMeasure.forEach((wrapper, i) => {
            const li = wrapper.parentElement;
            if (!li) return;
            const span = computeRowSpan({
                height: heights[i] ?? 0,
                rowUnit: MASONRY_ROW_UNIT_PX,
                rowGap,
            });
            li.style.gridRowEnd = `span ${span}`;
            measuredRef.current.add(wrapper);
        });
        masonryRef.current = true;
    }, []);

    // Child refs attach before this effect runs, so it observes every wrapper
    // already registered; StrictMode's re-run re-observes them all.
    useLayoutEffect(() => {
        const ul = ulRef.current;
        if (!ul || typeof ResizeObserver === 'undefined') return;
        const dirty = dirtyRef.current;

        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target === ul) {
                    // Height-only changes come from our own span writes and
                    // appends; only a width change reflows every card.
                    const width = entry.contentRect.width;
                    if (width !== lastWidthRef.current) {
                        lastWidthRef.current = width;
                        wrappersRef.current.forEach((wrapper) =>
                            dirty.add(wrapper)
                        );
                    }
                } else {
                    dirty.add(entry.target as HTMLElement);
                }
            }
            if (dirty.size === 0 || frameRef.current !== null) return;
            frameRef.current = requestAnimationFrame(() => {
                frameRef.current = null;
                const targets = Array.from(dirty);
                dirty.clear();
                flush(targets);
            });
        });
        roRef.current = ro;
        ro.observe(ul);
        wrappersRef.current.forEach((wrapper) => ro.observe(wrapper));

        return () => {
            ro.disconnect();
            roRef.current = null;
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
            dirty.clear();
        };
    }, [flush]);

    // A newly mounted card gets its span before paint instead of overlapping
    // for a frame.
    useLayoutEffect(() => {
        if (!roRef.current) return;
        const fresh = Array.from(wrappersRef.current.values()).filter(
            (wrapper) => !measuredRef.current.has(wrapper)
        );
        if (fresh.length > 0) flush(fresh);
    }, [items, flush]);

    // One stable callback per key: an inline ref would be detached and
    // re-attached on every render, re-observing (and re-measuring) every card.
    const getWrapperRef = (key: string) => {
        let callback = refCallbacksRef.current.get(key);
        if (!callback) {
            callback = (el: HTMLDivElement | null) => {
                if (el) {
                    wrappersRef.current.set(key, el);
                    roRef.current?.observe(el);
                    return;
                }
                const previous = wrappersRef.current.get(key);
                if (previous) {
                    roRef.current?.unobserve(previous);
                    dirtyRef.current.delete(previous);
                }
                wrappersRef.current.delete(key);
                refCallbacksRef.current.delete(key);
            };
            refCallbacksRef.current.set(key, callback);
        }
        return callback;
    };

    const setListRef = useCallback(
        (el: HTMLUListElement | null) => {
            ulRef.current = el;
            if (typeof listRef === 'function') listRef(el);
            else if (listRef)
                (listRef as MutableRefObject<HTMLUListElement | null>).current =
                    el;
        },
        [listRef]
    );

    return (
        <FeedList
            ref={setListRef}
            // WebKit drops list semantics from a `list-style: none` list.
            role="list"
            aria-busy={busy ? 'true' : 'false'}
            aria-labelledby={ariaLabelledBy}
        >
            {items.map((item, index) => {
                const key = getKey(item);
                return (
                    <FeedItem key={key} data-masonry-item="">
                        <FeedItemInner ref={getWrapperRef(key)}>
                            {renderItem(item, index)}
                        </FeedItemInner>
                    </FeedItem>
                );
            })}
        </FeedList>
    );
};

export default MasonryFeed;
