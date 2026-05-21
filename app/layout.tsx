import type { Metadata, Viewport } from "next";
import { Gowun_Dodum, Plus_Jakarta_Sans, Ropa_Sans } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from "@vercel/analytics/next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { RootProviders } from "@/contexts/index";
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
    metadataBase: new URL('https://wuwa.build'),
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
        url: 'https://wuwa.build',
        siteName: 'WuWa Builds',
        title: 'WuWa Builds - Wuthering Waves Build Creator & Showcase',
        description: 'Create and share Wuthering Waves character build cards. Flex your best setups with our custom build maker, automatic OCR scanner, and real-time damage calculator.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WuWa Builds - Wuthering Waves Build Creator & Showcase',
        description: 'Create and share Wuthering Waves character build cards. Flex your best setups with our custom build maker, automatic OCR scanner, and real-time damage calculator.',
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

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            className={`${ropaSans.variable} ${gowunDodum.variable} ${plusJakartaSans.variable}`}
        >
            <body className="flex min-h-screen flex-col bg-background text-text-primary">
                <RootProviders>
                    <Navigation />
                    <div className="flex-1">
                        {children}
                    </div>
                    <Footer />
                </RootProviders>
                <Analytics />
                {process.env.NODE_ENV === "production" && (
                    <GoogleAnalytics gaId="G-SP375JKDPX" />
                )}
            </body>
        </html>
    );
}
