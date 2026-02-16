import { Character, SKIN_CHARACTERS } from '@/types/character';
import { Weapon } from '@/types/weapon';
import { Echo } from '@/types/echo';

export type ImageCategory = 'faces' | 'icons' | 'elements' | 'face1' | 'weapons' | 'echoes' | 'stats' | 'sets' | 'wavebands' | 'quality';

interface PathConfig {
  base: string;
  faces: string;
  icons: string;
  elements: string;
  face1: string;
  weapons: string;
  echoes: string;
  stats: string;
  sets: string;
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

const SET_NAME_MAP: ElementMapping = {
  'Attack': 'Attack',
  'ER': 'Cloud',
  'Empyrean': 'Cooperate',
  'Healing': 'Cure',
  'Havoc': 'Dark',
  'Midnight': 'DarkAssist',
  'Tidebreaking': 'Energy',
  'Fusion': 'Fire',
  'Glacio': 'Ice',
  'Frosty': 'IceUltimateSkill',
  'Spectro': 'Light',
  'Radiance': 'LightError',
  'Electro': 'Thunder',
  'Aero': 'Wind',
  'Gust': 'WindError',
  'Windward': 'WindErrorA',
  'Flaming': 'FireUltimateSkill',
  'Dream': 'DarkVision',
  'Crown': 'Shield',
  'Law': 'Support',
  'Flamewing': 'FireA',
  'Thread': 'QianXiao',
  'Pact': 'LightWeakness',
  'Halo': 'CureWeakness',
  'Rite': 'AttackWeakness',
  'Trailblazing': 'FireA1',
  'Chromatic': 'FireA2',
  'Sound': 'WindVision'
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
    sets: 'Image/IconElementAttri',
    wavebands: 'Image/IconDevice',
    quality: 'Image/Quality'
  } as PathConfig,
};

// Phantom echo CDN ID mappings
const PHANTOM_CDN_IDS: Record<string, string> = {
  'Clang Bang': '1015',
  'Diggy Duggy': 'SG_31047',
  'Dreamless': '998_1',
  'Feilian Beringal': '1009',
  'Gulpuff': '115_1',
  'Hoartoise': '1010',
  'Impermanence Heron': '1014',
  'Inferno Rider': '325_1',
  'Lightcrusher': '1016',
  'Lumiscale Construct': '329_1',
  'Mourning Aix': '1006',
  'Questless Knight': 'SG_32022',
  'Rocksteady Guardian': '1007',
  'Sentry Construct': 'SG_33009',
  'Thundering Mephis': '1008',
  'Vitreum Dancer': 'SG_32029',
  'Lorelei': 'SG_33011',
  'Crownless': 'SG_33018',
  'Capitaneus': '32033_1',
  'Nimbus Wraith': 'SG_31044',
  'Nightmare Crownless': 'SG_33018',
  'Chest Mimic': 'SG_31048',
  'Fae Ignis': 'SG_31043',
  'Cuddle Wuddle': 'SG_32030',
  'Nightmare Inferno Rider': 'SG_33019',
  'Nightmare Mourning Aix': 'SG_33020',
  'Fallacy of No Return': 'SG_350',
  'Kerasaur': 'SG_31062',
  'The False Sovereign': 'SG_34017',
  'Twin Nebulous Cannon': 'SG_32049',
  'Twin Nova Collapsar Blade': 'SG_32050',
  'Zip Zap': 'SG_31082',
  'Iceglint Dancer': 'SG_31083',
  'Sigillum': 'SG_34025'
};

export interface GetAssetPathOptions {
  useAltSkin?: boolean;
  isPhantom?: boolean;
}

/**
 * Build a CDN URL for the given asset category + entity.
 * Returns a single string (the CDN URL).
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
      const echocdn = isPhantom && echo.name in PHANTOM_CDN_IDS ? PHANTOM_CDN_IDS[echo.name] : echo.id;
      return `${PATHS.cdn.base}/${PATHS.cdn.echoes}/T_IconMonsterHead_${echocdn}_UI.png`;
    }
    case 'stats': {
      const cdnName = STAT_CDN_NAMES[input as string];
      return `${PATHS.cdn.base}/${PATHS.cdn.stats}/T_Iconproperty${cdnName}_UI.png`;
    }
    case 'sets': {
      const setName = SET_NAME_MAP[input as string];
      return `${PATHS.cdn.base}/${PATHS.cdn.sets}/T_IconElementAttri${setName}.png`;
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
  if (!echo) return '/images/Resources/Echo.png';
  return getAssetPath('echoes', echo, { isPhantom });
};

export const getElementPaths = (element: string): string => {
  return getAssetPath('elements', element);
};
