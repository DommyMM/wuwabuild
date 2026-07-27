'use client';

import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

interface CardScalerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Fixed design-space height. Omit when the captured content has a variable
   * height (profile cards append the substat summary row) and the scaler will
   * measure the design-space node instead.
   */
  designHeight?: number;
  designWidth: number;
  /** Applied to the design-space node itself — the one the ref points at. */
  contentClassName?: string;
}

export const CardScaler = forwardRef<HTMLDivElement, CardScalerProps>(({
  children,
  className = '',
  designHeight,
  designWidth,
  contentClassName = '',
}, ref) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(designWidth);
  const [measuredHeight, setMeasuredHeight] = useState(designHeight ?? 0);

  // The design-space node is what callers capture, so it has to be the ref target.
  useImperativeHandle(ref, () => contentRef.current as HTMLDivElement, []);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // Measure synchronously first: ResizeObserver's initial callback can land
    // after the first paint, which would flash a full-width card on narrow hosts.
    if (host.clientWidth > 0) setAvailableWidth(host.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? host.clientWidth;
      if (nextWidth > 0) {
        setAvailableWidth(nextWidth);
      }
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (designHeight !== undefined) return;
    const content = contentRef.current;
    if (!content) return;

    // offsetHeight is the untransformed layout height; getBoundingClientRect
    // would report the scaled one and feed itself.
    const measure = () => {
      const next = content.offsetHeight;
      if (next > 0) setMeasuredHeight(next);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [designHeight]);

  const contentHeight = designHeight ?? measuredHeight;
  const scale = Math.min(1, availableWidth / designWidth);
  const scaledWidth = Math.round(designWidth * scale);
  const scaledHeight = Math.round(contentHeight * scale);

  return (
    <div ref={hostRef} className={`min-w-0 ${className}`}>
      <div
        className="overflow-hidden"
        style={{ height: scaledHeight, width: scaledWidth }}
      >
        <div
          ref={contentRef}
          className={contentClassName}
          style={{
            height: designHeight,
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'top left',
            width: designWidth,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

CardScaler.displayName = 'CardScaler';
