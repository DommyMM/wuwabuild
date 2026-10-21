import { CardArtTransform } from '@/lib/cardArt';

export type SplashArtVariant = 'normal' | 'skin';

interface SplashUrlCandidateOptions {
  variant?: SplashArtVariant;
}

const SKIN_SPLASH_SUFFIX = '-skin';
const SPLASH_EXTENSION = 'webp';

const BUNDLED_ROVER_CHARACTER_IDS = new Set([
  '1309', '1310', '1406', '1408', '1501', '1502', '1604', '1605',
]);

/**
 * Card framing per file in public/images/splash, keyed by file stem
 * - One entry per shipped file, so the keys double as the bundled list and the browser never probes candidate URLs
 * - scripts/check_splash_art.mjs fails lint when files and keys drift, scripts/splash_framing.py suggests x for new files
 */
const SPLASH_ART_TRANSFORMS: Record<string, CardArtTransform> = {
  '1102-skin': { x: 36, y: 0, scale: 1 },
  '1105': { x: -40, y: 0, scale: 1.1 },
  '1107': { x: -90, y: 30, scale: 1.2 },
  '1107-skin': { x: -240, y: 70, scale: 1.15 },
  '1108': { x: -80, y: 0, scale: 1.05 },
  '1109': { x: -125, y: 10, scale: 1.1 },
  '1110': { x: -145, y: 0, scale: 1.05 },
  '1203': { x: -20, y: 0, scale: 1 },
  '1205': { x: 52, y: 124, scale: 1.4 },
  '1205-skin': { x: -185, y: 105, scale: 1.3 },
  '1206': { x: -140, y: 20, scale: 1.15 },
  '1207': { x: -70, y: 0, scale: 1 },
  '1208': { x: -100, y: 0, scale: 1 },
  '1209': { x: -150, y: 0, scale: 1 },
  '1209-skin': { x: -155, y: 50, scale: 1.1 },
  '1210': { x: -164, y: 0, scale: 1 },
  '1211': { x: -60, y: 0, scale: 1 },
  '1212': { x: -100, y: 24, scale: 1.15 },
  '1302': { x: 0, y: 0, scale: 1.15 },
  '1304': { x: 0, y: 0, scale: 1.1 },
  '1304-skin': { x: 0, y: 0, scale: 1 },
  '1305': { x: -80, y: 0, scale: 1.1 },
  '1306': { x: -110, y: 0, scale: 1 },
  '1308': { x: -150, y: 0, scale: 1 },
  '1311': { x: -137, y: 54, scale: 1.15 },
  '1312': { x: -107, y: 9, scale: 1.1 },
  '1404': { x: -90, y: 0, scale: 1 },
  '1407': { x: -70, y: 20, scale: 1.15 },
  '1409': { x: -164, y: -2, scale: 1 },
  '1410': { x: -110, y: 0, scale: 1 },
  '1411': { x: -40, y: 0, scale: 1 },
  '1412': { x: -110, y: 0, scale: 1 },
  '1413': { x: -60, y: 14, scale: 1.1 },
  '1503': { x: -170, y: 0, scale: 1.2 },
  '1504': { x: 0, y: 0, scale: 1 },
  '1505': { x: -55, y: 25, scale: 1.05 },
  '1506': { x: -100, y: 30, scale: 1.1 },
  '1507': { x: 20, y: 0, scale: 1.1 },
  '1507-skin': { x: -90, y: 0, scale: 1.05 },
  '1508': { x: -180, y: 0, scale: 1 },
  '1508-skin': { x: -96, y: 0, scale: 1.1 },
  '1509': { x: -90, y: 0, scale: 1 },
  '1509-skin': { x: -144, y: 0, scale: 1.1 },
  '1510': { x: -130, y: 0, scale: 1.1 },
  '1511': { x: -210, y: 0, scale: 1.05 },
  '1603': { x: 10, y: 0, scale: 1.05 },
  '1606': { x: -110, y: 0, scale: 1.1 },
  '1607': { x: -144, y: 0, scale: 1.1 },
  '1608': { x: 10, y: 0, scale: 1 },
  '1610': { x: -90, y: 0, scale: 1 },
  'Rover': { x: 35, y: 0, scale: 1 },
};
const BUNDLED_SPLASH_STEMS = new Set(Object.keys(SPLASH_ART_TRANSFORMS));

