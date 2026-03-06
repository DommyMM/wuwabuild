'use client';

import React, { useEffect, useRef, useState } from 'react';
import Marquee from 'react-fast-marquee';

interface OverflowMarqueeProps {
    text: string;
    textClassName?: string;
    speed?: number;
    startOverflowPx?: number;
    stopOverflowPx?: number;
}

// Scroll text only when it overflows the available width.
export const OverflowMarquee: React.FC<OverflowMarqueeProps> = ({
    text,
    textClassName = '',
    speed = 20,
    startOverflowPx = 8,
    stopOverflowPx = 3,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLSpanElement>(null);
    const [scrolls, setScrolls] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        const measure = measureRef.current;
        if (!container || !measure) return;

        let rafId: number | null = null;

        const check = () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }

            rafId = requestAnimationFrame(() => {
                const overflowPx = measure.getBoundingClientRect().width - container.getBoundingClientRect().width;
                setScrolls((prev) => (
                    prev
                        ? overflowPx > stopOverflowPx
                        : overflowPx > startOverflowPx
                ));
            });
        };

        check();
        const ro = new ResizeObserver(check);
        ro.observe(container);
        ro.observe(measure);
        return () => {
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
            }
            ro.disconnect();
        };
    }, [startOverflowPx, stopOverflowPx, text]);

    return (
        <div ref={containerRef} className="relative min-w-0 overflow-hidden">
            <span
                ref={measureRef}
                className={`pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap ${textClassName}`}
                aria-hidden="true"
            >
                {text}
            </span>
            {scrolls ? (
                <Marquee speed={speed} gradient={false} pauseOnHover>
                    <span className={`whitespace-nowrap pr-6 ${textClassName}`}>{text}</span>
                </Marquee>
            ) : (
                <span className={`block whitespace-nowrap ${textClassName}`}>{text}</span>
            )}
        </div>
    );
};
