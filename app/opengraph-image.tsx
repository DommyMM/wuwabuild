import { OG_SIZE, OG_CONTENT_TYPE, renderFallbackCard } from '@/lib/server/og';

export const alt = 'WuWa Builds – Wuthering Waves Build Creator';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  return renderFallbackCard();
}
