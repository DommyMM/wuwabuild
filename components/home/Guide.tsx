import { FAQS } from './faqs';
import { HomeLink } from './HomeLink';

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
                . Don&apos;t crop, screenshot, or resize.
            </>
        ),
    },
    {
        title: 'Drop it on Import',
        desc: (
            <>
                Upload it to {' '}
                <HomeLink href="/import" cta="import" section="guide" className="text-accent hover:text-accent-hover underline underline-offset-2">
                    Import
                </HomeLink>
                . Review the results, fix the name or UID if needed, and submit.
            </>
        ),
    },
    {
        title: 'Download the build card',
        desc: (
            <>
                Open the{' '}
                <HomeLink href="/edit" cta="edit" section="guide" className="text-accent hover:text-accent-hover underline underline-offset-2">
                    editor
                </HomeLink>{' '}
                to download a card image of the full build and stats.
            </>
        ),
    },
    {
        title: 'See where you rank',
        desc: 'Damage is computed on a standardized rotation, so the boards compare builds, not teams.',
    },
];

/** Enka-style guide panel: how to use, then the questions, all visible. */
export function Guide() {
    return (
        <section>
            <h2 className="font-plus-jakarta text-xl md:text-2xl font-medium tracking-[-0.01em] mb-6">
                How to use.
            </h2>
            <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-10 gap-y-5 border-t border-border pt-6">
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

            <h2 className="font-plus-jakarta text-xl md:text-2xl font-medium tracking-[-0.01em] mt-12 mb-6">
                Things players ask first.
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
