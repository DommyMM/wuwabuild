'use client';

import { useCallback, useRef } from 'react';

// Publishes a table scroll container's visible width as `--scrollport` on the
// element (inherited by the expansion rows inside it, which pin their content
// to `w-[var(--scrollport,100%)]` + `sticky left-0` so an expanded card can
// neither widen the w-max wrapper nor get clipped by horizontal scroll).
//
// Measured and floored to a whole pixel rather than `100cqw`: container-query
// units can resolve a fraction wider than the real content box at fractional
// zoom/DPI, and a pinned box even 1px wider than the wrapper forces 1px of
// horizontal scroll that clips the card's right edge.
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
