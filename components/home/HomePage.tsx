import { Hero } from './Hero';
import { BoardIndex } from './BoardIndex';
import { NewsLog } from './NewsLog';
import { Guide } from './Guide';
import type { HomeBoardRecord, HomeHeroSlide } from './types';

interface HomePageProps {
    lbStats: {
        totalBuilds: number;
        totalLeaderboards: number;
    };
    slides: HomeHeroSlide[];
    records: HomeBoardRecord[];
}

export function HomePage({ lbStats, slides, records }: HomePageProps) {
    return (
        <main className="bg-background">
            <Hero
                slides={slides}
                totalBuilds={lbStats.totalBuilds}
                totalLeaderboards={lbStats.totalLeaderboards}
            />

            <div className="mx-auto max-w-260 px-6 md:px-10 pb-4">
                {/* The working surfaces: most contested boards beside the updates log. */}
                <div className="pt-12 md:pt-16 grid grid-cols-1 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] gap-x-14 gap-y-12">
                    <BoardIndex records={records} />
                    <NewsLog />
                </div>

                <div className="mt-12 md:mt-16 pt-10 border-t border-border">
                    <Guide />
                </div>
            </div>
        </main>
    );
}
