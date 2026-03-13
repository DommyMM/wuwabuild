import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';

export const metadata: Metadata = {
    title: 'WuWa Builds | Wuthering Waves Build Creator & Leaderboards',
    description: 'Create, share, and discover top-tier Wuthering Waves character builds. Features automatic OCR screenshot importing, real-time stat calculations, and global leaderboards.',
};

export default function Home() {
    return <HomePage />;
}
