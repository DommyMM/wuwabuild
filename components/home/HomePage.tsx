'use client';

import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { FeatureStrip } from './FeatureStrip';
import { LiveStats } from './LiveStats';
import { Disclaimer } from './Disclaimer';

interface HomePageProps {
    lbStats: {
        totalBuilds: number;
        totalLeaderboards: number;
    };
}

export function HomePage({ lbStats }: HomePageProps) {
    return (
        <main className="bg-background overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-6 py-0 leading-relaxed">
                <HeroSection />
                <HowItWorks />
                <FeatureStrip />
                <LiveStats totalBuilds={lbStats.totalBuilds} totalLeaderboards={lbStats.totalLeaderboards} />
                <Disclaimer />
            </div>
        </main>
    );
}
