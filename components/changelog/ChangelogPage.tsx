import { CHANGELOG, type ChangeKind, type ChangelogEntry } from '@/lib/changelog';

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

interface PatchGroup {
    patch?: string;
    entries: ChangelogEntry[];
}

function groupByPatch(entries: ChangelogEntry[]): PatchGroup[] {
    const groups: PatchGroup[] = [];
    for (const entry of entries) {
        const last = groups[groups.length - 1];
        if (last && last.patch === entry.patch) last.entries.push(entry);
        else groups.push({ patch: entry.patch, entries: [entry] });
    }
    return groups;
}

export function ChangelogPage() {
    const groups = groupByPatch(CHANGELOG);

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

            <div className="mt-12 md:mt-14 flex flex-col gap-12">
                {groups.map((group) => (
                    <section key={group.patch ?? 'earlier'}>
                        <div className="flex items-baseline gap-3 mb-6">
                            <h2 className="font-gowun text-accent text-xl md:text-2xl">
                                {group.patch ? `Patch ${group.patch}` : 'Earlier'}
                            </h2>
                            <span className="h-px flex-1 bg-border" />
                        </div>

                        <div className="flex flex-col gap-8 border-l border-border pl-6 md:pl-8">
                            {group.entries.map((entry) => (
                                <article key={entry.date + (entry.title ?? '')} className="relative">
                                    <span
                                        className="absolute top-1.5 -left-6 md:-left-8 -translate-x-1/2 size-2 rounded-full bg-accent ring-4 ring-background"
                                        aria-hidden
                                    />
                                    <div className="flex items-baseline gap-3 flex-wrap">
                                        <time
                                            dateTime={entry.date}
                                            className="text-[11px] tracking-[0.14em] uppercase text-text-primary/45 tabular-nums"
                                        >
                                            {formatDate(entry.date)}
                                        </time>
                                        {entry.title && (
                                            <h3 className="font-plus-jakarta text-base md:text-lg font-medium text-text-primary">
                                                {entry.title}
                                            </h3>
                                        )}
                                    </div>

                                    <ul className="mt-3 flex flex-col gap-2.5">
                                        {entry.changes.map((change, i) => (
                                            <li key={i} className="flex gap-3 text-sm leading-relaxed">
                                                <span
                                                    className={`shrink-0 mt-px h-fit rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${KIND_CLASS[change.kind]}`}
                                                >
                                                    {KIND_LABEL[change.kind]}
                                                </span>
                                                <span className="text-text-primary/70">{change.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
}
