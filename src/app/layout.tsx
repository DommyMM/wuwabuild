import type { Metadata } from "next";
import { Providers } from '@/providers';
import Navigation from '@/components/Navigation';
import 'react-toastify/dist/ReactToastify.css';
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL('https://wuwabuilds.moe'),
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