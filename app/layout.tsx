import type { Metadata, Viewport } from "next";
import { Gowun_Dodum, Plus_Jakarta_Sans, Ropa_Sans, Spline_Sans_Mono } from "next/font/google";
import Script from "next/script";
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

const splineSansMono = Spline_Sans_Mono({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-spline-mono-next",
});

const GA_ID = "G-SP375JKDPX";
export const metadata: Metadata = {
    metadataBase: new URL('https://wuwa.build'),
    title: {
        default: 'WuWaBuilds - Wuthering Waves Builds & Leaderboards',
        template: '%s | WuWaBuilds'
    },
    description: 'Scan, build, and rank Wuthering Waves characters with imported stats, editable builds, showcase cards, and damage leaderboards.',
    keywords: ['Wuthering Waves', 'WuWa', 'wuwa builds', 'WuWaBuilds', 'wuwa build maker', 'wuwa leaderboards', 'showcase card', 'screenshot scanner', 'damage calculator', 'build creator', 'character builds', 'echo builds'],
    authors: [{ name: 'WuWaBuilds' }],
    creator: 'WuWaBuilds',
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://wuwa.build',
        siteName: 'WuWaBuilds',
        title: 'WuWaBuilds - Wuthering Waves Builds & Leaderboards',
        description: 'Scan, build, and rank Wuthering Waves characters with imported stats, editable builds, showcase cards, and damage leaderboards.',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WuWaBuilds - Wuthering Waves Builds & Leaderboards',
        description: 'Scan, build, and rank Wuthering Waves characters with imported stats, editable builds, showcase cards, and damage leaderboards.',
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
            className={`${ropaSans.variable} ${gowunDodum.variable} ${plusJakartaSans.variable} ${splineSansMono.variable}`}
        >
            <body className="flex min-h-screen flex-col bg-background text-text-primary">
                <RootProviders>
                    <a
                        href="#main-content"
                        className="fixed left-3 top-3 z-100 -translate-y-20 rounded-md bg-accent px-3 py-2 font-semibold text-background shadow-lg transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                        Skip to Main Content
                    </a>
                    <Navigation />
                    <div id="main-content" tabIndex={-1} className="flex-1">
                        {children}
                    </div>
                    <Footer />
                </RootProviders>
                <Analytics />
                {process.env.NODE_ENV === "production" && (
                    <>
                        <Script
                            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                            strategy="lazyOnload"
                        />
                        <Script id="google-analytics" strategy="lazyOnload">
                            {`
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${GA_ID}');
                            `}
                        </Script>
                    </>
                )}
            </body>
        </html>
    );
}
