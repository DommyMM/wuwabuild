import { Character, SKIN_CHARACTERS } from '@/types/character';
import { Weapon } from '@/types/weapon';
import { Echo } from '@/types/echo';

export type ImageCategory = 'faces' | 'icons' | 'elements' | 'face1' | 'weapons' | 'echoes' | 'stats' | 'wavebands' | 'quality';

interface PathConfig {
  base: string;
  faces: string;
  icons: string;
  elements: string;
  face1: string;
  weapons: string;
  echoes: string;
  stats: string;
  wavebands: string;
  quality: string;
}

interface ElementMapping {
  [key: string]: string;
}

const ELEMENT_NAME_MAP: ElementMapping = {
  'Havoc': 'Dark',
  'Fusion': 'Fire',
  'Glacio': 'Ice',
  'Spectro': 'Light',
  'Electro': 'Thunder',
  'Aero': 'Wind'
};

// Stat names to CDN property names
const STAT_CDN_NAMES: Record<string, string> = {
  'HP': 'Life',
  'HP%': 'Lifepercentage',
  'ATK': 'Atk',
  'ATK%': 'Atkpercentage',
  'DEF': 'Def',
  'DEF%': 'Defpercentage',
  'Crit Rate': 'Crit',
  'Crit DMG': 'CritDamage',
  'Energy Regen': 'Energy',
  'Healing Bonus': 'Cure',
  'Havoc DMG': 'DarkDamage',
  'Fusion DMG': 'FireDamage',
  'Glacio DMG': 'IceDamage',
  'Spectro DMG': 'LightDamage',
  'Electro DMG': 'ThunderDamage',
  'Aero DMG': 'WindDamage',
  'Basic Attack DMG': 'SkillDamage1',
  'Heavy Attack DMG': 'SkillDamage2',
  'Skill DMG': 'SkillDamage3',
  'Liberation DMG': 'SkillDamage4'
};

/** CDN-only path segments. All asset URLs are built from this base. */
export const PATHS = {
  cdn: {
    base: 'https://files.wuthery.com/p/GameData/UIResources/Common',
    faces: 'Image/IconRoleHeadCircle256',
    icons: 'Image/IconRolePile',
    elements: 'Image/IconElementShine',
    face1: 'Image/IconRoleHead256',
    weapons: 'Image/IconWeapon',
    echoes: 'Image/IconMonsterHead',
    stats: 'Image/IconAttribute',
    wavebands: 'Image/IconDevice',
    quality: 'Image/Quality'
  } as PathConfig,
};


export interface GetAssetPathOptions {
  useAltSkin?: boolean;
  isPhantom?: boolean;
}

/**
 * Build a CDN URL for the given asset category + entity.
 * Returns a single string (the CDN URL).
 *
 * Note: set/sonata icons are NOT here — use getFetterByElement(el)?.icon from
 * GameDataContext instead (direct CDN URLs from Fetters.json).
 */
export const getAssetPath = (
  category: ImageCategory,
  input: string | Character | Weapon | Echo,
  options: GetAssetPathOptions = {}
): string => {
  const { useAltSkin, isPhantom } = options;
  const name = typeof input === 'string' ? input : input.name;
  const id = typeof input === 'string' ? input : input.id;
  const title = typeof input === 'string' ? input : (input as Character).title ?? id;

  switch (category) {
    case 'elements': {
      const cdnName = ELEMENT_NAME_MAP[name];
      return `${PATHS.cdn.base}/${PATHS.cdn.elements}/T_IconElement${cdnName}2_UI.png`;
    }
    case 'faces':
      return `${PATHS.cdn.base}/${PATHS.cdn.faces}/T_IconRoleHeadCircle256_${id}_UI.png`;
    case 'icons': {
      const skinSuffix = useAltSkin && SKIN_CHARACTERS.includes(name) ? '2' : '';
      return `${PATHS.cdn.base}/${PATHS.cdn.icons}/T_IconRole_Pile_${title}${skinSuffix}_UI.png`;
    }
    case 'face1':
      return `${PATHS.cdn.base}/${PATHS.cdn.face1}/T_IconRoleHead256_${id}_UI.png`;
    case 'weapons': {
      const weapon = input as Weapon;
      // Icon URL comes directly from CDN sync data
      return weapon.iconUrl ?? '';
    }
    case 'echoes': {
      const echo = input as Echo;
      // Icon URLs come directly from CDN sync data (like weapons)
      if (isPhantom && echo.phantomIconUrl) return echo.phantomIconUrl;
      return echo.iconUrl;
    }
    case 'stats': {
      const cdnName = STAT_CDN_NAMES[input as string];
      return `${PATHS.cdn.base}/${PATHS.cdn.stats}/T_Iconproperty${cdnName}_UI.png`;
    }
    case 'wavebands': {
      return `${PATHS.cdn.base}/${PATHS.cdn.wavebands}/T_IconDevice_${id}_UI.png`;
    }
    case 'quality': {
      return `${PATHS.cdn.base}/${PATHS.cdn.quality}/${input}.png`;
    }
  }
};

export const getWeaponPaths = (weapon: Weapon | null): string => {
  if (!weapon) return '/images/Resources/Weapon.png';
  return getAssetPath('weapons', weapon);
};

export const getEchoPaths = (echo: Echo | null, isPhantom?: boolean): string => {
  if (!echo) return 'https://files.wuthery.com/p/GameData/UIResources/UiRole/Atlas/SP_RoleTabiconyiyin.png';
  return getAssetPath('echoes', echo, { isPhantom });
};

export const getElementPaths = (element: string): string => {
  return getAssetPath('elements', element);
};
