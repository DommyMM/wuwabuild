'use client';

export function TosPage() {
    return (
        <main className="max-w-360 mx-auto px-6 py-12">
            <h1 className="font-gowun text-accent text-2xl mb-1">Terms of Service</h1>
            <p className="text-text-primary/70 text-sm leading-relaxed mb-8">Last updated: March 2026</p>

            {/* Plain-language summary — the part that actually matters */}
            <section className="bg-accent/6 border border-accent/20 rounded-md px-5 py-4 mb-10">
                <h2 className="text-text-primary font-semibold text-sm mb-3">The short version</h2>
                <ul className="text-text-primary/70 text-sm leading-relaxed space-y-1.5 list-disc list-inside">
                    <li>This is a free fan tool. No account required. Not affiliated with Kuro Games.</li>
                    <li>Only submit builds that are actually yours. Don&apos;t fake or manipulate data.</li>
                    <li>Damage values and rankings are best-effort. We make no guarantees of accuracy.</li>
                    <li>Don&apos;t abuse the API or scrape at scale. Rate limiting is enforced.</li>
                    <li>We can remove builds or block access at our discretion.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Introduction</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    These Terms of Service (&quot;Terms&quot;) govern your access to and use of wuwa.build (the &quot;Service&quot;),
                    operated by WuWa Builds. By using the Service, you agree to be bound by these Terms.
                    If you do not agree, do not use the Service.
                </p>
                <p className="text-text-primary/70 text-sm leading-relaxed mt-2">
                    WuWa Builds is an independent fan tool and is not affiliated with, endorsed by, or connected to
                    Kuro Games or the Wuthering Waves franchise. All game content, characters, assets, and trademarks
                    are the property of Kuro Games.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Build submissions</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    By submitting a build to the leaderboard, you confirm: the build data represents an account you own in-game, and you consent to it being publicly displayed. 
                    Do not submit builds on behalf of other players without their explicit consent. 
                    We reserve the right to remove builds that are malformed, contain illegal echo configurations, or are otherwise invalid. This is enforced
                    automatically, and attempting to manipulate or falsify build data is prohibited and will result in removal.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Disclaimer of warranty</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                    IMPLIED. STAT CALCULATIONS, DAMAGE OUTPUTS, AND LEADERBOARD RANKINGS ARE PROVIDED FOR
                    INFORMATIONAL PURPOSES ONLY. WE MAKE NO GUARANTEES OF ACCURACY, COMPLETENESS, OR FITNESS FOR
                    ANY PURPOSE. GAME UPDATES MAY CAUSE DISPLAYED VALUES TO DIVERGE FROM IN-GAME VALUES UNTIL
                    DATA IS RESYNCED.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Limitation of liability</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                    SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. IN NO EVENT
                    SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO USE THE SERVICE (WHICH IS ZERO, AS
                    IT IS FREE).
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Availability</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    We make no guarantees of uptime or continued availability. The Service may be updated, changed,
                    or discontinued at any time without notice. We reserve the right to restrict access to any part
                    of the Service at our sole discretion.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Prohibited conduct</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed mb-2">You agree not to:</p>
                <ul className="text-text-primary/70 text-sm leading-relaxed space-y-1.5 list-disc list-inside">
                    <li>Abuse, overload, or attempt to circumvent rate limiting on any endpoint</li>
                    <li>Scrape or harvest data from the Service at scale without prior written consent</li>
                    <li>Access undocumented or non-public API endpoints</li>
                    <li>Introduce malicious code or attempt to compromise the Service</li>
                    <li>Use the Service for any unlawful purpose</li>
                </ul>
                <p className="text-text-primary/70 text-sm leading-relaxed mt-2">
                    Violations may result in blocking of access, or legal action at our discretion.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Intellectual property</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    All game assets, characters, and trademarks remain the property of Kuro Games. The code, design,
                    and original content of this Service are our intellectual property. The leaderboard data you submit
                    remains yours; by submitting it you grant us a license to store and display it publicly as part of
                    the Service. We make no claim of ownership over your in-game data.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Indemnification</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    You agree to hold harmless WuWa Builds and its operators from any claims, damages, or expenses
                    arising from your use or misuse of the Service, your violation of these Terms, or content you submit.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Links to other sites</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    The Service may link to third-party websites. We are not responsible for the content or practices
                    of those sites. Review their terms and privacy policies independently.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Changes to these Terms</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    We may update these Terms at any time by posting the revised version on this page. Continued use
                    of the Service after changes are posted constitutes acceptance of the updated Terms.
                </p>
            </section>

            <section>
                <h2 className="text-text-primary font-semibold text-base mt-8 mb-2">Contact</h2>
                <p className="text-text-primary/70 text-sm leading-relaxed">
                    Questions or concerns:{' '}
                    <a href="mailto:hello@wuwa.build" className="text-accent hover:underline">help@wuwa.build</a>
                    {' '}or Discord{' '}
                    <span className="text-text-primary/90">@DommyMM</span>.
                </p>
            </section>
        </main>
    );
}
