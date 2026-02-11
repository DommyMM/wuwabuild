import type { Metadata, Viewport } from "next";
import Navigation from "@/components/Navigation";
import { AppProviders } from "@/contexts";
import "./globals.css";

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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <AppProviders>
                    <Navigation />
                    {children}
                </AppProviders>
            </body>
        </html>
    );
}
