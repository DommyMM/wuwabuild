import { FAQS } from './faqs';
import { HomeLink } from './HomeLink';

// The steps sit beside a real wuwa-bot card instead of describing one: the
// input artifact is the whole trick, so it is shown at real fidelity. Card
// download (editor/profiles) is a side quest, not the funnel; it lives in the
// FAQ now.
const STEPS: { title: string; desc: React.ReactNode }[] = [
    {
        title: 'Grab the wuwa-bot image',
        desc: (
            <>
                Download or copy directly from the{' '}
                <a
                    href="https://discord.com/channels/963760374543450182/1323199091072569479"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover underline underline-offset-2"
                >
                    Discord bot
                </a>
                . Do NOT crop, screenshot, or resize.
            </>
        ),
    },
    {
        title: 'Drop it on Import',
        desc: (
            <>
                Upload it to{' '}
                <HomeLink href="/import" cta="import" section="guide" className="text-accent hover:text-accent-hover underline underline-offset-2">
                    Import
                </HomeLink>
                . Review what OCR read, fix the name or UID if needed, and submit.
            </>
        ),
    },
    {
        title: 'See where you rank',
        desc: (
            <>
                Open the{' '}
                <HomeLink href="/leaderboards" cta="leaderboards" section="guide" className="text-accent hover:text-accent-hover underline underline-offset-2">
                    leaderboards
                </HomeLink>{' '}
                to compare damage in standardized rotations against other players
            </>
        ),
    },
];

export function Guide() {
    return (
        <section>
            <h2 className="font-plus-jakarta text-xl md:text-2xl font-medium tracking-[-0.01em] mb-6">
                How to use
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-x-12 gap-y-8">
                <figure>
                    <img
                        src="/images/wuwa-bot-card.webp"
                        alt="Example wuwa-bot build card: Hiyuki with weapon, forte, and five echoes"
                        width={1440}
                        height={810}
                        className="w-full rounded-lg border border-border"
                        loading="lazy"
                    />
                    <figcaption className="mt-2.5 font-mono text-[11px] text-text-primary/45">
                        Import accepts only 1920×1080 wuwa-bot output
                    </figcaption>
                </figure>
                <ol className="flex flex-col gap-6">
                    {STEPS.map((step, i) => (
                        <li key={step.title} className="flex gap-3.5">
                            <span className="font-gowun text-2xl leading-none text-accent/40 tabular-nums select-none" aria-hidden>
                                {i + 1}
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[15px] font-semibold text-text-primary mb-1">
                                    {step.title}
                                </span>
                                <span className="block text-sm leading-relaxed text-text-primary/55">
                                    {step.desc}
                                </span>
                            </span>
                        </li>
                    ))}
                </ol>
            </div>

            <h2 className="font-plus-jakarta text-xl md:text-2xl font-medium tracking-[-0.01em] mt-12 mb-6">
                Things players ask first
            </h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 border-t border-border pt-6">
                {FAQS.map((faq) => (
                    <div key={faq.q}>
                        <dt className="text-[15px] font-semibold text-text-primary mb-1.5">
                            {faq.q}
                        </dt>
                        <dd className="text-sm leading-relaxed text-text-primary/60">
                            {faq.a}
                        </dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}
