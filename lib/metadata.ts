import type { Metadata } from 'next';

export const SITE_URL = 'https://wuwa.build';

interface SocialPage {
  title: string;
  description: string;
  /** Route path starting with a slash, which becomes the og:url */
  path: string;
  /** Absolute preview image URL, omitted to fall through to the root opengraph-image route */
  image?: string;
}

/**
 * openGraph and twitter blocks for one page
 *
 * - Next replaces a parent's openGraph object instead of merging it, so a page block has to restate the site fields
 * - Discord and Slack show og:site_name above the title, which every board and dossier preview was missing
 */
export function socialMetadata({ title, description, path, image }: SocialPage): Pick<Metadata, 'openGraph' | 'twitter'> {
  return {
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'WuWaBuilds',
      title,
      description,
      url: `${SITE_URL}${path}`,
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: title }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
