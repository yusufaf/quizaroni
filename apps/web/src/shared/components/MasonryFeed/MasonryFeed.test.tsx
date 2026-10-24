// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { act, render } from '@testing-library/react';
import { StrictMode } from 'react';
import MasonryFeed from './MasonryFeed';

// jsdom has no ResizeObserver; this stub records what is observed and lets a
// test deliver entries by hand.
class StubResizeObserver {
    static instances: StubResizeObserver[] = [];
    targets = new Set<Element>();
    observeCalls = 0;
    unobserveCalls = 0;
    disconnected = false;
    constructor(private callback: ResizeObserverCallback) {
        StubResizeObserver.instances.push(this);
    }
    observe(target: Element) {
        this.observeCalls += 1;
        this.targets.add(target);
    }
    unobserve(target: Element) {
        this.unobserveCalls += 1;
        this.targets.delete(target);
    }
    disconnect() {
        this.disconnected = true;
        this.targets.clear();
    }
    trigger(entries: Partial<ResizeObserverEntry>[]) {
        this.callback(
            entries as ResizeObserverEntry[],
            this as unknown as ResizeObserver
        );
    }
}

const live = () => StubResizeObserver.instances.at(-1)!;

let frames: FrameRequestCallback[];
const runFrames = () =>
    act(() => {
        const queued = frames;
        frames = [];
        queued.forEach((cb) => cb(0));
    });

let columns: string;
let wrapperHeight: number;

type Item = { id: string };
const makeItems = (...ids: string[]): Item[] => ids.map((id) => ({ id }));

const Feed = ({ items, busy = false }: { items: Item[]; busy?: boolean }) => (
    <MasonryFeed
        items={items}
        getKey={(item) => item.id}
        renderItem={(item) => <span>{item.id}</span>}
        busy={busy}
    />
);

const lis = (container: HTMLElement) =>
    Array.from(
        container.querySelectorAll<HTMLLIElement>('[data-masonry-item]')
    );
const wrappers = (container: HTMLElement) =>
    lis(container).map((li) => li.firstElementChild as HTMLElement);
const list = (container: HTMLElement) => container.querySelector('ul')!;

beforeEach(() => {
    StubResizeObserver.instances = [];
    frames = [];
    columns = '300px 300px';
    wrapperHeight = 100;
    vi.stubGlobal('ResizeObserver', StubResizeObserver);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        frames.push(cb);
        return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const realGetComputedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) =>
        el.tagName === 'UL'
            ? ({
                  gridTemplateColumns: columns,
                  rowGap: '0px',
              } as CSSStyleDeclaration)
            : realGetComputedStyle(el)
    );
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
        () => ({ height: wrapperHeight, width: 300 }) as DOMRect
    );
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('MasonryFeed', () => {
    it('keeps DOM order equal to data order, including after appending', () => {
        const { container, rerender } = render(
            <Feed items={makeItems('a', 'b', 'c')} />
        );
        expect(lis(container).map((li) => li.textContent)).toEqual([
            'a',
            'b',
            'c',
        ]);
        rerender(<Feed items={makeItems('a', 'b', 'c', 'd', 'e')} />);
        expect(lis(container).map((li) => li.textContent)).toEqual([
            'a',
            'b',
            'c',
            'd',
            'e',
        ]);
    });

    it('spans cards before paint, and re-spans a resized card on the next frame', () => {
        const { container } = render(<Feed items={makeItems('a', 'b')} />);
        expect(list(container).style.gridAutoRows).toBe('8px');
        expect(lis(container).map((li) => li.style.gridRowEnd)).toEqual([
            'span 13',
            'span 13',
        ]);

        wrapperHeight = 200;
        live().trigger([{ target: wrappers(container)[0] }]);
        expect(lis(container)[0]?.style.gridRowEnd).toBe('span 13');
        runFrames();
        expect(lis(container)[0]?.style.gridRowEnd).toBe('span 25');
        expect(lis(container)[1]?.style.gridRowEnd).toBe('span 13');
    });

    it('does not measure at one column and clears rows and spans together', () => {
        const { container } = render(<Feed items={makeItems('a', 'b')} />);
        expect(lis(container)[0]?.style.gridRowEnd).toBe('span 13');

        columns = '300px';
        live().trigger([
            {
                target: list(container),
                contentRect: { width: 300 } as DOMRectReadOnly,
            },
        ]);
        runFrames();
        expect(list(container).style.gridAutoRows).toBe('');
        expect(lis(container).map((li) => li.style.gridRowEnd)).toEqual([
            '',
            '',
        ]);
    });

    it('renders plainly without ResizeObserver', () => {
        vi.stubGlobal('ResizeObserver', undefined);
        const { container } = render(<Feed items={makeItems('a', 'b')} />);
        expect(lis(container)).toHaveLength(2);
        expect(list(container).style.gridAutoRows).toBe('');
        expect(lis(container).map((li) => li.style.gridRowEnd)).toEqual([
            '',
            '',
        ]);
    });

    it('disconnects on unmount', () => {
        const { unmount } = render(<Feed items={makeItems('a')} />);
        const ro = live();
        unmount();
        expect(ro.disconnected).toBe(true);
    });

    it('observes the list and every card from the first render on', () => {
        const { container, rerender } = render(
            <Feed items={makeItems('a', 'b')} />
        );
        const ro = live();
        expect(ro.targets).toEqual(
            new Set([list(container), ...wrappers(container)])
        );

        rerender(<Feed items={makeItems('a', 'b', 'c')} />);
        expect(ro.targets).toEqual(
            new Set([list(container), ...wrappers(container)])
        );
        expect(lis(container)[2]?.style.gridRowEnd).toBe('span 13');

        const before = {
            observe: ro.observeCalls,
            unobserve: ro.unobserveCalls,
        };
        rerender(<Feed items={makeItems('a', 'b', 'c')} busy />);
        expect({
            observe: ro.observeCalls,
            unobserve: ro.unobserveCalls,
        }).toEqual(before);
    });

    it('re-observes everything under StrictMode', () => {
        const { container } = render(
            <StrictMode>
                <Feed items={makeItems('a', 'b')} />
            </StrictMode>
        );
        expect(live().disconnected).toBe(false);
        expect(live().targets).toEqual(
            new Set([list(container), ...wrappers(container)])
        );
    });

    it('re-measures every card only when the list width changes', () => {
        const { container } = render(<Feed items={makeItems('a', 'b')} />);
        const ul = list(container);
        live().trigger([
            { target: ul, contentRect: { width: 600 } as DOMRectReadOnly },
        ]);
        expect(frames).toHaveLength(1);
        runFrames();

        live().trigger([
            { target: ul, contentRect: { width: 600 } as DOMRectReadOnly },
        ]);
        expect(frames).toHaveLength(0);

        wrapperHeight = 40;
        live().trigger([
            { target: ul, contentRect: { width: 700 } as DOMRectReadOnly },
        ]);
        expect(frames).toHaveLength(1);
        runFrames();
        expect(lis(container).map((li) => li.style.gridRowEnd)).toEqual([
            'span 5',
            'span 5',
        ]);
    });

    it('marks the list busy', () => {
        const { container, rerender } = render(<Feed items={makeItems('a')} />);
        expect(list(container).getAttribute('aria-busy')).toBe('false');
        rerender(<Feed items={makeItems('a')} busy />);
        expect(list(container).getAttribute('aria-busy')).toBe('true');
    });
});
