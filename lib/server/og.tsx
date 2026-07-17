import 'server-only';
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

type OgCardVariant = 'site' | 'page' | 'tool' | 'index' | 'leaderboard-overview' | 'character' | 'weapon' | 'leaderboard';
type OgFont = { name: string; data: Buffer | ArrayBuffer; weight: 400 | 600 | 700 | 800; style: 'normal' };
export type OgVerb = 'SCAN' | 'BUILD' | 'RANK';
export type OgMotif = 'scan' | 'card' | 'stack' | 'search';

/** One entry in the right-hand data column of an `index` card (e.g. a top board). */
export interface OgRow {
  iconUrl?: string | null;
  label: string;
  sub?: string;
  value?: string;
  valueSub?: string;
}

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
  /** Lit verbs in the SCAN · BUILD · RANK tagline nav; omit to hide the nav. */
  verbs?: readonly OgVerb[];
  /** Abstract product motif for `tool` cards. */
  motif?: OgMotif;
  /** Live data rows for `index` cards; falls back to the centered card when empty. */
  rows?: OgRow[];
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
  let remoteUrl = url;
  if (url.startsWith('/')) {
    // Site-relative asset (public/assets mirror). Disk read works in dev and
    // anywhere the file got traced into the bundle; on Vercel, functions only
    // contain traced files and public/ is served from the CDN instead — so a
    // failed read falls through to fetching our own origin.
    try {
      const filePath = path.join(process.cwd(), 'public', url.slice(1));
      const source = await readFile(filePath);
      const buf = await sharp(source)
        .resize({ width: 900, height: 900, fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
      if (buf.byteLength > 0) return `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      // fall through to origin fetch
    }
    remoteUrl = `https://wuwa.build${url}`;
  }
  try {
    const res = await fetch(remoteUrl, { signal: AbortSignal.timeout(4000) });
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

// The tagline doubles as a nav: each tool family owns one verb, and the card
// for that family lights its verb while the others stay dim. The root card
// lights all three.
const TAGLINE_VERBS = ['SCAN', 'BUILD', 'RANK'] as const;

function TaglineNav({ active, marginTop = 24, size = 20 }: { active: readonly OgVerb[]; marginTop?: number; size?: number }) {
  const items: React.ReactNode[] = [];
  TAGLINE_VERBS.forEach((verb, i) => {
    if (i > 0) {
      items.push(
        <div key={`dot-${i}`} style={{ display: 'flex', color: 'rgba(191,173,125,0.45)', fontSize: size - 2 }}>
          ·
        </div>,
      );
    }
    const on = active.includes(verb);
    items.push(
      <div
        key={verb}
        style={{
          display: 'flex',
          color: on ? GOLD_SOFT : '#55555d',
          ...(on ? { textShadow: '0 0 18px rgba(191,173,125,0.45)' } : {}),
        }}
      >
        {verb}
      </div>,
    );
  });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size >= 20 ? 20 : 14,
        marginTop,
        fontSize: size,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: size >= 20 ? '0.42em' : '0.34em',
      }}
    >
      {items}
    </div>
  );
}

// Frequency-ruler ticks along the bottom edge — instrument chrome.
function TickRuler() {
  return (
    <div
      style={{
        position: 'absolute',
        left: 64,
        right: 64,
        bottom: 26,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}
    >
      {Array.from({ length: 61 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            width: 1,
            height: i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6,
            background: i % 10 === 0 ? 'rgba(191,173,125,0.38)' : 'rgba(191,173,125,0.18)',
          }}
        />
      ))}
    </div>
  );
}

// --- abstract product motifs (tool cards) ---
// Wireframe abstractions of each tool's UI: neutral bars on plates, gold only
// where the tool's "action" happens. No text, so they never fight the title.
const BAR = 'rgba(255,255,255,0.11)';
const BAR_SOFT = 'rgba(255,255,255,0.07)';
const PLATE_BG = 'rgba(255,255,255,0.045)';
const PLATE_BORDER = 'rgba(255,255,255,0.10)';

function Bar({ w, h = 8, bg = BAR, r = 4 }: { w: number | string; h?: number; bg?: string; r?: number }) {
  return <div style={{ display: 'flex', width: w, height: h, background: bg, borderRadius: r }} />;
}

function Dot({ size = 10, bg = BAR }: { size?: number; bg?: string }) {
  return <div style={{ display: 'flex', width: size, height: size, borderRadius: 999, background: bg, flexShrink: 0 }} />;
}

