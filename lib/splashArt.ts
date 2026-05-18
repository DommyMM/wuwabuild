import { CardArtTransform } from '@/lib/cardArt';

export const SPLASH_EXTENSIONS = ['webp', 'jpg', 'png'] as const;

export const SPLASH_ART_TRANSFORMS: Record<string, CardArtTransform> = {
  '1105': { x: -40, y: 0, scale: 1.1 },
  '1108': { x: -80, y: 0, scale: 1.05 },
  '1205': { x: 52, y: 124, scale: 1.4 },
  '1207': { x: -70, y: 0, scale: 1 },
  '1208': { x: -100, y: 0, scale: 1 },
  '1209': { x: -150, y: 0, scale: 1 },
  '1210': { x: -164, y: 0, scale: 1 },
  '1211': { x: -60, y: 0, scale: 1 },
  '1302': { x: 0, y: 0, scale: 1.15 },
  '1305': { x: -80, y: 0, scale: 1.1 },
  '1306': { x: -110, y: 0, scale: 1 },
  '1404': { x: -90, y: 0, scale: 1 },
  '1407': { x: -70, y: 20, scale: 1.15 },
  '1409': { x: -164, y: -2, scale: 1 },
  '1410': { x: -110, y: 0, scale: 1 },
  '1411': { x: -40, y: 0, scale: 1 },
  '1503': { x: -170, y: 0, scale: 1.2 },
  '1507': { x: 20, y: 0, scale: 1.1 },
  '1508': { x: -180, y: 0, scale: 1 },
  '1509': { x: -90, y: 0, scale: 1 },
  '1510': { x: -130, y: 0, scale: 1.1 },
  '1606': { x: -110, y: 0, scale: 1.1 },
  '1607': { x: -144, y: 0, scale: 1.1 },
};

export const getSplashUrlCandidates = (
  characterId: string,
  legacyId: string | null,
  isRover: boolean,
): string[] => {
  const candidates: string[] = [];

  if (isRover) {
    if (legacyId) {
      candidates.push(`/images/splash/rover-${legacyId}.webp`);
      candidates.push(`/images/splash/Rover-${legacyId}.webp`);
      if (legacyId === '4') {
        candidates.push('/images/splash/RoverMale.webp');
        candidates.push('/images/splash/RoverM.webp');
      }
      if (legacyId === '5') {
        candidates.push('/images/splash/RoverFemale.webp');
        candidates.push('/images/splash/RoverF.webp');
      }
    }
    candidates.push('/images/splash/Rover.webp');
  }

  SPLASH_EXTENSIONS.forEach(ext => {
    candidates.push(`/images/splash/${characterId}.${ext}`);
  });

  return Array.from(new Set(candidates));
};

export const getSplashArtTransform = (characterId: string): CardArtTransform | null => (
  SPLASH_ART_TRANSFORMS[characterId] ?? null
);
