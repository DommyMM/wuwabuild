import { CHANGELOG } from '@/lib/changelog';
import type { ChangeKind } from '@/lib/changelog';

const kindStyles: Record<ChangeKind, { label: string; className: string }> = {
    new: {
        label: 'New',
        className: 'border-aero/30 bg-aero/8 text-aero',
    },
    improved: {
        label: 'Improved',
        className: 'border-accent/30 bg-accent/10 text-accent',
    },
    fixed: {
        label: 'Fixed',
        className: 'border-glacio/30 bg-glacio/8 text-glacio',
    },
};

function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

export function ChangelogPage() {
    return (
        <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
            <div className="text-[11px] tracking-[0.22em] uppercase text-text-primary/50 mb-2.5">
                Changelog
            </div>
            <h1 className="font-plus-jakarta text-3xl md:text-5xl leading-[1.05] font-medium text-balance">
                Everything that&apos;s changed.
            </h1>
            <p className="mt-4 text-sm md:text-base leading-relaxed text-text-primary/60 max-w-140">
                New features, fixes, and game data updates for WuWaBuilds, most recent first.
            </p>

            <ol className="mt-12 md:mt-14 flex flex-col gap-9 border-l border-border pl-6 md:pl-8">
                {CHANGELOG.map((entry, i) => (
                    <li key={i} className="group relative rounded-md border border-transparent px-4 py-4 transition-colors duration-200 hover:border-accent/20 hover:bg-background-secondary/45 hover:shadow-[0_0_28px_-22px_rgba(191,173,125,0.65)]">
                        <span
                            className={`absolute top-6 -left-6 md:-left-8 -translate-x-1/2 rounded-full border-2 ring-4 ring-background transition-all duration-200 group-hover:border-accent group-hover:ring-background-secondary ${
                                entry.patch
                                    ? 'size-2.5 border-accent bg-background'
                                    : 'size-2 border-text-primary/30 bg-background'
                            }`}
                            aria-hidden
                        />
                        <span
                            className="absolute bottom-4 left-0 top-4 w-px bg-accent/0 transition-colors duration-200 group-hover:bg-accent/45"
                            aria-hidden
                        />
                        <div className="flex flex-col gap-0.5">
                            <time
                                dateTime={entry.date}
                                className="text-[11px] tracking-[0.14em] uppercase text-text-primary/45 tabular-nums transition-colors duration-200 group-hover:text-text-primary/65"
                            >
                                {formatDate(entry.date)}
                            </time>
                            {entry.patch && (
                                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                                    Wuthering Waves {entry.patch}
                                </span>
                            )}
                        </div>
                        {entry.title && (
                            <h2 className="mt-1.5 font-plus-jakarta text-base md:text-lg font-medium text-text-primary">
                                {entry.title}
                            </h2>
                        )}
                        <ul className="mt-3 flex flex-col gap-2.5">
                            {entry.changes.map((change, j) => (
                                <li
                                    key={j}
                                    className="flex gap-3 rounded-sm border border-transparent px-2 py-1.5 text-sm leading-relaxed transition-colors duration-150 hover:border-border/80 hover:bg-background/45"
                                >
                                    <span
                                        className={`mt-0.5 inline-flex h-5 min-w-20 items-center justify-center rounded border px-2 text-[10px] font-semibold uppercase leading-none tracking-wider ${kindStyles[change.kind].className}`}
                                    >
                                        {kindStyles[change.kind].label}
                                    </span>
                                    <span className="text-text-primary/70 transition-colors duration-150 group-hover:text-text-primary/78">
                                        {change.text}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ol>
        </main>
    );
}
