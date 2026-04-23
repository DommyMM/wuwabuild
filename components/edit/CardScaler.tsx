'use client';

import React, { forwardRef, useLayoutEffect, useRef, useState } from 'react';

interface CardScalerProps {
  children: React.ReactNode;
  className?: string;
  designHeight: number;
  designWidth: number;
}

export const CardScaler = forwardRef<HTMLDivElement, CardScalerProps>(({
  children,
  className = '',
  designHeight,
  designWidth,
}, ref) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(designWidth);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width ?? host.clientWidth;
      if (nextWidth > 0) {
        setAvailableWidth(nextWidth);
      }
    });

    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(1, availableWidth / designWidth);
  const scaledWidth = Math.round(designWidth * scale);
  const scaledHeight = Math.round(designHeight * scale);

  return (
    <div ref={hostRef} className={`min-w-0 ${className}`}>
      <div
        className="overflow-hidden"
        style={{ height: scaledHeight, width: scaledWidth }}
      >
        <div
          ref={ref}
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