export const getSplashUrlCandidates = (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
  options: SplashUrlCandidateOptions = {},
): string[] => {
  const candidates: string[] = [];
  const variant = options.variant ?? 'normal';
  const addCharacterCandidates = (stems: string[]) => {
    stems.forEach(stem => candidates.push(`/images/splash/${stem}.${SPLASH_EXTENSION}`));
  };

  if (isRover) {
    addCharacterCandidates(variant === 'skin' ? [`Rover${SKIN_SPLASH_SUFFIX}`, 'Rover'] : ['Rover']);
  } else if (variant === 'skin') {
    addCharacterCandidates([`${characterId}${SKIN_SPLASH_SUFFIX}`]);
  }

  if (!isRover) {
    addCharacterCandidates([characterId]);
  }

  return Array.from(new Set(candidates));
};

const getSplashStem = (url: string): string => (
  url.split('/').pop()?.replace(`.${SPLASH_EXTENSION}`, '') ?? ''
);

export interface BundledSplashCardArt {
  url: string;
  transform: CardArtTransform;
}

/** Resolves synchronously so a profile card's first render already has the art, with no banner-first paint */
export const getBundledSplashCardArt = (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
  options: SplashUrlCandidateOptions = {},
): BundledSplashCardArt | null => {
  const usesSharedRoverSplash = isRover || BUNDLED_ROVER_CHARACTER_IDS.has(characterId);
  const candidate = getSplashUrlCandidates(characterId, legacyId, usesSharedRoverSplash, options)
    .find((url) => BUNDLED_SPLASH_STEMS.has(getSplashStem(url)));
  if (!candidate) return null;

  // Keyed by the file that resolved, so a skin request that fell back to the base splash gets the base framing
  return {
    url: candidate,
    transform: SPLASH_ART_TRANSFORMS[getSplashStem(candidate)],
  };
};

const warmedSplashUrls = new Set<string>();

/**
 * Fetches and decodes a bundled splash on intent (a profile row click) so the card's first paint never waits on it
 *
 * Errors are ignored since the card's own art pipeline stays the real loader
 */
export const warmBundledSplashArt = (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
  options: SplashUrlCandidateOptions = {},
): void => {
  if (typeof window === 'undefined') return;
  const art = getBundledSplashCardArt(characterId, legacyId, isRover, options);
  if (!art || warmedSplashUrls.has(art.url)) return;
  warmedSplashUrls.add(art.url);

  const image = new Image();
  image.decoding = 'async';
  image.src = art.url;
  void image.decode().catch(() => {});
};

/** Dev-only, logs the current transform keyed by the splash file, in the form you paste into SPLASH_ART_TRANSFORMS */
export const logSplashArtTransform = (
  splashUrl: string,
  transform: CardArtTransform,
): void => {
  if (process.env.NODE_ENV === 'production') return;
  const key = getSplashStem(splashUrl);
  const entry = `  '${key}': { x: ${transform.x}, y: ${transform.y}, scale: ${transform.scale} },`;
  console.log(`%c[splashArt] ${key}`, 'color:#55FFB5;font-weight:bold', transform);
  console.log(`%cPaste into SPLASH_ART_TRANSFORMS:\n${entry}`, 'color:#E400F0');
};

const SPLASH_REF_HEIGHT = 600;
const SPLASH_REF_WIDTH = SPLASH_REF_HEIGHT * (16 / 9);

/**
 * Centering for full-height, center-anchored splash renders such as the mobile home hero
 *
 * xPct is the card-tuned pixel offset as a percent of the image's own width, so it holds at any render height
 */
export const getHeroSplashOffset = (
  characterId: string,
): { xPct: number; scale: number } | null => {
  const transform = SPLASH_ART_TRANSFORMS[characterId];
  if (!transform) return null;
  return {
    xPct: Number(((transform.x / SPLASH_REF_WIDTH) * 100).toFixed(2)),
    scale: transform.scale,
  };
};

/** Async wrapper for editor call sites that already await, the lookup itself is synchronous */
export const resolveSplashCardArt = async (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
  options: SplashUrlCandidateOptions = {},
): Promise<BundledSplashCardArt | null> => (
  getBundledSplashCardArt(characterId, legacyId, isRover, options)
);
