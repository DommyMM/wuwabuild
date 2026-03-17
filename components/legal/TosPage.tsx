'use client';

export function TosPage() {
    return (
        <main className="max-w-3xl mx-auto px-6 py-12">
            <h1 className="font-gowun text-accent text-2xl mb-1">Terms of Service</h1>
            <p className="text-text-primary/70 text-sm leading-relaxed mb-8">Last updated: March 2026</p>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Fan tool, not official</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    WuWa Builds is an independent fan tool and is not affiliated with, endorsed by, or connected to
                    Kuro Games or the Wuthering Waves franchise. All game content, characters, assets, and trademarks
                    are the property of Kuro Games.
                </p>
            </section>
            
            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Build submissions</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    By submitting a build to the leaderboard, you confirm the build data represents a character you
                    play in-game, and you consent to it being publicly displayed. Do not submit builds on behalf of
                    other players without their knowledge. We reserve the right to remove builds that are malformed,
                    contain illegal echo configurations, or are otherwise invalid — this is enforced automatically
                    by the import pipeline.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">No warranty</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    Stat calculations, damage outputs, and leaderboard rankings are provided as-is for informational
                    purposes. We make no guarantees of accuracy. Game updates may cause displayed values to diverge
                    from in-game values until data is resynced.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Availability</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    We make no guarantees of uptime or continued availability. The tool may be updated, changed,
                    or discontinued at any time.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Conduct</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    Don&apos;t attempt to abuse the OCR endpoint, leaderboard API, or any other backend service.
                    Rate limiting is in place. Automated scraping at scale is not permitted.
                </p>
            </section>
        </main>
    );
}
