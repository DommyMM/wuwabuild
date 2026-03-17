'use client';

export function PrivacyPage() {
    return (
        <main className="max-w-360 mx-auto px-6 py-12">
            <h1 className="font-gowun text-accent text-2xl mb-1">Privacy Policy</h1>
            <p className="text-text-primary/70 text-sm leading-relaxed mb-8">Last updated: March 2026</p>

            {/* Plain-language summary — the part that actually matters */}
            <section className="bg-accent/6 border border-accent/20 rounded-md px-5 py-4 mb-10">
                <h2 className="text-text-primary font-semibold text-sm mb-3">The short version</h2>
                <ul className="text-text-primary/70 text-sm leading-relaxed space-y-1.5 list-disc list-inside">
                    <li>No account required. We never collect passwords, payment info, or emails.</li>
                    <li>If you submit a leaderboard build, your in-game UID, display name, and build data are stored publicly.</li>
                    <li>Screenshots uploaded for OCR are stored in Cloudflare R2. They&apos;re not shared.</li>
                    <li>We use anonymous analytics (page views, feature usage). Blockable with any ad blocker.</li>
                    <li>We don&apos;t sell or share your data. That&apos;s it.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Introduction</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    WuWa Builds (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates wuwa.build (the &quot;Service&quot;). This Privacy Policy explains
                    what information we collect, how we use it, and your rights regarding that information.
                    By using the Service, you agree to the practices described here.
                </p>
                <p className="text-text-primary/70 text-sm leading-relaxed mt-2">
                    WuWa Builds is an independent fan tool and is not affiliated with or endorsed by Kuro Games.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Data we collect</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed mb-2">
                    <strong className="text-text-primary/90">Build submissions.</strong> When you submit a leaderboard build, we store: your
                    in-game UID, display name, and full build data (character, weapon, echoes, forte, sequence). This data
                    is publicly visible. No real-world identity is required or collected.
                </p>
                <p className="text-text-primary/70 text-sm leading-relaxed mb-2">
                    <strong className="text-text-primary/90">Screenshots.</strong> When you use OCR import, your image is uploaded to
                    Cloudflare object storage with hash-based deduplication (same image is only stored once). OCR issue reports
                    are stored in the same bucket linked. No images are shared with third parties.
                </p>
                <p className="text-text-primary/70 text-sm leading-relaxed mb-2">
                    <strong className="text-text-primary/90">Usage data.</strong> We use aggregate analytics tools to collect anonymous
                    usage data (pages visited, feature interactions, device type, browser, country). This data cannot
                    identify you personally and is used solely to improve the Service.
                </p>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    <strong className="text-text-primary/90">Local storage.</strong> Build editor data and your preferences are stored
                    locally in your browser. This data is never transmitted to our servers.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">What we don&apos;t collect</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    We do not collect passwords, emails, payment information, or any personally identifiable information
                    beyond what is listed above. There is no account system. We do not sell, rent, or share your data
                    with third parties except as necessary to operate the Service (hosting, storage providers).
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Cookies</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    We may use session cookies or similar technologies for analytics. No advertising cookies are used.
                    You can disable cookies in your browser settings; core functionality is not affected.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Retention</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    Build data is retained as long as it is relevant to the leaderboard. Builds that become invalid
                    (illegal echo configurations, malformed data) are automatically purged. You may request deletion
                    at any time by contacting us.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Third-party services</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    The Service uses Cloudflare (CDN and R2 storage) and Vercel (hosting). Analytics may be provided
                    by Google Analytics or PostHog. These services operate under their own privacy policies. We do not
                    control how they process data; review their policies for details.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Future authentication</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    A future update may add optional Discord or Google OAuth for account linking. This page will be
                    updated when that ships. No existing data will be retroactively linked to accounts without your action.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Your rights (GDPR / CCPA)</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed mb-2">
                    If you are in the EU/EEA or California, you have rights including: access to your data, correction,
                    deletion, and objection to processing. To exercise these rights, contact us. We will respond within
                    a reasonable timeframe. We do not sell personal data under any definition, including the CCPA.
                </p>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    Users may visit the Service anonymously. We honor Do Not Track signals where applicable.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Children</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    The Service is not directed to children under 13. We do not knowingly collect personal information
                    from children. If you believe a child has submitted data, contact us for removal.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Changes</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    We may update this policy from time to time. Changes are effective when posted. Continued use of
                    the Service after changes constitutes acceptance.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Contact</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    For data removal requests, privacy questions, or other inquiries:{' '}
                    <a href="mailto:hello@wuwa.build" className="text-accent hover:underline">hello@wuwa.build</a>
                    {' '}or Discord{' '}
                    <span className="text-text-primary/90">@DommyMM</span>.
                </p>
            </section>
        </main>
    );
}
