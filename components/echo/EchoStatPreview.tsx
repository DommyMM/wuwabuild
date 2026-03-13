import React from 'react';
import { OverflowMarquee } from '@/components/ui/OverflowMarquee';

export function formatStatValue(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1).replace(/\.0$/, '');
}

export interface EchoStatSubStat {
    type?: string | null;
    value?: number | string | null;
}

export interface EchoStatPreviewProps {
    icon?: string | null;
    name?: string;
    level?: number;
    cv?: number;
    setIcon?: string | null;
    mainStat?: {
        type?: string | null;
        value?: number | string | null;
    };
    subStats?: EchoStatSubStat[];
    isEmpty?: boolean;
    className?: string;
}

export const EchoStatPreview: React.FC<EchoStatPreviewProps> = ({
    icon,
    name,
    level,
    cv,
    setIcon,
    mainStat,
    subStats = [],
    isEmpty = false,
    className = '',
}) => {
    if (isEmpty || !name) {
        return (
            <div className={`flex min-h-24 h-full items-center justify-center rounded border border-dashed border-border text-text-primary/35 text-xs bg-background-secondary p-2 pt-3 ${className}`}>
                Empty Slot
            </div>
        );
    }

    return (
        <div className={`relative rounded border border-border bg-background-secondary p-2 pt-3 text-xs w-full h-full flex flex-col ${className}`}>
            {setIcon && (
                <img
                    src={setIcon}
                    alt=""
                    className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 object-contain shadow-sm"
                />
            )}
            <div className="mb-1 flex items-center gap-2">
                {icon && (
                    <img src={icon} alt={name} className="h-8 w-8 rounded object-contain shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                    <OverflowMarquee
                        text={name}
                        textClassName="font-semibold text-text-primary"
                        startOverflowPx={16}
                        stopOverflowPx={10}
                    />
                    {(level !== undefined || cv !== undefined) && (
                        <div className="text-xs text-text-primary/60">
                            {level !== undefined && `Lv.${level}`}
                            {level !== undefined && cv !== undefined && ' • '}
                            {cv !== undefined && `CV ${cv.toFixed(1)}`}
                        </div>
                    )}
                </div>
            </div>
            {mainStat?.type && mainStat.value !== undefined && mainStat.value !== null && (
                <div className="mb-1 flex justify-between gap-2 text-xs">
                    <span className="truncate text-accent">{mainStat.type}</span>
                    <span className="shrink-0 text-accent">{formatStatValue(mainStat.value)}</span>
                </div>
            )}
            <div className="space-y-0.5 mt-auto">
                {subStats
                    .filter((sub) => sub.type && sub.value !== null && sub.value !== undefined)
                    .map((sub, subIndex) => (
                        <div key={subIndex} className="flex items-center justify-between gap-2 text-xs text-text-primary/65">
                            <div className="min-w-0 flex-1">
                                <OverflowMarquee
                                    text={sub.type ?? ''}
                                    textClassName="text-xs"
                                    startOverflowPx={1.35}
                                    stopOverflowPx={0.45}
                                />
                            </div>
                            <span className="shrink-0">{formatStatValue(sub.value)}</span>
                        </div>
                    ))}
            </div>
        </div>
    );
};
