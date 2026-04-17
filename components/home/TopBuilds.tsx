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

            <div className="grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-3 md:gap-3.5">
                {builds.map((build, i) => {
                    const featured = i === 0;
                    const elementClass = build.element && build.element !== 'rover'
                        ? `char-sig ${build.element}`
                        : 'char-sig';
                    return (
                        <Link
                            key={build.id}
                            href={`/builds?buildId=${encodeURIComponent(build.id)}`}
                            className={`build-card-ph gold-glow block relative h-[200px] md:h-[260px] ${
                                featured ? 'col-span-2 md:col-span-1 border-accent/20' : ''
                            }`}
                            style={{
                                borderColor: featured ? 'rgba(166,150,98,0.2)' : undefined,
                            }}
                        >
                            <span className="absolute left-3.5 top-3 text-[10px] tracking-[0.2em] uppercase text-text-primary/40">
                                {featured ? 'Top build' : `#${i + 1}`}
                            </span>
                            <div className="absolute left-3.5 right-3.5 bottom-3.5 flex items-baseline justify-between gap-2">
                                <span
                                    className={`${elementClass} truncate`}
                                    style={{
                                        fontSize: featured ? 20 : 16,
                                        fontWeight: 500,
                                    }}
                                >
                                    {build.characterName}
                                </span>
                                <span
                                    className="cv-glow font-gowun shrink-0"
                                    style={{ fontSize: featured ? 18 : 14 }}
                                >
                                    {build.cv.toFixed(1)} CV
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}
