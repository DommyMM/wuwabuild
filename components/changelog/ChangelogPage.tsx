import { CHANGELOG, type ChangeKind } from '@/lib/changelog';

const KIND_LABEL: Record<ChangeKind, string> = {
    new: 'New',
    improved: 'Improved',
    fixed: 'Fixed',
};

const KIND_CLASS: Record<ChangeKind, string> = {
    new: 'text-aero border-aero/35 bg-aero/10',
    improved: 'text-glacio border-glacio/35 bg-glacio/10',
    fixed: 'text-accent-hover border-accent/35 bg-accent/10',
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
            <h1 className="font-plus-jakarta text-3xl md:text-5xl leading-[1.05] tracking-[-0.02em] font-medium text-balance">
                Everything that&apos;s changed.
            </h1>
            <p className="mt-4 text-sm md:text-base leading-relaxed text-text-primary/60 max-w-140">
                New features, fixes, and game data updates for WuWa Builds — most recent first.
            </p>

            <ol className="mt-12 md:mt-14 flex flex-col gap-9 border-l border-border pl-6 md:pl-8">
                {CHANGELOG.map((entry, i) => (
                    <li key={i} className="relative">
                        <span
                            className={`absolute top-1.5 -left-6 md:-left-8 -translate-x-1/2 rounded-full ring-4 ring-background ${
                                entry.patch ? 'size-2.5 bg-accent' : 'size-2 bg-text-primary/30'
                            }`}
                            aria-hidden
                        />
                        <div className="flex flex-col gap-0.5">
                            <time
                                dateTime={entry.date}
                                className="text-[11px] tracking-[0.14em] uppercase text-text-primary/45 tabular-nums"
                            >
                                {formatDate(entry.date)}
                            </time>
                            {entry.patch && (
                                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                                    Patch {entry.patch}
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
                                <li key={j} className="flex gap-3 text-sm leading-relaxed">
                                    <span
                                        className={`shrink-0 mt-px h-fit rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${KIND_CLASS[change.kind]}`}
                                    >
                                        {KIND_LABEL[change.kind]}
                                    </span>
                                    <span className="text-text-primary/70">{change.text}</span>
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ol>
        </main>
    );
}
