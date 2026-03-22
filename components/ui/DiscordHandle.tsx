'use client';

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DiscordHandleProps {
    // When provided, shows this text as the trigger and @dommymm in the tooltip.
    // When omitted, shows @dommymm as the visible text with a "copy username" tooltip.
    label?: string;
}

export function DiscordHandle({ label }: DiscordHandleProps) {
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const ref = useRef<HTMLSpanElement>(null);

    const hasLabel = !!label;

    function handleMouseEnter() {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setPos({ top: rect.top + window.scrollY, left: rect.left + rect.width / 2 });
        }
        setVisible(true);
    }

    function handleMouseLeave() {
        setVisible(false);
        setCopied(false);
    }

    function handleClick() {
        navigator.clipboard.writeText('dommymm').then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        });
    }

    const tooltipText = hasLabel
        ? '@dommymm'
        : copied ? 'copied!' : 'copy username';

    return (
        <span
            ref={ref}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className="cursor-pointer font-plus-jakarta text-xs font-semibold lowercase tracking-[0.06em] text-accent transition-colors hover:text-accent-hover"
        >
            {label ?? '@dommymm'}
            {visible && createPortal(
                <span
                    style={{ position: 'absolute', top: pos.top - 8, left: pos.left, transform: 'translate(-50%, -100%)', zIndex: 9999 }}
                    className="pointer-events-none whitespace-nowrap rounded-md border border-accent/30 bg-background-secondary px-2 py-1 font-plus-jakarta text-xs font-semibold lowercase tracking-[0.06em] shadow-lg"
                >
                    <span className={!hasLabel && copied ? 'text-aero' : 'text-accent'}>
                        {tooltipText}
                    </span>
                </span>,
                document.body
            )}
        </span>
    );
}
