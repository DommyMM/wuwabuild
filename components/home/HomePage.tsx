import { HeroSection } from './HeroSection';
import { TopBuilds } from './TopBuilds';
import { BuildsVsLeaderboards } from './BuildsVsLeaderboards';
import { HowItWorks } from './HowItWorks';
import { FAQ } from './FAQ';
import { Footer } from './Footer';

export interface HomeTopBuild {
    id: string;
    characterId: string;
    characterName: string;
    element: string;
    cv: number;
    owner: string;
    sequence: number;
    bannerUrl: string | null;
    iconRoundUrl: string | null;
    weaponIconUrl: string | null;
    weaponName: string | null;
}

interface HomePageProps {
    lbStats: {
        totalBuilds: number;
        totalLeaderboards: number;
    };
    topBuilds: HomeTopBuild[];
}

export function HomePage({ lbStats, topBuilds }: HomePageProps) {
    return (
        <main className="bg-background overflow-x-hidden">
            <div className="max-w-[1440px] mx-auto">
                <HeroSection
                    totalBuilds={lbStats.totalBuilds}
                    totalLeaderboards={lbStats.totalLeaderboards}
                />
                <TopBuilds builds={topBuilds} />
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
