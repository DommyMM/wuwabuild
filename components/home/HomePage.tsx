import { HeroSection } from './HeroSection';
import { BuildsVsLeaderboards } from './BuildsVsLeaderboards';
import { HowItWorks } from './HowItWorks';
import { BrowseCharacters } from './BrowseCharacters';
import { FAQ } from './FAQ';
import type { CharacterIndexEntry } from '@/lib/server/ogData';

interface HomePageProps {
    lbStats: {
        totalBuilds: number;
        totalLeaderboards: number;
    };
    characters: CharacterIndexEntry[];
}

export function HomePage({ lbStats, characters }: HomePageProps) {
    return (
        <main className="bg-background overflow-x-hidden">
            <div className="max-w-360 mx-auto px-6 md:px-16">
                <HeroSection
                    totalBuilds={lbStats.totalBuilds}
                    totalLeaderboards={lbStats.totalLeaderboards}
                />
                <BuildsVsLeaderboards />
                <HowItWorks />
                <BrowseCharacters characters={characters} />
                <FAQ />
            </div>
        </main>
    );
}
