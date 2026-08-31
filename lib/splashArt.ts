import { CardArtTransform } from '@/lib/cardArt';

export type SplashArtVariant = 'normal' | 'skin';

interface SplashUrlCandidateOptions {
  variant?: SplashArtVariant;
}

const SKIN_SPLASH_SUFFIX = '-skin';
const SPLASH_EXTENSION = 'webp';

// Bundled splash art is part of the deployed application, so its identity is
// build-time data rather than something the browser needs to discover by
// loading candidate URLs. Keep this list in sync with public/images/splash.
const BUNDLED_SPLASH_STEMS = new Set([
  '1102-skin', '1105', '1107', '1107-skin', '1108', '1109', '1110',
  '1203', '1205', '1205-skin', '1206', '1207', '1208', '1209',
  '1209-skin', '1210', '1211', '1212', '1302', '1304', '1304-skin',
  '1305', '1306', '1308', '1404', '1407', '1409', '1410', '1411',
  '1412', '1413', '1503', '1504', '1505', '1506', '1507',
  '1507-skin', '1508', '1508-skin', '1509', '1509-skin', '1510',
  '1511', '1603', '1606', '1607', '1608', '1610', 'Rover',
]);
const BUNDLED_ROVER_CHARACTER_IDS = new Set([
  '1309', '1310', '1406', '1408', '1501', '1502', '1604', '1605',
]);

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
  '1610': { x: -90, y: 0, scale: 1 },
};

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
    addCharacterCandidates(variant === 'skin' ? [`Rover${SKIN_SPLASH_SUFFIX}`] : ['Rover']);
  } else if (variant === 'skin') {
    addCharacterCandidates([`${characterId}${SKIN_SPLASH_SUFFIX}`]);
  }

  if (!isRover) {
    addCharacterCandidates([characterId]);
  }

  return Array.from(new Set(candidates));
};

const getSplashArtTransformKey = (
  characterId: string,
  variant: SplashArtVariant = 'normal',
): string => (variant === 'skin' ? `${characterId}${SKIN_SPLASH_SUFFIX}` : characterId);

const getSplashArtTransform = (
  characterId: string,
  variant: SplashArtVariant = 'normal',
): CardArtTransform | null => (
  SPLASH_ART_TRANSFORMS[getSplashArtTransformKey(characterId, variant)] ?? null
);

export interface BundledSplashCardArt {
  url: string;
  transform: CardArtTransform;
}

/**
 * Synchronous descriptor for splash art shipped in public/images/splash.
 * Profile cards use this during their first render, avoiding the banner-first
 * paint and the duplicate Image probe performed by the legacy async resolver.
 */
export const getBundledSplashCardArt = (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
  options: SplashUrlCandidateOptions = {},
): BundledSplashCardArt | null => {
  const usesSharedRoverSplash = isRover || BUNDLED_ROVER_CHARACTER_IDS.has(characterId);
  const candidate = getSplashUrlCandidates(characterId, legacyId, usesSharedRoverSplash, options)
    .find((url) => {
      const filename = url.split('/').pop();
      const stem = filename?.replace(`.${SPLASH_EXTENSION}`, '') ?? '';
      return BUNDLED_SPLASH_STEMS.has(stem);
    });
  if (!candidate) return null;

  return {
    url: candidate,
    transform: getSplashArtTransform(characterId, options.variant ?? 'normal')
      ?? { x: 0, y: 0, scale: 1 },
  };
};

const warmedSplashUrls = new Set<string>();

/**
 * Starts fetching and decoding a bundled splash the moment intent is known
 * (profile row click), in parallel with the build-detail request, so the
 * card's first paint doesn't wait on the art download. Errors are ignored;
 * the card's own art pipeline stays the authoritative loader.
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

const formatSplashArtTransformEntry = (
  characterId: string,
  variant: SplashArtVariant,
  transform: CardArtTransform,
): string => {
  const key = getSplashArtTransformKey(characterId, variant);
  return `  '${key}': { x: ${transform.x}, y: ${transform.y}, scale: ${transform.scale} },`;
};

/** Dev helper: log the current splash transform for pasting into SPLASH_ART_TRANSFORMS. */
export const logSplashArtTransform = (
  characterId: string,
  variant: SplashArtVariant,
  transform: CardArtTransform,
): void => {
  if (process.env.NODE_ENV === 'production') return;
  const key = getSplashArtTransformKey(characterId, variant);
  console.log(`%c[splashArt] ${key}`, 'color:#55FFB5;font-weight:bold', transform);
  console.log(`%cPaste into SPLASH_ART_TRANSFORMS:\n${formatSplashArtTransformEntry(characterId, variant, transform)}`, 'color:#E400F0');
};

const SPLASH_REF_HEIGHT = 600;
const SPLASH_REF_WIDTH = SPLASH_REF_HEIGHT * (16 / 9);

/**
 * Per-character centering for other full-height, center-anchored splash
 * renders (home hero on mobile). Converts the card-tuned pixel offset into a
 * percentage of the image's own width so it holds at any render height.
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

/**
 * Compatibility wrapper for editor call sites that already await resolution.
 * Bundled asset identity is synchronous; no browser Image probe is needed.
 */
export const resolveSplashCardArt = async (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
  options: SplashUrlCandidateOptions = {},
): Promise<BundledSplashCardArt | null> => (
  getBundledSplashCardArt(characterId, legacyId, isRover, options)
);
