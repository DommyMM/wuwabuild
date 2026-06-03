import type { Metadata } from 'next';
import { SavesPageClient } from '@/components/save/SavesPageClient';

export const metadata: Metadata = {
  title: 'My Saved Builds',
  description: 'Manage local Wuthering Waves builds, organize saved setups, and export or import build data',
  openGraph: {
    title: 'My Saved Builds',
    description: 'Manage local Wuthering Waves builds, organize saved setups, and export or import build data',
    url: 'https://wuwa.build/saves',
    images: [{ url: 'https://wuwa.build/api/og/saves', width: 1200, height: 630, alt: 'My Saved Builds' }],
  },
  twitter: {
    title: 'My Saved Builds',
    description: 'Manage local Wuthering Waves builds, organize saved setups, and export or import build data',
    images: ['https://wuwa.build/api/og/saves'],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function Saves() {
  return <SavesPageClient />;
}
