import 'server-only';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

type OgCardVariant = 'site' | 'page' | 'leaderboard-overview' | 'character' | 'weapon' | 'leaderboard';

interface OgCardData {
  variant: OgCardVariant;
  title: string;
  subtitle: string;
  chips: string[];
  artUrl?: string | null;
  secondaryArtUrl?: string | null;
  accentColor?: string;
  element?: string | null;
  metricLabel?: string;
  metricValue?: string;
  detailLabel?: string;
}

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

// --- palette (matches app design tokens) ---
const GOLD = '#bfad7d';
const GOLD_SOFT = '#cdbe8f';
const TEXT = '#E6E6EA';
const TEXT_MUTED = '#8b8b93';
const SILVER_TEXT = 'linear-gradient(176deg,#ffffff 0%,#ededf3 26%,#bcbcc6 52%,#909099 58%,#dcdce4 78%,#fcfcff 100%)';
const VIGNETTE = 'radial-gradient(125% 135% at 50% 40%, #1d1d23 0%, #131318 46%, #090909 100%)';

const WAVE_RATIO = 1550 / 535; // intrinsic aspect of the tacet waveform asset

const HEX_COLOR_RE = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i;
function normalizeColor(color: string | undefined): string {
  if (!color || !HEX_COLOR_RE.test(color)) return GOLD;
  return color.length === 9 ? color.slice(0, 7) : color;
}

// --- local asset loading (bundled & traced via literal new URL) ---
const WAVE_URLS: Record<string, URL> = {
  gold: new URL('./brand/wave-gold.png', import.meta.url),
  glacio: new URL('./brand/wave-glacio.png', import.meta.url),
  fusion: new URL('./brand/wave-fusion.png', import.meta.url),
  electro: new URL('./brand/wave-electro.png', import.meta.url),
  aero: new URL('./brand/wave-aero.png', import.meta.url),
  spectro: new URL('./brand/wave-spectro.png', import.meta.url),
  havoc: new URL('./brand/wave-havoc.png', import.meta.url),
  rover: new URL('./brand/wave-rover.png', import.meta.url),
};
const FONT_URLS = {
  semibold: new URL('./fonts/PlusJakartaSans-SemiBold.woff', import.meta.url),
  bold: new URL('./fonts/PlusJakartaSans-Bold.woff', import.meta.url),
  extrabold: new URL('./fonts/PlusJakartaSans-ExtraBold.woff', import.meta.url),
};
const BRAND_MARK_URL = new URL('./brand/burst-gold.png', import.meta.url);

const ELEMENT_WAVES = new Set(['glacio', 'fusion', 'electro', 'aero', 'spectro', 'havoc', 'rover']);
function waveKeyFor(data: OgCardData): string {
  const e = (data.element ?? '').toLowerCase();
  return ELEMENT_WAVES.has(e) ? e : 'gold';
}

const dataUriCache = new Map<string, Promise<string>>();
function loadWave(key: string): Promise<string> {
  const k = WAVE_URLS[key] ? key : 'gold';
  let p = dataUriCache.get(k);
  if (!p) {
    p = readFile(fileURLToPath(WAVE_URLS[k]))
      .then((buf) => `data:image/png;base64,${buf.toString('base64')}`)
      .catch(() => '');
    dataUriCache.set(k, p);
  }
  return p;
}

