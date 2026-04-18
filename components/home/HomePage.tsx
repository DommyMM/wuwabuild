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
            <div className="max-w-360 mx-auto">
                <HeroSection
                    totalBuilds={lbStats.totalBuilds}
                    totalLeaderboards={lbStats.totalLeaderboards}
                />
                <BuildsVsLeaderboards />
                <HowItWorks />
                <FAQ />
                <div className="px-6 sm:px-10 lg:px-16 pt-20 sm:pt-24">
                    <Footer />
                </div>
            </div>
        </main>
    );
}
