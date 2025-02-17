import { Metadata } from 'next';
import CharacterList from '@/components/LB/CharacterList';
import { getCharacters, getLeaderboardData } from '@/components/LB/charfetch';
import '@/styles/Leaderboard.css';
import '@/styles/BuildPage.css';
import '@/styles/BuildExpand.css';
import '@/styles/SavesPage.css';

export const metadata: Metadata = {
    title: 'Character Rankings - WuWa Builds',
    description: 'View top builds and damage for each character in Wuthering Waves',
    openGraph: {
        type: 'website',
        title: 'Character Rankings - WuWa Builds',
        description: 'View top builds and rankings for each character',
        siteName: 'WuWa Builds',
        url: 'https://wuwabuilds.moe/leaderboards',
        images: [{
            url: '/images/leaderboard.png',
            width: 1920,
            height: 1080,
            alt: 'WuWa Builds Leaderboard Rankings'
        }]
    }
};

export default async function LeaderboardPage() {
    const [initialData, characters] = await Promise.all([
        getLeaderboardData(),
        getCharacters()
    ]);
    
    return (
        <main className="leaderboard-page">
            <CharacterList initialData={initialData} characters={characters}/>
        </main>
    );
}