'use client';

import { useCallback, useRef } from 'react';

// Publishes a table scroll container's visible width as `--scrollport` on the
// element, inherited by the expansion rows inside it.
//
// Expansion rows keep their full design-space layout (capping them to the
// scrollport crushes a 5-column echo grid into itself), so on a narrow viewport
// they are reached by the table's own horizontal scroll. What the var is for is
// the section controls: they size to `--scrollport` so they sit over the
// visible area at rest instead of centering half a screen into the row. It is
// inert when the table fits, where the cap is wider than the row.
//
// They do not follow the scroll. `position: sticky` cannot: the rows sit under
// two `overflow: clip` ancestors (the row shell, which clips the expand
// animation, and the table body, which clips its rounded corner), and sticky
// does not track the table's scroller through them — it silently applies the
// width cap and never moves. Driving a transform from `scrollLeft` instead does
// work, but writing a style on every scroll event makes the drag feel laggy.
//
// Measured and floored to a whole pixel rather than `100cqw`: container-query
// units can resolve a fraction wider than the real content box at fractional
// zoom/DPI, and a box even 1px wider than the wrapper forces 1px of horizontal
// scroll that clips the content's right edge.
export function useScrollportVar(): (node: HTMLElement | null) => void {
  const observerRef = useRef<ResizeObserver | null>(null);

  return useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    // The containers carry no horizontal border/padding, so the border-box
    // rect width is the scrollport width.
    const apply = () => {
      node.style.setProperty('--scrollport', `${Math.floor(node.getBoundingClientRect().width)}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    observerRef.current = observer;
  }, []);
}
