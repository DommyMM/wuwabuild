'use client';

import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';

interface MobileCardViewportProps {
  children: ReactNode;
  designWidth?: number;
  aspectRatio?: number;
  className?: string;
}

export const MobileCardViewport: React.FC<MobileCardViewportProps> = ({
  children,
  designWidth = 1440,
  aspectRatio = 2.4,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => setContainerWidth(el.clientWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = useMemo(() => {
    if (containerWidth <= 0) return 1;
    return Math.min(1, containerWidth / designWidth);
  }, [containerWidth, designWidth]);

  const scaledHeight = useMemo(() => {
    return (designWidth / aspectRatio) * scale;
  }, [aspectRatio, designWidth, scale]);

  return (
    <div ref={containerRef} className={`w-full overflow-hidden ${className}`}>
      <div className="relative w-full" style={{ height: scaledHeight }}>
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: designWidth, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
