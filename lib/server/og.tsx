import 'server-only';
import { ImageResponse } from 'next/og';

type OgCardVariant = 'site' | 'leaderboard-overview' | 'character' | 'weapon' | 'leaderboard';

interface OgCardData {
  variant: OgCardVariant;
  title: string;
  subtitle: string;
  chips: string[];
  artUrl?: string | null;
  accentColor?: string;
}

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

const GOLD = '#D4A843';
const BG = '#0E0E10';
const SURFACE = '#1A1A1E';
const TEXT = '#EEEEEE';
const TEXT_MUTED = '#999999';

const HEX_COLOR_RE = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;

function normalizeColor(color: string | undefined): string {
  if (!color || !HEX_COLOR_RE.test(color)) return GOLD;
  return color.length === 9 ? color.slice(0, 7) : color;
}

async function fetchArt(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.toLowerCase().startsWith('image/')) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return null;
    const base64 = Buffer.from(buf).toString('base64');
    return `data:${ct};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function renderOgCard(data: OgCardData): Promise<ImageResponse> {
  const artSrc = await fetchArt(data.artUrl);

  try {
    return renderOgCardResponse(data, artSrc);
  } catch (error) {
    if (!artSrc) throw error;
    return renderOgCardResponse(data, null);
  }
}

function renderOgCardResponse(data: OgCardData, artSrc: string | null): ImageResponse {
  const accent = normalizeColor(data.accentColor);
  const chips = data.chips.filter((chip) => chip.trim().length > 0).slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: BG,
          fontFamily: 'Arial, sans-serif',
          color: TEXT,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, background: accent, display: 'flex' }} />

        {/* Left content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 64px',
            flex: 1,
            maxWidth: artSrc ? '700px' : '100%',
            gap: 16,
          }}
        >
          {/* Site tag */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: artSrc ? 'flex-start' : 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent, display: 'flex' }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: 2 }}>
              wuwa.build
            </span>
          </div>

          {/* Title */}
          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15, display: 'flex', flexWrap: 'wrap' }}>
            {data.title}
          </div>

          {/* Subtitle */}
          <div style={{ fontSize: 22, color: TEXT_MUTED, lineHeight: 1.4, display: 'flex' }}>
            {data.subtitle}
          </div>

          {/* Chips */}
          {chips.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: artSrc ? 'flex-start' : 'center' }}>
              {chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: 'flex',
                    padding: '8px 18px',
                    borderRadius: 999,
                    background: SURFACE,
                    border: `1px solid ${accent}33`,
                    fontSize: 16,
                    fontWeight: 600,
                    color: TEXT,
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right art */}
        {artSrc && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 500,
              height: '100%',
              position: 'relative',
            }}
          >
            {/* Gradient overlay to blend art into bg */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 120,
                height: '100%',
                background: `linear-gradient(to right, ${BG}, transparent)`,
                display: 'flex',
              }}
            />
            <img
              alt=""
              src={artSrc}
              width={460}
              height={540}
              style={{ objectFit: 'contain', objectPosition: 'center' }}
            />
          </div>
        )}

        {/* Bottom border accent */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 2, background: `${accent}44`, display: 'flex' }} />
      </div>
    ),
    {
      ...OG_SIZE,
    },
  );
}

export function renderFallbackCard(): Promise<ImageResponse> {
  return renderOgCard({
    variant: 'site',
    title: 'WuWa Builds',
    subtitle: 'Build maker, showcase cards, OCR scanner, and global damage leaderboards',
    chips: ['Build Maker', 'Showcase Cards', 'Leaderboards'],
  });
}
