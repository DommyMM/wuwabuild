'use client';

import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type TooltipPlacement = 'right' | 'left' | 'top' | 'bottom';

interface TooltipPosition {
  top: number;
  left: number;
}

interface TooltipVisualOverflow {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

interface HoverTooltipProps {
  content: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
  placement?: TooltipPlacement;
  strictPlacement?: boolean;
  offset?: number;
  disabled?: boolean;
  tooltipClassName?: string;
  triggerClassName?: string;
  maxRisePx?: number;
  pinViewportBottom?: boolean;
  // Optional node rendered as a sibling of the panel, outside its overflow-hidden box.
  // Use this for decorations that should visually "hang" off the panel (e.g. an entity icon
  // protruding top-left). Absolute positioning is up to the caller.
  leadingNode?: ReactNode;
  visualOverflow?: TooltipVisualOverflow;
}

type TooltipTriggerProps = React.HTMLAttributes<HTMLElement> & {
  disabled?: boolean;
  href?: string;
  type?: string;
};

const VIEWPORT_PADDING = 8;

const NATIVE_FOCUSABLE_ELEMENTS = new Set([
  'button',
  'select',
  'textarea',
  'summary',
]);

const isFocusableTrigger = (element: React.ReactElement<TooltipTriggerProps>): boolean => {
  const { contentEditable, disabled, href, tabIndex, type } = element.props;
  if (disabled || (typeof tabIndex === 'number' && tabIndex < 0)) return false;
  if (typeof tabIndex === 'number') return true;
  if (contentEditable === true || contentEditable === 'true') return true;

  if (typeof element.type !== 'string') return Boolean(href);
  if ((element.type === 'a' || element.type === 'area') && href) return true;
  if (element.type === 'input') return type !== 'hidden';
  return NATIVE_FOCUSABLE_ELEMENTS.has(element.type);
};

const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const getUsableViewportTop = (): number => {
  const nav = document.querySelector('nav');
  if (!nav) return VIEWPORT_PADDING;

  const style = window.getComputedStyle(nav);
  if (style.position !== 'sticky' && style.position !== 'fixed') return VIEWPORT_PADDING;

  const rect = nav.getBoundingClientRect();
  if (rect.top > VIEWPORT_PADDING || rect.bottom <= VIEWPORT_PADDING) return VIEWPORT_PADDING;

  return Math.max(VIEWPORT_PADDING, rect.bottom + VIEWPORT_PADDING);
};

const getCandidateOrder = (placement: TooltipPlacement): TooltipPlacement[] => {
  if (placement === 'right') return ['right', 'left', 'top', 'bottom'];
  if (placement === 'left') return ['left', 'right', 'top', 'bottom'];
  if (placement === 'top') return ['top', 'bottom', 'right', 'left'];
  return ['bottom', 'top', 'right', 'left'];
};

const normalizeOverflow = (overflow?: TooltipVisualOverflow): Required<TooltipVisualOverflow> => ({
  top: Math.max(0, overflow?.top ?? 0),
  right: Math.max(0, overflow?.right ?? 0),
  bottom: Math.max(0, overflow?.bottom ?? 0),
  left: Math.max(0, overflow?.left ?? 0),
});

const isInsideViewport = (
  position: TooltipPosition,
  tooltipRect: DOMRect,
  overflow: Required<TooltipVisualOverflow>,
  usableTop: number
): boolean => {
  const left = position.left - overflow.left;
  const top = position.top - overflow.top;
  const right = position.left + tooltipRect.width + overflow.right;
  const bottom = position.top + tooltipRect.height + overflow.bottom;
  return (
    left >= VIEWPORT_PADDING &&
    top >= usableTop &&
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

export function HoverTooltip({
  content,
  children,
  ariaLabel,
  placement = 'right',
  strictPlacement = false,
  offset = 10,
  disabled = false,
  tooltipClassName = '',
  triggerClassName = '',
  maxRisePx,
  pinViewportBottom = false,
  leadingNode,
  visualOverflow,
}: HoverTooltipProps) {
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pointerInsideRef = useRef(false);
  const focusWithinRef = useRef(false);
  const suppressPointerFocusRef = useRef(false);
  const suppressFocusFrameRef = useRef<number | null>(null);
  const positionFrameRef = useRef<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 });
  const [showBottomArrow, setShowBottomArrow] = useState(false);
  const tooltipId = useId();

  const hasContent = useMemo(() => {
    if (content === null || content === undefined) return false;
    if (typeof content === 'string') return content.trim().length > 0;
    return true;
  }, [content]);

  const shouldShow = !disabled && hasContent;

  const handlePointerEnter = useCallback(() => {
    pointerInsideRef.current = true;
    setIsOpen(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    pointerInsideRef.current = false;
    if (!focusWithinRef.current) setIsOpen(false);
  }, []);

  const handleFocusCapture = useCallback(() => {
    if (suppressPointerFocusRef.current) {
      focusWithinRef.current = false;
      return;
    }

    focusWithinRef.current = true;
    setIsOpen(true);
  }, []);

  const handlePointerDownCapture = useCallback(() => {
    // A pointer selection may move focus to the trigger. Suppress that synthetic
    // focus-open for one frame so click/tap always dismisses; keyboard focus
    // continues to open the tooltip through handleFocusCapture.
    suppressPointerFocusRef.current = true;
    focusWithinRef.current = false;
    setIsOpen(false);
    if (suppressFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(suppressFocusFrameRef.current);
    }
    suppressFocusFrameRef.current = window.requestAnimationFrame(() => {
      suppressPointerFocusRef.current = false;
      suppressFocusFrameRef.current = null;
    });
  }, []);

  const handleBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;

    focusWithinRef.current = false;
    if (!pointerInsideRef.current) setIsOpen(false);
  }, []);

