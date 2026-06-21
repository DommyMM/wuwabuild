import { CardArtTransform } from '@/lib/cardArt';

export type SplashArtVariant = 'normal' | 'skin';

interface SplashUrlCandidateOptions {
  variant?: SplashArtVariant;
}

const SKIN_SPLASH_SUFFIX = '-skin';
const SPLASH_EXTENSION = 'webp';

const SPLASH_ART_TRANSFORMS: Record<string, CardArtTransform> = {
  '1102-skin': { x: 36, y: 0, scale: 1 },
  '1105': { x: -40, y: 0, scale: 1.1 },
  '1107': { x: -90, y: 30, scale: 1.2 },
  '1107-skin': { x: -240, y: 70, scale: 1.15 },
  '1108': { x: -80, y: 0, scale: 1.05 },
  '1109': { x: -125, y: 10, scale: 1.1 },
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
  '1503': { x: -170, y: 0, scale: 1.2 },
  '1504': { x: 0, y: 0, scale: 1 },
  '1505': { x: -55, y: 25, scale: 1.05 },
  '1506': { x: -100, y: 30, scale: 1.1 },
  '1507': { x: 20, y: 0, scale: 1.1 },
  '1507-skin': { x: -90, y: 0, scale: 1.05 },
  '1508': { x: -180, y: 0, scale: 1 },
  '1509': { x: -90, y: 0, scale: 1 },
  '1510': { x: -130, y: 0, scale: 1.1 },
  '1511': { x: -210, y: 0, scale: 1.05 },
  '1603': { x: 10, y: 0, scale: 1.05 },
  '1606': { x: -110, y: 0, scale: 1.1 },
  '1607': { x: -144, y: 0, scale: 1.1 },
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

export const getSplashArtTransformKey = (
  characterId: string,
  variant: SplashArtVariant = 'normal',
): string => (variant === 'skin' ? `${characterId}${SKIN_SPLASH_SUFFIX}` : characterId);

const getSplashArtTransform = (
  characterId: string,
  variant: SplashArtVariant = 'normal',
): CardArtTransform | null => (
  SPLASH_ART_TRANSFORMS[getSplashArtTransformKey(characterId, variant)] ?? null
);

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

const MIN_SPLASH_IMAGE_HEIGHT = 600;
const MIN_SPLASH_ZOOM = 1;
const MAX_SPLASH_ZOOM = 4;

const getImageNaturalHeightFromUrl = async (url: string): Promise<number> => (
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalHeight || img.height || 0);
    img.onerror = () => reject(new Error('Failed to load image metadata.'));
    img.src = url;
  })
);

/**
 * Browser-side splash resolution for the build card: walks the URL candidates,
 * returns the first that loads plus its card transform (configured per
 * character, or auto-scaled for short source images). Null when the character
 * has no local splash. Shared by the editor and profile cards so both render
 * the same art.
 */
export const resolveSplashCardArt = async (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
  options: SplashUrlCandidateOptions = {},
): Promise<{ url: string; transform: CardArtTransform } | null> => {
  for (const candidate of getSplashUrlCandidates(characterId, legacyId, isRover, options)) {
    try {
      const naturalHeight = await getImageNaturalHeightFromUrl(candidate);
      let autoScale = MIN_SPLASH_ZOOM;
      if (naturalHeight > 0 && naturalHeight < MIN_SPLASH_IMAGE_HEIGHT) {
        autoScale = Math.min(
          MAX_SPLASH_ZOOM,
          Number((MIN_SPLASH_IMAGE_HEIGHT / naturalHeight).toFixed(2)),
        );
      }
      return {
        url: candidate,
        transform: getSplashArtTransform(characterId, options.variant ?? 'normal') ?? { x: 0, y: 0, scale: autoScale },
      };
    } catch {
      // Try next fallback candidate.
    }
  }
  return null;
};
