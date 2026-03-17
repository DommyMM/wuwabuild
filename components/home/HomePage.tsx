'use client';

import { HeroSection } from './HeroSection';
import { HowItWorks } from './HowItWorks';
import { FAQ } from './FAQ';
import { Footer } from './Footer';

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
                <HeroSection totalBuilds={lbStats.totalBuilds} totalLeaderboards={lbStats.totalLeaderboards} />
                <HowItWorks />
                <FAQ />
                <Footer />
            </div>
        </main>
    );
}
