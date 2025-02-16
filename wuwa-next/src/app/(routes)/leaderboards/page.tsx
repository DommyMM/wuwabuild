import { Metadata } from 'next';
import CharacterList from '@/components/LB/CharacterList';
import '@/styles/Leaderboard.css';
import '@/styles/BuildPage.css';

export const metadata: Metadata = {
    title: 'Character Rankings - WuWa Builds',
    description: 'View top builds and rankings for each character in Honkai: Star Rail',
    openGraph: {
        title: 'Character Rankings - WuWa Builds',
        description: 'View top builds and rankings for each character',
        images: ['/images/leaderboard.png'],
    }
};

export default function LeaderboardPage() {
    return (
        <main className="leaderboard-page">
            <CharacterList />
        </main>
    );
}