function StatRows({ count, width, hot = -1 }: { count: number; width: number; hot?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13, width }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Dot bg={i === hot ? `${GOLD}cc` : BAR} />
          <Bar w={width - 66} bg={i === hot ? `${GOLD}59` : BAR} />
          <Bar w={36} bg={i === hot ? `${GOLD}cc` : BAR} />
        </div>
      ))}
    </div>
  );
}

// Import: viewfinder brackets + an echo panel mid-scan.
function ScanMotif() {
  const corners: React.CSSProperties[] = [
    { top: 0, left: 0, borderTop: `3px solid ${GOLD}`, borderLeft: `3px solid ${GOLD}` },
    { top: 0, right: 0, borderTop: `3px solid ${GOLD}`, borderRight: `3px solid ${GOLD}` },
    { bottom: 0, left: 0, borderBottom: `3px solid ${GOLD}`, borderLeft: `3px solid ${GOLD}` },
    { bottom: 0, right: 0, borderBottom: `3px solid ${GOLD}`, borderRight: `3px solid ${GOLD}` },
  ];
  return (
    <div style={{ position: 'relative', display: 'flex', width: 360, height: 372, alignItems: 'center', justifyContent: 'center' }}>
      {corners.map((style, i) => (
        <div key={i} style={{ position: 'absolute', display: 'flex', width: 46, height: 46, opacity: 0.8, ...style }} />
      ))}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          width: 252,
          padding: '22px 24px',
          borderRadius: 16,
          background: PLATE_BG,
          border: `1px solid ${PLATE_BORDER}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <Dot size={46} bg={BAR_SOFT} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bar w={104} h={11} />
            <Bar w={64} bg={BAR_SOFT} />
          </div>
        </div>
        <StatRows count={4} width={204} />
      </div>
      {/* the scan line is the one gold action in the frame */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          right: 16,
          top: 172,
          height: 2,
          display: 'flex',
          background: `linear-gradient(90deg, transparent 0%, ${GOLD} 18%, ${GOLD} 82%, transparent 100%)`,
          boxShadow: `0 0 18px ${GOLD}66`,
        }}
      />
    </div>
  );
}

// Edit: a showcase-card fragment mid-tune (one stat row hot) with its echo
// afterimage behind it — same tilt, or it reads as a second panel.
function CardMotif() {
  return (
    <div style={{ position: 'relative', display: 'flex', width: 330, height: 380 }}>
      <div
        style={{
          position: 'absolute',
          top: 44,
          left: 48,
          width: 262,
          height: 302,
          display: 'flex',
          borderRadius: 18,
          border: `1px solid ${GOLD}3d`,
          transform: 'rotate(-2deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 26,
          left: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 17,
          width: 262,
          padding: '24px 26px',
          borderRadius: 18,
          background: 'rgba(255,255,255,0.06)',
          border: `1px solid ${GOLD}66`,
          transform: 'rotate(-2deg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <Dot size={48} bg={BAR_SOFT} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Bar w={110} h={11} />
            <Bar w={70} bg={BAR_SOFT} />
          </div>
        </div>
        <StatRows count={5} width={210} hot={2} />
        <div style={{ display: 'flex', gap: 9 }}>
          <Bar w={52} h={16} bg={BAR_SOFT} r={999} />
          <Bar w={52} h={16} bg={BAR_SOFT} r={999} />
          <Bar w={52} h={16} bg={BAR_SOFT} r={999} />
        </div>
      </div>
    </div>
  );
}

// Saves: a cascade of stored cards.
function StackMotif() {
  const plate = (offset: number, opacity: number, content: boolean) => (
    <div
      key={offset}
      style={{
        position: 'absolute',
        top: 40 + offset,
        left: 40 + offset,
        width: 280,
        height: 210,
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
        padding: '20px 24px',
        borderRadius: 18,
        background: content ? 'rgba(255,255,255,0.06)' : 'rgba(19,19,24,0.9)',
        border: `1px solid ${content ? `${GOLD}66` : PLATE_BORDER}`,
        opacity,
      }}
    >
      {content && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Dot size={42} bg={BAR_SOFT} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Bar w={96} h={10} />
            <Bar w={58} bg={BAR_SOFT} />
          </div>
        </div>
      )}
      {content && <StatRows count={3} width={232} />}
    </div>
  );
  return (
    <div style={{ position: 'relative', display: 'flex', width: 400, height: 340 }}>
      {plate(64, 0.35, false)}
      {plate(32, 0.6, false)}
      {plate(0, 1, true)}
    </div>
  );
}

// Profiles: a search pill over dimmed result rows.
function SearchMotif() {
  const resultRow = (opacity: number) => (
    <div
      key={opacity}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: '13px 18px',
        borderRadius: 14,
        background: PLATE_BG,
        border: `1px solid ${PLATE_BORDER}`,
        opacity,
      }}
    >
      <Dot size={40} bg={BAR_SOFT} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
        <Bar w={124} h={10} />
        <Bar w={76} bg={BAR_SOFT} />
      </div>
      <Bar w={44} h={18} bg={`${GOLD}33`} r={999} />
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: 396 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 15,
          height: 62,
          padding: '0 24px',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.055)',
          border: `1px solid ${GOLD}66`,
        }}
      >
        <svg width={22} height={22} viewBox="0 0 24 24" style={{ display: 'flex' }}>
          <circle cx="10" cy="10" r="7" fill="none" stroke={GOLD_SOFT} strokeWidth="2.5" />
          <path d="M15.5 15.5 L21 21" stroke={GOLD_SOFT} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div style={{ display: 'flex', fontSize: 19, fontWeight: 600, color: TEXT_MUTED }}>UID or username</div>
      </div>
      {resultRow(1)}
      {resultRow(0.55)}
    </div>
  );
}

const MOTIFS: Record<OgMotif, () => React.ReactElement> = {
  scan: ScanMotif,
  card: CardMotif,
  stack: StackMotif,
  search: SearchMotif,
};

// One live-data row on an index card (top boards, top builds).
function RowPlate({ index, row, artSrc }: { index: number; row: OgRow; artSrc: string | null }) {
  const cjk = CJK_RE.test(`${row.label} ${row.sub ?? ''}`);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 15,
        width: '100%',
        padding: '13px 20px',
        borderRadius: 16,
        background: PLATE_BG,
        border: `1px solid ${index === 0 ? `${GOLD}66` : PLATE_BORDER}`,
        fontFamily: cjk ? 'Jakarta, Noto Sans JP, Noto Sans KR, Noto Sans SC' : 'Jakarta',
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 24,
          justifyContent: 'center',
          fontSize: 22,
          fontWeight: 800,
          color: index === 0 ? GOLD : '#6a6a72',
        }}
      >
        {index + 1}
      </div>
      {artSrc && (
        <img
          alt=""
          src={artSrc}
          width={54}
          height={54}
          style={{ borderRadius: 999, flexShrink: 0, background: BAR_SOFT }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 700,
            color: TEXT,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 250,
          }}
        >
          {row.label}
        </div>
        {row.sub && (
          <div style={{ display: 'flex', fontSize: 14, fontWeight: 600, color: TEXT_MUTED, marginTop: 2 }}>
            {row.sub}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {row.value && (
          <div style={{ display: 'flex', fontSize: 23, fontWeight: 800, color: TEXT }}>{row.value}</div>
        )}
        {row.valueSub && (
          <div
            style={{
              display: 'flex',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: GOLD_SOFT,
              marginTop: 2,
            }}
          >
            {row.valueSub}
          </div>
        )}
      </div>
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
  const rows = data.rows ?? [];
  const cjkText = [data.detailLabel, data.secondaryLabel, ...rows.flatMap((row) => [row.label, row.sub])]
    .filter(Boolean)
    .join(' ');
  const [fonts, cjkFonts, artSrc, secondaryArtSrc, rowArts] = await Promise.all([
    loadFonts(),
    loadCjkFonts(cjkText),
    fetchArt(data.artUrl),
    fetchArt(data.secondaryArtUrl),
    Promise.all(rows.map((row) => fetchArt(row.iconUrl))),
  ]);
  const allFonts = [...fonts, ...cjkFonts];
  try {
    return await build(data, artSrc, secondaryArtSrc, rowArts, allFonts);
  } catch (error) {
    if (!artSrc) throw error;
    return await build(data, null, secondaryArtSrc, rowArts, allFonts);
  }
}

async function build(
  data: OgCardData,
  artSrc: string | null,
  secondaryArtSrc: string | null,
  rowArts: (string | null)[],
  fonts: OgFont[],
): Promise<ImageResponse> {
  const accent = normalizeColor(data.accentColor);
  const chips = data.chips.filter((c) => c.trim().length > 0).slice(0, 3);

  // --- brand hero (homepage / fallback) ---
  if (data.variant === 'site') {
    const wave = await loadWave('gold');
    const waveW = 660;
    return renderImage(
      <div style={base()}>
        <Vignette />
        <TickRuler />
        {wave && <img alt="" src={wave} width={waveW} height={Math.round(waveW / WAVE_RATIO)} />}
        <Wordmark text="WuWaBuilds" size={88} />
        <TaglineNav active={TAGLINE_VERBS} />
      </div>,
      fonts,
    );
  }

  // --- tool / index cards: left text column, right motif or live-data rows ---
  if (data.variant === 'tool' || data.variant === 'index') {
    const rows = (data.rows ?? []).slice(0, 3);
    const hasRows = data.variant === 'index' && rows.length > 0;
    const Motif = data.motif ? MOTIFS[data.motif] : null;
    if (hasRows || Motif) {
      const wave = await loadWave(waveKeyFor(data));
      const waveW = 300;
      const nameSize = data.title.length > 13 ? 52 : 60;
      return renderImage(
        <div style={{ ...base(), flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start' }}>
          <Vignette />
          <TickRuler />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '10px 0 30px 56px',
              flex: 1,
              maxWidth: 620,
            }}
          >
            <Wordmark text={data.title} size={nameSize} />
            {wave && (
              <img alt="" src={wave} width={waveW} height={Math.round(waveW / WAVE_RATIO)} style={{ marginTop: 14 }} />
            )}
            <div style={{ display: 'flex', fontSize: 21, color: TEXT_MUTED, marginTop: 15, maxWidth: 520 }}>
              {data.subtitle}
            </div>
            {data.verbs && <TaglineNav active={data.verbs} size={16} marginTop={28} />}
          </div>
          <div
            style={{
              display: 'flex',
              width: 520,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 48px 30px 0',
            }}
          >
            {hasRows ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13, width: '100%' }}>
                {rows.map((row, i) => (
                  <RowPlate key={`${row.label}-${i}`} index={i} row={row} artSrc={rowArts[i] ?? null} />
                ))}
              </div>
            ) : (
              Motif && <Motif />
            )}
          </div>
        </div>,
        fonts,
      );
    }
    // no data and no motif: fall through to the centered card
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
        <TickRuler />
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
          {/* track + sequence — the board identity gets kicker treatment, wiki
              subtitles stay a muted sentence */}
          {data.variant === 'leaderboard' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                fontSize: 17,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: GOLD_SOFT,
                marginTop: 16,
                whiteSpace: 'nowrap',
              }}
            >
              {data.subtitle}
            </div>
          ) : (
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
          )}
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
                <div style={{ display: 'flex', fontSize: 48, fontWeight: 800, lineHeight: 1.05, color: TEXT }}>
                  {data.metricValue}
                </div>
                {data.detailLabel && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5 }}>
                    {data.variant === 'leaderboard' && <Star color={GOLD} size={13} />}
                    <div
                      style={{
                        display: 'flex',
                        fontFamily: CJK_RE.test(data.detailLabel)
                          ? 'Jakarta, Noto Sans JP, Noto Sans KR, Noto Sans SC'
                          : 'Jakarta',
                        fontSize: data.variant === 'leaderboard' ? 16 : 15,
                        fontWeight: 600,
                        color: data.variant === 'leaderboard' ? TEXT : TEXT_MUTED,
                      }}
                    >
                      {data.detailLabel}
                    </div>
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
          {data.verbs && <TaglineNav active={data.verbs} size={16} marginTop={24} />}
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

  // --- centered info card (no art / no data fallback) ---
  const wave = await loadWave(waveKeyFor(data));
  const waveW = 430;
  return renderImage(
    <div style={base()}>
      <Vignette />
      <TickRuler />
      {wave && <img alt="" src={wave} width={waveW} height={Math.round(waveW / WAVE_RATIO)} style={{ marginBottom: 10 }} />}
      <Wordmark text={data.title} size={data.title.length > 18 ? 58 : 72} />
      <div style={{ display: 'flex', fontSize: 24, color: TEXT_MUTED, marginTop: 17, textAlign: 'center' }}>
        {data.subtitle}
      </div>
      {data.verbs && <TaglineNav active={data.verbs} size={18} marginTop={26} />}
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
