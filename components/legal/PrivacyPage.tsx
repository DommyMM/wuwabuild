'use client';

export function PrivacyPage() {
    return (
        <main className="max-w-3xl mx-auto px-6 py-12">
            <h1 className="font-gowun text-accent text-2xl mb-1">Privacy Policy</h1>
            <p className="text-text-primary/70 text-sm leading-relaxed mb-8">Last updated: March 2026</p>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">What this tool is</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    WuWa Builds is a free, independent fan tool for Wuthering Waves. It is not affiliated with or
                    endorsed by Kuro Games. No account or sign-in is required to use any feature.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Data you submit</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    When you submit a build to the leaderboard, the following is stored publicly: your in-game UID,
                    display name, and full build data (character, weapon, echoes, forte levels, sequence). This data
                    is associated with your submitted run and visible to anyone browsing the leaderboard. You can
                    contact us to request removal.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Screenshots</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    When you use the OCR import feature, your screenshot is uploaded to Cloudflare R2 object storage.
                    Screenshots are stored with hash-based deduplication so the same image is only stored once. If you
                    submit an OCR issue report, the report JSON is stored in the same bucket linked to your screenshot.
                    Screenshots are not shared with third parties.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Analytics</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    The site optionally uses tools for aggregate usage analytics (page views,
                    feature usage). No personally identifiable information is collected through these. You can block
                    these with a standard ad blocker.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">What we don&apos;t collect</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    No passwords, no payment information, no IP addresses stored by us. No account system exists.
                    We do not sell or share any data.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Future authentication</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    A future update will add Discord and Google OAuth for optional account linking. This page will
                    be updated when that ships. No data from the current tool will be retroactively linked to
                    accounts without your action.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Contact</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    For data removal requests or questions, open an issue on GitHub or reach out via Discord.
                </p>
            </section>
        </main>
    );
}
