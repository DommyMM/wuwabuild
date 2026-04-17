import Link from 'next/link';

const BUILD_PILLS = ['No damage', 'Any weapon', 'Any rank'];
const LB_PILLS = ['Computed damage', 'Weapon × track', 'Per sequence'];

export function BuildsVsLeaderboards() {
    return (
        <section className="px-6 sm:px-10 lg:px-16 pt-16 sm:pt-24">
            <h2 className="text-[11px] font-semibold text-text-primary/50 uppercase tracking-[0.22em] mb-6">
                Two ways to see the community
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 border border-border">
                <div className="p-7 md:p-9 border-b md:border-b-0 md:border-r border-border">
                    <div className="flex items-baseline justify-between mb-4">
                        <h3 className="font-plus-jakarta text-2xl md:text-[28px] font-medium tracking-[-0.02em]">
                            Builds
                        </h3>
                        <span className="text-[11px] tracking-[0.18em] uppercase text-text-primary/40">
                            The archive
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-primary/65 mb-5">
                        Every submitted build, no standardization and no damage math. Browse by character,
                        filter by element, study what other players run.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-text-primary/55 mb-6">
                        {BUILD_PILLS.map((pill) => (
                            <span key={pill} className="px-2.5 py-1 border border-border">
                                {pill}
                            </span>
                        ))}
                    </div>
                    <Link
                        href="/builds"
                        className="inline-block text-sm text-text-primary/80 hover:text-text-primary transition-colors border-b border-text-primary/30 hover:border-text-primary/60 pb-0.5"
                    >
                        Browse the archive →
                    </Link>
                </div>

                <div className="p-7 md:p-9 bg-accent/[0.03]">
                    <div className="flex items-baseline justify-between mb-4">
                        <h3 className="font-plus-jakarta text-2xl md:text-[28px] font-medium tracking-[-0.02em] text-accent">
                            Leaderboards
                        </h3>
                        <span className="text-[11px] tracking-[0.18em] uppercase text-accent">
                            The ranking
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-primary/65 mb-5">
                        Per-character boards with weapon × track tabs. Damage is computed against a
                        standardized rotation so the numbers compare apples to apples.
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-text-primary/70 mb-6">
                        {LB_PILLS.map((pill) => (
                            <span key={pill} className="px-2.5 py-1 border border-accent/20">
                                {pill}
                            </span>
                        ))}
                    </div>
                    <Link
                        href="/leaderboards"
                        className="inline-block text-sm text-accent hover:text-accent-hover transition-colors border-b border-accent pb-0.5"
                    >
                        View leaderboards →
                    </Link>
                </div>
            </div>
        </section>
    );
}
