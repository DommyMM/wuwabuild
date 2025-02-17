import type { Metadata } from "next";
import { Providers } from '@/providers';
import Navigation from '@/components/Navigation';
import 'react-toastify/dist/ReactToastify.css';
import "./globals.css";

export const metadata: Metadata = {
    title: 'WuWa Builds - Wuthering Waves Build Creator',
    description: 'Create and share Wuthering Waves builds with automatic screenshot scanning, real-time stat calculations, and build management tools.',
    metadataBase: new URL('https://wuwabuilds.moe'),
    openGraph: {
        type: 'website',
        title: 'WuWa Builds - Wuthering Waves Build Creator',
        description: 'Create and share Wuthering Waves builds with automatic screenshot scanning',
        url: 'https://wuwabuilds.moe',
        siteName: 'WuWa Builds',
        images: ['/images/card.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'WuWa Builds',
        description: 'Create and share Wuthering Waves builds with automatic screenshot scanning',
        images: ['/images/card.png'],
    }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    <Navigation />
                    {children}
                </Providers>
            </body>
        </html>
    );
}