import 'server-only';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type OgCardVariant = 'site' | 'leaderboard-overview' | 'character' | 'weapon' | 'leaderboard';

export interface OgCardData {
  variant: OgCardVariant;
  title: string;
  subtitle: string;
  chips: string[];
  artUrl?: string | null;
  accentColor?: string;
}

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';
export const OG_ALT_PREFIX = 'WuWa Builds';

const GOLD = '#D4A843';
const BG = '#0E0E10';
const SURFACE = '#1A1A1E';
const TEXT = '#EEEEEE';
const TEXT_MUTED = '#999999';

async function loadFonts() {
  const fontData = await readFile(join(process.cwd(), 'assets', 'PlusJakartaSans-VariableFont_wght.ttf'));
  return [
    { name: 'PlusJakarta', data: Buffer.from(fontData), style: 'normal' as const, weight: 600 as const },
  ];
}

async function fetchArt(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString('base64');
    const ct = res.headers.get('content-type') ?? 'image/png';
    return `data:${ct};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function renderOgCard(data: OgCardData): Promise<ImageResponse> {
  const [fonts, artSrc] = await Promise.all([
    loadFonts(),
    fetchArt(data.artUrl),
  ]);

  const accent = data.accentColor || GOLD;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: BG,
          fontFamily: 'PlusJakarta',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
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
          {data.chips.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {data.chips.slice(0, 3).map((chip) => (
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
      fonts,
    },
  );
}

export function renderFallbackCard(): Promise<ImageResponse> {
  return renderOgCard({
    variant: 'site',
    title: 'WuWa Builds',
    subtitle: 'Build creator, OCR import, and leaderboards for Wuthering Waves',
    chips: ['Import', 'Builds', 'Leaderboards'],
  });
}
