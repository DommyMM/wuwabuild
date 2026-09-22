import type { Metadata } from 'next';
import { socialMetadata } from '@/lib/metadata';
import { SavesPageClient } from '@/components/save/SavesPageClient';

const PAGE_TITLE = 'My Saved Builds';
const PAGE_DESCRIPTION = 'Manage local Wuthering Waves builds, organize saved setups, and export or import build data';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  ...socialMetadata({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/saves', image: 'https://wuwa.build/api/og/saves' }),
  robots: {
    index: false,
    follow: false,
  },
};

export default function Saves() {
  return <SavesPageClient />;
}
