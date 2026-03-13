import type { Metadata } from 'next';
import { SavesPageClient } from '@/components/save/SavesPageClient';

export const metadata: Metadata = {
  title: 'My Saved Builds',
  description: 'Manage and organize your saved Wuthering Waves character builds. Export your data or import builds from others.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function Saves() {
  return <SavesPageClient />;
}