function loadBrandMark(): Promise<string> {
  const k = 'brand:burst-gold';
  let p = dataUriCache.get(k);
  if (!p) {
    p = readFile(fileURLToPath(BRAND_MARK_URL))
      .then((buf) => `data:image/png;base64,${buf.toString('base64')}`)
      .catch(() => '');
    dataUriCache.set(k, p);
  }
  return p;
}

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 600 | 700 | 800; style: 'normal' }[]> | null = null;
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      readFile(fileURLToPath(FONT_URLS.semibold)),
      readFile(fileURLToPath(FONT_URLS.bold)),
      readFile(fileURLToPath(FONT_URLS.extrabold)),
    ])
      .then(([sb, b, eb]) => [
        { name: 'Jakarta', data: sb, weight: 600 as const, style: 'normal' as const },
        { name: 'Jakarta', data: b, weight: 700 as const, style: 'normal' as const },
        { name: 'Jakarta', data: eb, weight: 800 as const, style: 'normal' as const },
      ])
      .catch(() => []);
  }
  return fontsPromise;
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
    return `data:${ct};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

// --- shared pieces ---
function Vignette() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '56%',
        height: 1,
        display: 'flex',
        background: 'linear-gradient(90deg, transparent, rgba(191,173,125,0.45), transparent)',
      }}
    />
  );
}

function Wordmark({ text, size }: { text: string; size: number }) {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1,
        letterSpacing: '-0.01em',
        backgroundImage: SILVER_TEXT,
        backgroundClip: 'text',
        WebkitBackgroundClip: 'text',
        color: 'transparent',
      }}
    >
      {text}
    </div>
  );
}

function Tagline() {
  return (
    <div
      style={{
        display: 'flex',
        fontSize: 20,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.42em',
        color: GOLD_SOFT,
        marginTop: 24,
      }}
    >
      SCAN&nbsp;&nbsp;·&nbsp;&nbsp;BUILD&nbsp;&nbsp;·&nbsp;&nbsp;RANK
    </div>
  );
}

function Star({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'flex' }}>
      <path
        d="M12 0 C13 7 17 11 24 12 C17 13 13 17 12 24 C11 17 7 13 0 12 C7 11 11 7 12 0 Z"
        fill={color}
      />
    </svg>
  );
}

function Chip({ text, accent }: { text: string; accent: string }) {
  const star = text.includes('★');
  const label = star ? text.replace('★', '').trim() : text;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${accent}55`,
        fontSize: 16,
        fontWeight: 600,
        color: TEXT,
      }}
    >
      {label}
      {star && <Star color={GOLD} size={15} />}
    </div>
  );
}

function BrandStamp({ mark }: { mark?: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 34,
        left: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: '0.01em',
      }}
    >
      {mark && <img alt="" src={mark} width={21} height={21} style={{ objectFit: 'contain' }} />}
      <span style={{ display: 'flex', color: '#f2f2f5' }}>WuWa</span>
      <span style={{ display: 'flex', color: GOLD }}>Builds</span>
    </div>
  );
}

function renderImage(node: React.ReactElement, fonts: Awaited<ReturnType<typeof loadFonts>>): ImageResponse {
  return new ImageResponse(node, {
    ...OG_SIZE,
    fonts: fonts.length ? fonts : undefined,
  });
}

export async function renderOgCard(data: OgCardData): Promise<ImageResponse> {
  const [fonts, artSrc, secondaryArtSrc] = await Promise.all([
    loadFonts(),
    fetchArt(data.artUrl),
    fetchArt(data.secondaryArtUrl),
  ]);
  try {
    return await build(data, artSrc, secondaryArtSrc, fonts);
  } catch (error) {
    if (!artSrc) throw error;
    return await build(data, null, secondaryArtSrc, fonts);
  }
}

