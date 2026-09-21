'use client';

import { useCallback, useRef } from 'react';

/**
 * Publishes a table scroll container's visible width as `--scrollport`, inherited by the expansion rows inside it
 *
 * - For the section controls, which size to it so they rest over the visible area instead of centring half a screen in
 * - Expansion rows keep their full design-space layout, since capping them crushes a 5-column echo grid into itself
 */
export function useScrollportVar(): (node: HTMLElement | null) => void {
  const observerRef = useRef<ResizeObserver | null>(null);

  return useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;

    // The containers carry no horizontal border or padding, so the border-box rect width is the scrollport width
    // Floored rather than `100cqw`, which can land a fraction wider at fractional zoom and force 1px of scroll
    const apply = () => {
      node.style.setProperty('--scrollport', `${Math.floor(node.getBoundingClientRect().width)}px`);
    };
    apply();
    // Tracks size, not scroll, since sticky cannot see the table's scroller through two `overflow: clip` ancestors
    // Transform off `scrollLeft` also works but writes a style every scroll event, so the drag feels laggy
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    observerRef.current = observer;
  }, []);
}
