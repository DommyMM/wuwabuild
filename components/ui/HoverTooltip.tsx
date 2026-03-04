'use client';

import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type TooltipPlacement = 'right' | 'left' | 'top' | 'bottom';

interface TooltipPosition {
  top: number;
  left: number;
}

interface HoverTooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  offset?: number;
  disabled?: boolean;
  maxWidthClassName?: string;
  tooltipClassName?: string;
  maxRisePx?: number;
  pinViewportBottom?: boolean;
}

const VIEWPORT_PADDING = 8;
const DEFAULT_MAX_WIDTH_CLASS = 'max-w-96';

const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const getCandidateOrder = (placement: TooltipPlacement): TooltipPlacement[] => {
  if (placement === 'right') return ['right', 'left', 'top', 'bottom'];
  if (placement === 'left') return ['left', 'right', 'top', 'bottom'];
  if (placement === 'top') return ['top', 'bottom', 'right', 'left'];
  return ['bottom', 'top', 'right', 'left'];
};

const isInsideViewport = (position: TooltipPosition, tooltipRect: DOMRect): boolean => {
  const right = position.left + tooltipRect.width;
  const bottom = position.top + tooltipRect.height;
  return (
    position.left >= VIEWPORT_PADDING &&
    position.top >= VIEWPORT_PADDING &&
    right <= window.innerWidth - VIEWPORT_PADDING &&
    bottom <= window.innerHeight - VIEWPORT_PADDING
  );
};

const getPositionForPlacement = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  placement: TooltipPlacement,
  offset: number
): TooltipPosition => {
  if (placement === 'left') {
    return {
      top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
      left: triggerRect.left - tooltipRect.width - offset,
    };
  }
  if (placement === 'top') {
    return {
      top: triggerRect.top - tooltipRect.height - offset,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
    };
  }
  if (placement === 'bottom') {
    return {
      top: triggerRect.bottom + offset,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
    };
  }

  return {
    top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
    left: triggerRect.right + offset,
  };
};

export const HoverTooltip: React.FC<HoverTooltipProps> = ({
  content,
  children,
  placement = 'right',
  offset = 10,
  disabled = false,
  maxWidthClassName = DEFAULT_MAX_WIDTH_CLASS,
  tooltipClassName = '',
  maxRisePx,
  pinViewportBottom = false,
}) => {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });

  const hasContent = useMemo(() => {
    if (content === null || content === undefined) return false;
    if (typeof content === 'string') return content.trim().length > 0;
    return true;
  }, [content]);

  const shouldShow = !disabled && hasContent;

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();

    const candidates = getCandidateOrder(placement);
    let resolved = getPositionForPlacement(triggerRect, tooltipRect, placement, offset);

    for (const candidate of candidates) {
      const next = getPositionForPlacement(triggerRect, tooltipRect, candidate, offset);
      if (isInsideViewport(next, tooltipRect)) {
        resolved = next;
        break;
      }
    }

    const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - tooltipRect.width - VIEWPORT_PADDING);
    const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - tooltipRect.height - VIEWPORT_PADDING);

    let nextTop = clamp(resolved.top, VIEWPORT_PADDING, maxTop);
    if (pinViewportBottom) {
      nextTop = window.innerHeight - VIEWPORT_PADDING - tooltipRect.height;
      nextTop = clamp(nextTop, VIEWPORT_PADDING, maxTop);
    }
    if (typeof maxRisePx === 'number' && Number.isFinite(maxRisePx) && maxRisePx >= 0) {
      const minTopFromTrigger = triggerRect.top - maxRisePx;
      nextTop = Math.max(nextTop, minTopFromTrigger);
      nextTop = clamp(nextTop, VIEWPORT_PADDING, maxTop);
    }

    setPosition({
      left: clamp(resolved.left, VIEWPORT_PADDING, maxLeft),
      top: nextTop,
    });
  }, [maxRisePx, offset, pinViewportBottom, placement]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition, content]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    const handleViewportChange = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleWheel = (event: WheelEvent) => {
      const triggerEl = triggerRef.current;
      const scrollEl = scrollRef.current;
      if (!triggerEl || !scrollEl) return;

      const target = event.target as Node | null;
      if (!target || !triggerEl.contains(target)) return;

      const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
      if (maxScrollTop <= 0) return;

      event.preventDefault();
      const next = clamp(scrollEl.scrollTop + event.deltaY, 0, maxScrollTop);
      scrollEl.scrollTop = next;
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel as EventListener);
    };
  }, [isOpen]);

  if (!shouldShow) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {children}
      </div>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={tooltipRef}
          style={{ top: position.top, left: position.left, pointerEvents: 'none' }}
          className={`pointer-events-none fixed z-45 max-h-[min(90vh,900px)] overflow-hidden rounded-2xl border border-amber-200/30 bg-[linear-gradient(160deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.05)_25%,rgba(10,10,10,0.92)_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md ${maxWidthClassName} ${tooltipClassName}`}
          aria-hidden="true"
        >
          <div
            ref={scrollRef}
            className="max-h-[min(90vh,900px)] overflow-y-auto p-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
          >
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
