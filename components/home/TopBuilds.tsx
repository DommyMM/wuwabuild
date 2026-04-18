import Link from 'next/link';
import type { HomeTopBuild } from './HomePage';

interface TopBuildsProps {
    builds: HomeTopBuild[];
}

export function TopBuilds({ builds }: TopBuildsProps) {
    if (builds.length === 0) return null;

    return (
        <section className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-16">
            <div className="flex items-baseline justify-between mb-5">
                <h2 className="text-[11px] font-semibold text-text-primary/50 uppercase tracking-[0.22em]">
                    Top builds
                </h2>
                <Link
                    href="/builds"
                    className="text-xs sm:text-sm text-text-primary/50 hover:text-accent transition-colors"
                >
                    Browse all builds →
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] gap-3 md:gap-3.5">
                {builds.map((build, i) => {
                    const featured = i === 0;
                    const elementClass = build.element && build.element !== 'rover'
                        ? `char-sig ${build.element}`
                        : 'char-sig';
                    return (
                        <Link
                            key={build.id}
                            href={`/builds?buildId=${encodeURIComponent(build.id)}`}
                            className={`gold-glow group relative block overflow-hidden rounded-sm border border-border bg-background-secondary/40 ${
                                featured
                                    ? 'sm:col-span-2 lg:col-span-1 h-[260px] sm:h-[300px] lg:h-[340px]'
                                    : 'h-[240px] lg:h-[340px]'
                            }`}
                        >
                            {build.bannerUrl ? (
                                <img
                                    src={build.bannerUrl}
                                    alt=""
                                    aria-hidden
                                    className="absolute inset-0 h-full w-full object-cover object-top opacity-85 transition-transform duration-600 group-hover:scale-[1.04]"
                                />
                            ) : (
                                <div className="absolute inset-0 build-card-ph" />
                            )}
                            <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-background/10" />
                            <div className="absolute inset-0 bg-linear-to-r from-background/40 via-transparent to-transparent" />

                            <div className="absolute left-3.5 right-3.5 top-3 flex items-center justify-between">
                                <span className="text-[10px] tracking-[0.22em] uppercase text-text-primary/70 bg-background/50 backdrop-blur-sm px-2 py-1 rounded-sm">
                                    {featured ? 'Top build' : `#${i + 1}`}
                                </span>
                                {build.sequence > 0 && (
                                    <span className="text-[10px] font-semibold tracking-wider text-accent bg-background/60 backdrop-blur-sm px-1.5 py-1 rounded-sm border border-accent/25">
                                        S{build.sequence}
                                    </span>
                                )}
                            </div>

                            <div className="absolute left-3.5 right-3.5 bottom-3.5">
                                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-text-primary/55 truncate">
                                    {build.weaponIconUrl && (
                                        <img
                                            src={build.weaponIconUrl}
                                            alt=""
                                            aria-hidden
                                            className="h-4 w-4 object-contain shrink-0"
                                        />
                                    )}
                                    <span className="truncate">
                                        {build.weaponName ?? '—'}
                                        <span className="text-text-primary/35"> · {build.owner}</span>
                                    </span>
                                </div>
                                <div className="flex items-end justify-between gap-2">
                                    <span
                                        className={`${elementClass} truncate leading-tight`}
                                        style={{
                                            fontSize: featured ? 24 : 18,
                                            fontWeight: 500,
                                        }}
                                    >
                                        {build.characterName}
                                    </span>
                                    <span
                                        className="cv-glow font-gowun shrink-0 leading-none"
                                        style={{ fontSize: featured ? 20 : 16 }}
                                    >
                                        {build.cv.toFixed(1)}
                                        <span className="text-[10px] tracking-widest ml-1 opacity-70">CV</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
