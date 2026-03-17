import { ScanLine, BarChart3, ImageDown, Globe, BookOpen, Languages } from 'lucide-react';

const FEATURES = [
    {
        icon: ScanLine,
        title: 'OCR Import',
        description: 'Auto-extract builds from 1080p screenshots across 10 scan regions.',
    },
    {
        icon: BarChart3,
        title: 'Real-time stat calc',
        description: 'HP, ATK, DEF, CV, element DMG — all live as you edit.',
    },
    {
        icon: ImageDown,
        title: 'Shareable build cards',
        description: 'Export polished PNG cards with splash art and full stat breakdown.',
    },
    {
        icon: Globe,
        title: 'Global builds browser',
        description: 'Filter by character, echo sets, main stats, CV, damage, and more.',
    },
    {
        icon: BookOpen,
        title: 'Per-character leaderboards',
        description: 'Ranked damage runs per weapon and sequence level.',
    },
    {
        icon: Languages,
        title: '10 languages',
        description: 'EN, JA, KO, ZH (S/T), DE, ES, FR, TH, UK.',
    },
] as const;

export function FeatureStrip() {
    return (
        <section className="py-12 border-t border-border">
            <h2 className="text-xs font-semibold text-text-primary/40 uppercase tracking-widest mb-8">
                What&apos;s inside
            </h2>
            <div className="grid grid-cols-3 gap-x-10 gap-y-7">
                {FEATURES.map((f) => (
                    <div key={f.title} className="flex gap-3">
                        <f.icon
                            size={17}
                            strokeWidth={1.75}
                            className="text-accent shrink-0 mt-0.5"
                        />
                        <div>
                            <div className="text-sm font-semibold text-text-primary mb-0.5">
                                {f.title}
                            </div>
                            <div className="text-xs text-text-primary/45 leading-relaxed">
                                {f.description}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
