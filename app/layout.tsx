import type { Metadata, Viewport } from "next";
import { Gowun_Dodum, Plus_Jakarta_Sans, Ropa_Sans } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Navigation } from "@/components/Navigation";
import { AppProviders } from "@/contexts/index";
import { promises as fs } from 'fs';
import path from 'path';
import "./globals.css";

const ropaSans = Ropa_Sans({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
    variable: "--font-ropa-next",
});

const gowunDodum = Gowun_Dodum({
    weight: "400",
    subsets: ["latin"],
    display: "swap",
    variable: "--font-gowun-next",
});

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-plus-jakarta-next",
});

export const metadata: Metadata = {
    metadataBase: new URL('https://wuwabuilds.moe'),
    title: {
        default: 'WuWa Builds - Wuthering Waves Build Creator',
        template: '%s | WuWa Builds'
    },
    description: 'Create and share Wuthering Waves builds with automatic screenshot scanning, real-time stat calculations, and build management tools.',
    keywords: ['Wuthering Waves', 'WuWa', 'build creator', 'character builds', 'echo builds', 'game tools'],
    authors: [{ name: 'WuWa Builds' }],
    creator: 'WuWa Builds',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://wuwabuilds.moe',
        siteName: 'WuWa Builds',
        title: 'WuWa Builds - Wuthering Waves Build Creator',
        description: 'Create and share Wuthering Waves builds with automatic screenshot scanning, real-time stat calculations, and build management tools.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WuWa Builds - Wuthering Waves Build Creator',
        description: 'Create and share Wuthering Waves builds with automatic screenshot scanning, real-time stat calculations, and build management tools.',
    },
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: '/favicon.ico',
        apple: '/logo192.png',
    },
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    themeColor: '#121212',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

async function loadInitialGameData() {
    const dataDir = path.join(process.cwd(), 'public', 'Data');
    try {
        const [
            characters,
            echoes,
            weapons,
            mainStats,
            substats,
            stats,
            fetters,
            characterCurves,
            levelCurves,
        ] = await Promise.all([
            fs.readFile(path.join(dataDir, 'Characters.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'Echoes.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'Weapons.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'Mainstat.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'Substats.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'Stats.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'Fetters.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'CharacterCurve.json'), 'utf-8').then(JSON.parse),
            fs.readFile(path.join(dataDir, 'LevelCurve.json'), 'utf-8').then(JSON.parse),
        ]);
        return { characters, echoes, weapons, mainStats, substats, stats, fetters, characterCurves, levelCurves };
    } catch (e) {
        console.error('[layout] Failed to preload game data:', e);
        return null;
    }
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const initialGameData = await loadInitialGameData();

    return (
        <html
            lang="en"
            className={`${ropaSans.variable} ${gowunDodum.variable} ${plusJakartaSans.variable}`}
        >
            <body>
                <AppProviders initialGameData={initialGameData}>
                    <Navigation />
                    {children}
                </AppProviders>
            </body>
            {process.env.NODE_ENV === "production" && (
                <GoogleAnalytics gaId="G-SP375JKDPX" />
            )}
        </html>
    );
}
