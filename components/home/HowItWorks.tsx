import { ScanLine, SlidersHorizontal, Share2 } from 'lucide-react';

const STEPS = [
    {
        icon: ScanLine,
        step: '01',
        title: 'Upload a screenshot',
        description:
            'Paste any 1920×1080 screenshot. OCR crops and scans each region in parallel — character, weapon, echoes, forte, and sequences.',
    },
    {
        icon: SlidersHorizontal,
        step: '02',
        title: 'Review and fine-tune',
        description:
            'Open the full editor to adjust stats, swap echoes, update forte nodes, or change weapon rank. CV and damage preview updates instantly.',
    },
    {
        icon: Share2,
        step: '03',
        title: 'Export or compete',
        description:
            'Download a polished build card to share anywhere, or upload to the leaderboard to rank your damage across weapon and track boards.',
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