async function build(
  data: OgCardData,
  artSrc: string | null,
  secondaryArtSrc: string | null,
  fonts: Awaited<ReturnType<typeof loadFonts>>,
): Promise<ImageResponse> {
  const accent = normalizeColor(data.accentColor);
  const chips = data.chips.filter((c) => c.trim().length > 0).slice(0, 3);

  // --- brand hero (homepage / fallback) ---
  if (data.variant === 'site') {
    const wave = await loadWave('gold');
    const waveW = 520;
    return renderImage(
      <div style={base()}>
        <Vignette />
        {wave && <img alt="" src={wave} width={waveW} height={Math.round(waveW / WAVE_RATIO)} style={{ marginBottom: 8 }} />}
        <Wordmark text="WuWaBuilds" size={82} />
        <Tagline />
      </div>,
      fonts,
    );
  }

  // --- entity cards with art (character / weapon / leaderboard) ---
  if (artSrc) {
    const [wave, brandMark] = await Promise.all([loadWave(waveKeyFor(data)), loadBrandMark()]);
    const waveW = 300;
    const nameSize = data.title.length > 13 ? 50 : 62;
    return renderImage(
      <div style={{ ...base(), flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start' }}>
        <Vignette />
        <BrandStamp mark={brandMark} />
        {/* element glow on the art side */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: 680,
            height: '100%',
            display: 'flex',
            background: `radial-gradient(60% 60% at 78% 50%, ${accent}33, transparent 70%)`,
          }}
        />
        {/* left text column */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '18px 56px 0',
            flex: 1,
            maxWidth: 690,
          }}
        >
          <Wordmark text={data.title} size={nameSize} />
          {wave && (
            <img alt="" src={wave} width={waveW} height={Math.round(waveW / WAVE_RATIO)} style={{ marginTop: 14 }} />
          )}
          <div style={{ display: 'flex', fontSize: 21, color: TEXT_MUTED, marginTop: 15 }}>{data.subtitle}</div>
          {data.metricValue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {data.metricLabel && (
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 14,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      color: GOLD_SOFT,
                    }}
                  >
                    {data.metricLabel}
                  </div>
                )}
                <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, lineHeight: 1.05, color: TEXT }}>
                  {data.metricValue}
                </div>
                {data.detailLabel && (
                  <div style={{ display: 'flex', fontSize: 15, fontWeight: 600, color: TEXT_MUTED, marginTop: 3 }}>
                    {data.detailLabel}
                  </div>
                )}
              </div>
              {secondaryArtSrc && (
                <div
                  style={{
                    display: 'flex',
                    width: 70,
                    height: 70,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    border: `1px solid ${accent}55`,
                    background: 'rgba(255,255,255,0.055)',
                  }}
                >
                  <img alt="" src={secondaryArtSrc} width={58} height={58} style={{ objectFit: 'contain' }} />
                </div>
              )}
            </div>
          )}
          {chips.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: data.metricValue ? 18 : 20, flexWrap: 'wrap' }}>
              {chips.map((chip) => (
                <Chip key={chip} text={chip} accent={accent} />
              ))}
            </div>
          )}
        </div>
        {/* right art */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 510,
            height: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 230,
              height: '100%',
              display: 'flex',
              background: 'linear-gradient(90deg, #131318 0%, rgba(19,19,24,0.92) 22%, rgba(19,19,24,0.28) 66%, transparent 100%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 18,
              bottom: 0,
              width: 430,
              height: 92,
              display: 'flex',
              background: 'linear-gradient(0deg, #131318 10%, rgba(19,19,24,0.76) 42%, transparent 100%)',
            }}
          />
          <img alt="" src={artSrc} width={470} height={540} style={{ objectFit: 'contain' }} />
        </div>
      </div>,
      fonts,
    );
  }

  // --- centered info card (no art, e.g. leaderboard overview) ---
  const wave = await loadWave(waveKeyFor(data));
  const waveW = 360;
  return renderImage(
    <div style={base()}>
      <Vignette />
      {wave && <img alt="" src={wave} width={waveW} height={Math.round(waveW / WAVE_RATIO)} style={{ marginBottom: 10 }} />}
      <Wordmark text={data.title} size={data.title.length > 18 ? 52 : 64} />
      <div style={{ display: 'flex', fontSize: 24, color: TEXT_MUTED, marginTop: 16, textAlign: 'center' }}>
        {data.subtitle}
      </div>
    </div>,
    fonts,
  );
}

function base(): React.CSSProperties {
  return {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: VIGNETTE,
    fontFamily: 'Jakarta',
    color: TEXT,
    position: 'relative',
    overflow: 'hidden',
  };
}

export function renderFallbackCard(): Promise<ImageResponse> {
  return renderOgCard({
    variant: 'site',
    title: 'WuWaBuilds',
    subtitle: 'Wuthering Waves builds, scanner & leaderboards',
    chips: [],
  });
}
