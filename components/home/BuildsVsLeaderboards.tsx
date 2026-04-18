import Link from 'next/link';

const BUILD_PILLS = ['No damage', 'Any weapon', 'Any rank'];
const LB_PILLS = ['Calcs damage', 'Specific weapons', 'Specific sequences'];

export function BuildsVsLeaderboards() {
    return (
        <section className="pt-10 md:pt-14">
            <h2 className="text-xs font-semibold text-text-primary/50 uppercase tracking-[0.22em] mb-6">
                Two ways to use the website
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 border border-border">
                <div className="p-7 md:p-9 border-b md:border-b-0 md:border-r border-border">
                    <div className="flex items-baseline justify-between mb-4">
                        <h3 className="font-plus-jakarta text-2xl md:text-[28px] font-medium tracking-[-0.02em]">
                            Builds
                        </h3>
                        <span className="text-xs tracking-[0.18em] uppercase text-text-primary/40">
                            The archive
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-primary/65 mb-5">
                        Every submitted build, at level 90. No damage, just raw stats of the weapon and echoes. 
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

                <div className="p-7 md:p-9 bg-accent/5">
                    <div className="flex items-baseline justify-between mb-4">
                        <h3 className="font-plus-jakarta text-2xl md:text-[28px] font-medium tracking-[-0.02em] text-accent">
                            Leaderboards
                        </h3>
                        <span className="text-xs tracking-[0.18em] uppercase text-accent">
                            The ranking
                        </span>
                    </div>
                    <p className="text-sm leading-relaxed text-text-primary/65 mb-5">
                        Per-character boards for different weapons and playstyles. Damage is computed against
                        a standardized rotation, with only your echoes changing between builds.
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
