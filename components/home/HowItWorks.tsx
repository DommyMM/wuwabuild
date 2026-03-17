import { ScanLine, SlidersHorizontal, Share2 } from 'lucide-react';

const STEPS = [
    {
        icon: ScanLine,
        step: '01',
        title: 'Upload a screenshot',
        description: (
            <>
                Use{' '}
                <a
                    href="https://discord.com/channels/963760374543450182/1323199091072569479"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent/80 hover:text-accent underline underline-offset-2"
                >
                    wuwa-bot
                </a>{' '}
                to get a screenshot, then drop it here. We scan the character, weapon, echoes, forte, and sequences all at once.
            </>
        ),
    },
    {
        icon: SlidersHorizontal,
        step: '02',
        title: 'Review and adjust',
        description:
            'Open the full editor to fix any OCR misreads, swap echoes, update forte nodes, or change weapon rank. CV and damage preview update as you go.',
    },
    {
        icon: Share2,
        step: '03',
        title: 'Share or compete',
        description:
            'Download a build card to share anywhere, or submit to the leaderboard and see how your damage ranks across weapon and track boards.',
    },
] as const;

export function HowItWorks() {
    return (
        <section className="py-12 border-t border-border">
            <h2 className="text-xs font-semibold text-text-primary/40 uppercase tracking-widest mb-8">
                How it works
            </h2>
            <div className="grid grid-cols-3 gap-10">
                {STEPS.map((step) => (
                    <div key={step.step} className="flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-bold font-gowun text-accent/20 leading-none">
                                {step.step}
                            </span>
                            <step.icon size={20} className="text-accent" strokeWidth={1.5} />
                        </div>
                        <div>
                            <div className="font-semibold text-text-primary mb-2">{step.title}</div>
                            <div className="text-sm text-text-primary/50 leading-relaxed">
                                {step.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
