import { CHANGELOG } from '@/lib/changelog';
import type { ChangeKind } from '@/lib/changelog';
import { HomeLink } from './HomeLink';

// Same chip language as the /changelog page, so the voice reads identical in both places.
const kindStyles: Record<ChangeKind, { label: string; className: string }> = {
    new: { label: 'New', className: 'border-aero/30 bg-aero/8 text-aero' },
    improved: { label: 'Improved', className: 'border-accent/30 bg-accent/10 text-accent' },
    fixed: { label: 'Fixed', className: 'border-glacio/30 bg-glacio/8 text-glacio' },
};

function formatDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
    });
}

/** The akasha-news of this site: latest changelog entries verbatim, the maintainer's voice intact. */
export function NewsLog() {
    // More than the window can show; the overflow fades out so the column height stays
    // fixed at LOG_WINDOW regardless of how wordy recent entries are.
    const entries = CHANGELOG.slice(0, 5);
    if (entries.length === 0) return null;

    return (
        <section>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 mb-5">
                <h2 className="font-plus-jakarta text-xl md:text-2xl font-medium tracking-[-0.01em]">
                    <HomeLink
                        href="/changelog"
                        cta="changelog"
                        section="news"
                        className="transition-colors hover:text-accent"
                    >
                        <span className="text-accent" aria-hidden># </span>updates
                    </HomeLink>
                </h2>
                <span className="font-mono text-[11px] text-text-primary/40">from the changelog</span>
            </div>

            {/* Height budget pairs with BoardIndex (VISIBLE_BOARDS 60px rows): 544 + header + link ≈ 9 rows + header + footer. */}
            <div className="border-t border-border pt-5 flex flex-col gap-7 max-h-[544px] overflow-hidden mask-[linear-gradient(to_bottom,black_78%,transparent)]">
                {entries.map((entry) => (
                    <article key={entry.date}>
                        <div className="flex items-baseline gap-3 mb-2.5">
                            <time
                                dateTime={entry.date}
                                className="font-mono text-[11px] text-text-primary/45 tabular-nums"
                            >
                                {formatDate(entry.date)}
                            </time>
                            {entry.patch && (
                                <span className="text-xs font-semibold uppercase tracking-widest text-accent">
                                    Patch {entry.patch}
                                </span>
                            )}
                        </div>
                        <ul className="flex flex-col gap-2">
                            {entry.changes.map((change, i) => (
                                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                                    <span
                                        className={`mt-0.5 inline-flex h-5 min-w-20 items-center justify-center rounded border px-2 text-[10px] font-semibold uppercase leading-none tracking-wider ${kindStyles[change.kind].className}`}
                                    >
                                        {kindStyles[change.kind].label}
                                    </span>
                                    <span className="text-text-primary/70">{change.text}</span>
                                </li>
                            ))}
                        </ul>
                    </article>
                ))}
            </div>

            <HomeLink
                href="/changelog"
                cta="changelog"
                section="news"
                className="mt-5 inline-block text-sm text-accent hover:text-accent-hover transition-colors"
            >
                Everything that&apos;s changed →
            </HomeLink>
        </section>
    );
}
