import { HeroSection } from './HeroSection';
import { BuildsVsLeaderboards } from './BuildsVsLeaderboards';
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
            <div className="max-w-360 mx-auto px-6 md:px-16">
                <HeroSection
                    totalBuilds={lbStats.totalBuilds}
                    totalLeaderboards={lbStats.totalLeaderboards}
                />
                <BuildsVsLeaderboards />
                <HowItWorks />
                <FAQ />
                <div className="pt-14 md:pt-20">
                    <Footer />
                </div>
            </div>
        </main>
    );
}
