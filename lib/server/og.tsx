import 'server-only';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

type OgCardVariant = 'site' | 'page' | 'leaderboard-overview' | 'character' | 'weapon' | 'leaderboard';
type OgFont = { name: string; data: Buffer | ArrayBuffer; weight: 400 | 600 | 700 | 800; style: 'normal' };

interface OgCardData {
  variant: OgCardVariant;
  title: string;
  subtitle: string;
  chips: string[];
  artUrl?: string | null;
  secondaryArtUrl?: string | null;
  secondaryLabel?: string | null;
  accentColor?: string;
  element?: string | null;
  metricLabel?: string;
  metricValue?: string;
  detailLabel?: string;
  artKind?: 'character' | 'scene' | 'weapon';
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
const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/u;
const HANGUL_RE = /[\uac00-\ud7af]/u;
const KANA_RE = /[\u3040-\u30ff]/u;
const HAN_RE = /[\u3400-\u9fff\uf900-\ufaff]/u;

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

let fontsPromise: Promise<OgFont[]> | null = null;
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

const cjkFontCache = new Map<string, Promise<OgFont[]>>();

function cjkFamiliesForText(text: string): string[] {
  if (!CJK_RE.test(text)) return [];
  const families = new Set<string>();
  if (KANA_RE.test(text)) families.add('Noto Sans JP');
  if (HANGUL_RE.test(text)) families.add('Noto Sans KR');
  if (HAN_RE.test(text)) families.add('Noto Sans SC');
  return [...families];
}

async function loadGoogleFontSubset(family: string, text: string): Promise<OgFont | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@600&text=${encodeURIComponent(text)}`;
    const css = await (
      await fetch(cssUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(2500),
      })
    ).text();
    const match = css.match(/src:\s*url\(([^)]+)\)\s*format\('(opentype|truetype)'\)/);
    if (!match) return null;
    const res = await fetch(match[1], { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    if (data.byteLength === 0) return null;
    return { name: family, data, weight: 600, style: 'normal' };
  } catch {
    return null;
  }
}

function loadCjkFonts(text: string | undefined): Promise<OgFont[]> {
  if (!text) return Promise.resolve([]);
  const families = cjkFamiliesForText(text);
  if (families.length === 0) return Promise.resolve([]);
  const cacheKey = `${families.join('|')}:${text}`;
  let promise = cjkFontCache.get(cacheKey);
  if (!promise) {
    promise = Promise.all(families.map((family) => loadGoogleFontSubset(family, text))).then((fonts) =>
      fonts.filter((font): font is OgFont => font !== null),
    );
    cjkFontCache.set(cacheKey, promise);
  }
  return promise;
}

async function fetchArt(url: string | null | undefined): Promise<string | null> {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('/')) {
    try {
      const filePath = path.join(process.cwd(), 'public', url.slice(1));
      const source = await readFile(filePath);
      const buf = await sharp(source)
        .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      if (buf.byteLength === 0) return null;
      return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }
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
        lineHeight: 1.18,
        paddingBottom: Math.round(size * 0.06),
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

function renderImage(node: React.ReactElement, fonts: OgFont[]): ImageResponse {
  return new ImageResponse(node, {
    ...OG_SIZE,
    fonts: fonts.length ? fonts : undefined,
  });
}

export async function renderOgCard(data: OgCardData): Promise<ImageResponse> {
  const cjkText = [data.detailLabel, data.secondaryLabel].filter(Boolean).join(' ');
  const [fonts, cjkFonts, artSrc, secondaryArtSrc] = await Promise.all([
    loadFonts(),
    loadCjkFonts(cjkText),
    fetchArt(data.artUrl),
    fetchArt(data.secondaryArtUrl),
  ]);
  const allFonts = [...fonts, ...cjkFonts];
  try {
    return await build(data, artSrc, secondaryArtSrc, allFonts);
  } catch (error) {
    if (!artSrc) throw error;
    return await build(data, null, secondaryArtSrc, allFonts);
  }
}

async function build(
  data: OgCardData,
  artSrc: string | null,
  secondaryArtSrc: string | null,
  fonts: OgFont[],
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
    const wave = await loadWave(waveKeyFor(data));
    const waveW = 300;
    const nameSize = data.title.length > 13 ? 50 : 62;
    const isWeapon = data.artKind === 'weapon';
    const isScene = data.artKind === 'scene';
    const artColumnWidth = isScene ? 600 : 510;
    const subtitleSize = data.subtitle.length > 38 ? 18 : 21;
    return renderImage(
      <div style={{ ...base(), flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start' }}>
        <Vignette />
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
          {/* track + sequence — a line of its own */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              maxWidth: 560,
              fontSize: subtitleSize,
              color: TEXT_MUTED,
              marginTop: 15,
              whiteSpace: 'nowrap',
            }}
          >
            {data.subtitle}
          </div>
          {/* weapon — promoted to its own row with a larger plate */}
          {secondaryArtSrc && data.secondaryLabel && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                maxWidth: 560,
                minWidth: 0,
                marginTop: 14,
                fontFamily: CJK_RE.test(data.secondaryLabel)
                  ? 'Jakarta, Noto Sans JP, Noto Sans KR, Noto Sans SC'
                  : 'Jakarta',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 50,
                  height: 50,
                  flexShrink: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                  border: `1px solid ${accent}55`,
                  background: 'rgba(255,255,255,0.055)',
                }}
              >
                <img alt="" src={secondaryArtSrc} width={40} height={40} style={{ objectFit: 'contain' }} />
              </div>
              <div
                style={{
                  display: 'flex',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: 22,
                  fontWeight: 600,
                  color: TEXT,
                }}
              >
                {data.secondaryLabel}
              </div>
            </div>
          )}
          {data.metricValue && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
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
                <div style={{ display: 'flex', fontSize: 42, fontWeight: 800, lineHeight: 1.05, color: TEXT }}>
                  {data.metricValue}
                </div>
                {data.detailLabel && (
                  <div
                    style={{
                      display: 'flex',
                      fontFamily: CJK_RE.test(data.detailLabel)
                        ? 'Jakarta, Noto Sans JP, Noto Sans KR, Noto Sans SC'
                        : 'Jakarta',
                      fontSize: 15,
                      fontWeight: 600,
                      color: TEXT_MUTED,
                      marginTop: 3,
                    }}
                  >
                    {data.detailLabel}
                  </div>
                )}
              </div>
              {secondaryArtSrc && !data.secondaryLabel && (
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
        {isScene ? (
          <div style={{ display: 'flex', width: artColumnWidth, height: '100%', position: 'relative' }}>
            {/* offset echo plate — a clone of the frame for layered depth (resonance motif) */}
            <div
              style={{
                position: 'absolute',
                top: 140,
                right: 60,
                width: 560,
                height: 384,
                display: 'flex',
                border: `1px solid ${accent}2e`,
                background: 'rgba(7,7,9,0.55)',
              }}
            />
            {/* framed splash */}
            <div
              style={{
                position: 'absolute',
                top: 120,
                right: 40,
                width: 560,
                height: 384,
                display: 'flex',
                overflow: 'hidden',
                border: `1px solid ${accent}5c`,
              }}
            >
              <img alt="" src={artSrc} width={560} height={384} style={{ objectFit: 'cover' }} />
              {/* top edge highlight */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 560,
                  height: 1,
                  display: 'flex',
                  background: `linear-gradient(90deg, transparent, ${accent}b0, transparent)`,
                }}
              />
              {/* bottom grounding gradient */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 560,
                  height: 128,
                  display: 'flex',
                  background: 'linear-gradient(0deg, rgba(9,9,11,0.82) 0%, rgba(9,9,11,0.22) 46%, transparent 100%)',
                }}
              />
            </div>
          </div>
        ) : isWeapon ? (
          <div style={{ display: 'flex', width: artColumnWidth, height: '100%', position: 'relative' }}>
            {/* offset echo plate — clone of the frame for layered depth (resonance motif) */}
            <div
              style={{
                position: 'absolute',
                top: 151,
                left: 94,
                width: 360,
                height: 360,
                display: 'flex',
                border: `1px solid ${accent}2e`,
                background: 'rgba(7,7,9,0.55)',
              }}
            />
            {/* framed weapon — art kept at native 256px inside a 360px matte to avoid upscaling */}
            <div
              style={{
                position: 'absolute',
                top: 135,
                left: 110,
                width: 360,
                height: 360,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                border: `1px solid ${accent}5c`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18))',
              }}
            >
              <img alt="" src={artSrc} width={256} height={256} style={{ objectFit: 'contain' }} />
              {/* top edge highlight */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 360,
                  height: 1,
                  display: 'flex',
                  background: `linear-gradient(90deg, transparent, ${accent}b0, transparent)`,
                }}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: artColumnWidth,
              height: '100%',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: 18,
                bottom: 0,
                width: 430,
                height: 74,
                display: 'flex',
                background: 'linear-gradient(0deg, #131318 0%, rgba(19,19,24,0.58) 42%, transparent 100%)',
              }}
            />
            <img alt="" src={artSrc} width={540} height={592} style={{ objectFit: 'contain' }} />
          </div>
        )}
      </div>,
      fonts,
    );
  }

  // --- centered info card (no art, e.g. leaderboard overview) ---
  const wave = await loadWave(waveKeyFor(data));
  const waveW = 430;
  return renderImage(
    <div style={base()}>
      <Vignette />
      {wave && <img alt="" src={wave} width={waveW} height={Math.round(waveW / WAVE_RATIO)} style={{ marginBottom: 10 }} />}
      <Wordmark text={data.title} size={data.title.length > 18 ? 58 : 72} />
      <div style={{ display: 'flex', fontSize: 24, color: TEXT_MUTED, marginTop: 17, textAlign: 'center' }}>
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