  const updateScrollHint = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) {
      setShowBottomArrow(false);
      return;
    }

    const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    const isOverflowing = maxScrollTop > 1;
    const canScrollDown = scrollEl.scrollTop < maxScrollTop - 1;

    setShowBottomArrow(isOverflowing && canScrollDown);
  }, []);

  const updatePosition = useCallback(() => {
    const triggerEl = triggerRef.current;
    const tooltipEl = tooltipRef.current;
    if (!triggerEl || !tooltipEl) return;

    const triggerRect = triggerEl.getBoundingClientRect();
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const overflow = normalizeOverflow(visualOverflow);
    const usableTop = getUsableViewportTop();

    let resolved = getPositionForPlacement(triggerRect, tooltipRect, placement, offset);

    if (!strictPlacement) {
      const candidates = getCandidateOrder(placement);
      for (const candidate of candidates) {
        const next = getPositionForPlacement(triggerRect, tooltipRect, candidate, offset);
        if (isInsideViewport(next, tooltipRect, overflow, usableTop)) {
          resolved = next;
          break;
        }
      }
    }

    const minLeft = VIEWPORT_PADDING + overflow.left;
    const minTop = usableTop + overflow.top;
    const maxLeft = Math.max(minLeft, window.innerWidth - tooltipRect.width - overflow.right - VIEWPORT_PADDING);
    const maxTop = Math.max(minTop, window.innerHeight - tooltipRect.height - overflow.bottom - VIEWPORT_PADDING);

    let nextTop = clamp(resolved.top, minTop, maxTop);
    if (pinViewportBottom) {
      nextTop = window.innerHeight - VIEWPORT_PADDING - tooltipRect.height - overflow.bottom;
      nextTop = clamp(nextTop, minTop, maxTop);
    }
    if (typeof maxRisePx === 'number' && Number.isFinite(maxRisePx) && maxRisePx >= 0) {
      const minTopFromTrigger = triggerRect.top - maxRisePx;
      nextTop = Math.max(nextTop, minTopFromTrigger);
      nextTop = clamp(nextTop, minTop, maxTop);
    }

    setPosition({
      left: clamp(resolved.left, minLeft, maxLeft),
      top: nextTop,
    });
  }, [maxRisePx, offset, pinViewportBottom, placement, strictPlacement, visualOverflow]);

  const schedulePositionUpdate = useCallback(() => {
    if (positionFrameRef.current !== null) return;
    positionFrameRef.current = window.requestAnimationFrame(() => {
      positionFrameRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition, content]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;

      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
    };

    window.addEventListener('resize', schedulePositionUpdate);
    window.addEventListener('scroll', schedulePositionUpdate, true);
    window.addEventListener('keydown', handleEscape, true);

    return () => {
      window.removeEventListener('resize', schedulePositionUpdate);
      window.removeEventListener('scroll', schedulePositionUpdate, true);
      window.removeEventListener('keydown', handleEscape, true);
      if (positionFrameRef.current !== null) {
        window.cancelAnimationFrame(positionFrameRef.current);
        positionFrameRef.current = null;
      }
    };
  }, [isOpen, schedulePositionUpdate]);

  useEffect(() => () => {
    if (suppressFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(suppressFocusFrameRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      updateScrollHint();
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateScrollHint();
    });
    resizeObserver.observe(scrollEl);

    const frame = window.requestAnimationFrame(() => {
      updateScrollHint();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      scrollEl.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [isOpen, updateScrollHint, content]);

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
      updateScrollHint();
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel as EventListener);
    };
  }, [isOpen, updateScrollHint]);

  const triggerElement = React.isValidElement<TooltipTriggerProps>(children)
    && children.type !== React.Fragment
    ? children
    : null;
  const usesHiddenInput = triggerElement?.type === 'input' && triggerElement.props.type === 'hidden';
  const hasNegativeTabIndex = typeof triggerElement?.props.tabIndex === 'number'
    && triggerElement.props.tabIndex < 0;
  const canAttachToChild = Boolean(
    triggerElement
    && !triggerElement.props.disabled
    && triggerElement.props['aria-hidden'] !== true
    && triggerElement.props['aria-hidden'] !== 'true'
    && !hasNegativeTabIndex
    && !usesHiddenInput
    && (
      typeof triggerElement.type === 'string'
      || typeof triggerElement.props.tabIndex === 'number'
      || Boolean(triggerElement.props.href)
    )
  );
  const shouldFocusWrapper = !canAttachToChild;
  const triggerDescribedBy = isOpen
    ? [triggerElement?.props['aria-describedby'], tooltipId].filter(Boolean).join(' ')
    : triggerElement?.props['aria-describedby'];
  const triggerNode = triggerElement && canAttachToChild
    ? React.cloneElement(triggerElement, {
      'aria-describedby': triggerDescribedBy,
      tabIndex: isFocusableTrigger(triggerElement) ? triggerElement.props.tabIndex : 0,
    })
    : children;

  if (!shouldShow) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={`${triggerClassName || 'inline-flex'} [touch-action:manipulation]`}
        tabIndex={shouldFocusWrapper ? 0 : undefined}
        aria-label={shouldFocusWrapper
          ? ariaLabel ?? triggerElement?.props['aria-label'] ?? (typeof children === 'string' ? children : undefined)
          : undefined}
        aria-labelledby={shouldFocusWrapper ? triggerElement?.props['aria-labelledby'] : undefined}
        aria-describedby={shouldFocusWrapper && isOpen ? tooltipId : undefined}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDownCapture={handlePointerDownCapture}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        {triggerNode}
      </div>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          style={{ top: position.top, left: position.left, pointerEvents: 'none' }}
          className="pointer-events-none fixed z-60"
        >
          <div
            className={`relative max-h-[90vh] max-w-xl overflow-hidden rounded-2xl border border-amber-200/30 bg-[linear-gradient(160deg,rgba(255,255,255,0.11)_0%,rgba(255,255,255,0.05)_25%,rgba(10,10,10,0.92)_100%)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-md ${tooltipClassName}`}
          >
            <div
              ref={scrollRef}
              className="max-h-[calc(90vh-48px)] overflow-x-hidden overflow-y-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
            >
              {content}
            </div>
            {showBottomArrow && (
              <>
                <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-10 bg-linear-to-t from-black/58 to-transparent" />
                <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-sm leading-none font-semibold text-white/74">
                  ⌄
                </span>
              </>
            )}
          </div>
          {leadingNode}
        </div>,
        document.body
      )}
    </>
  );
}
