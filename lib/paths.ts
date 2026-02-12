import { Character, SKIN_CHARACTERS } from '@/types/character';
import { Weapon } from '@/types/weapon';
import { Echo } from '@/types/echo';

export type ImageCategory = 'faces' | 'icons' | 'elements' | 'face1' | 'weapons' | 'echoes' | 'skills' | 'stats' | 'sets' | 'wavebands' | 'quality';

interface PathConfig {
  base: string;
  faces: string;
  icons: string;
  elements: string;
  face1: string;
  weapons: string;
  echoes: string;
  skills: string;
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

export interface ImagePaths {
  cdn: string;
  local: string;
}

export const PATHS = {
  cdn: {
    base: 'https://files.wuthery.com/p/GameData/UIResources/Common',
    faces: 'Image/IconRoleHeadCircle256',
    icons: 'Image/IconRolePile',
    elements: 'Image/IconElementShine',
    face1: 'Image/IconRoleHead256',
    weapons: 'Image/IconWeapon',
    echoes: 'Image/IconMonsterHead',
    skills: 'Atlas/SkillIcon',
    stats: 'Image/IconAttribute',
    sets: 'Image/IconElementAttri',
    wavebands: 'Image/IconDevice',
    quality: 'Image/Quality'
  } as PathConfig,
  local: {
    base: '/images',
    faces: 'Faces',
    icons: 'Icons',
    elements: 'Elements',
    face1: 'Face1',
    weapons: 'Weapons',
    echoes: 'Echoes',
    skills: 'Skills',
    stats: 'Stats',
    sets: 'SetIcons',
    wavebands: 'Wavebands',
    quality: 'Quality'
  } as PathConfig
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

// Skill folder name overrides for CDN
const SKILL_CDN_NAMES: Record<string, string> = {
  '13': 'Motefei',
  '23': 'Jianxin',
  '7': 'Sanhua',
  '55': 'JiaBeiLiNa',
  '57': 'Qianxiao',
  '60': 'LinNai',
  '61': 'MoNing'
};

// Skill icon name overrides for CDN
const SKILL_ICON_NAMES: Record<string, string> = {
  '9': 'TaoHua',
  '13': 'Motefei',
  '23': 'Jianxin',
  '7': 'Sanhua',
  '55': 'JiaBeiLiNa',
  '57': 'Qianxiao',
  '60': 'LinNai',
  '61': 'MoNing'
};

// Weapons with underscores in CDN filename
const UNDERSCORE_WEAPON_IDS = new Set([
  '21050045', // Boson Astrolabe
  '21030045', // Phasic Homogenizer
  '21020045', // Laser Shearer
  '21010045', // Radiance Cleaver
  '21040045', // Pulsation Bracer
  '21040056', // Daybreaker's Spine
]);

const getRoverVariant = (name: string): string | null => {
  if (name === 'RoverSpectro') return 'Zhujue';
  if (name === 'RoverHavoc') return 'ZhujueDark';
  if (name === 'RoverAero') return 'Fengzhu';
  return null;
};

export interface GetAssetPathOptions {
  useAltSkin?: boolean;
  isPhantom?: boolean;
  skillType?: string;
}

export const getAssetPath = (
  category: ImageCategory,
  input: string | Character | Weapon | Echo,
  options: GetAssetPathOptions = {}
): ImagePaths => {
  const { useAltSkin, isPhantom, skillType } = options;
  const name = typeof input === 'string' ? input : input.name;
  const id = typeof input === 'string' ? input : input.id;
  const title = typeof input === 'string' ? input : (input as Character).title ?? id;

  switch (category) {
    case 'elements': {
      const cdnName = ELEMENT_NAME_MAP[name];
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.elements}/T_IconElement${cdnName}2_UI.png`,
        local: `${PATHS.local.base}/${PATHS.local.elements}/${name}.png`
      };
    }
    case 'faces':
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.faces}/T_IconRoleHeadCircle256_${id}_UI.png`,
        local: `${PATHS.local.base}/${PATHS.local.faces}/${name}.png`
      };
    case 'icons': {
      const skinSuffix = useAltSkin && SKIN_CHARACTERS.includes(name) ? '2' : '';
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.icons}/T_IconRole_Pile_${title}${skinSuffix}_UI.png`,
        local: `${PATHS.local.base}/${PATHS.local.icons}/${name}${skinSuffix}.png`
      };
    }
    case 'face1':
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.face1}/T_IconRoleHead256_${id}_UI.png`,
        local: `${PATHS.local.base}/${PATHS.local.face1}/${name}.png`
      };
    case 'weapons': {
      const weapon = input as Weapon;
      const weaponId = useAltSkin && weapon.id === '21010026' ? '21010017' : weapon.id;
      const weaponFileName = UNDERSCORE_WEAPON_IDS.has(weaponId)
        ? `T_IconWeapon_${weaponId}_UI.png`
        : `T_IconWeapon${weaponId}_UI.png`;
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.weapons}/${weaponFileName}`,
        local: `${PATHS.local.base}/${PATHS.local.weapons}/${weapon.type}/${encodeURIComponent(weapon.name)}.png`
      };
    }
    case 'echoes': {
      const echo = input as Echo;
      const localName = isPhantom ? `Phantom ${echo.name}` : echo.name;
      const echocdn = isPhantom && echo.name in PHANTOM_CDN_IDS ? PHANTOM_CDN_IDS[echo.name] : echo.id;
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.echoes}/T_IconMonsterHead_${echocdn}_UI.png`,
        local: `${PATHS.local.base}/${PATHS.local.echoes}/${localName}.png`
      };
    }
    case 'skills': {
      const character = input as Character;
      const roverVariant = getRoverVariant(character.name);
      if (roverVariant) {
        return {
          cdn: `${PATHS.cdn.base}/${PATHS.cdn.skills}/SkillIcon${roverVariant}/SP_Icon${roverVariant}${skillType}.png`,
          local: `${PATHS.local.base}/${PATHS.local.skills}/${character.name}/SP_Icon${character.name}${skillType}.png`
        };
      }
      const defaultName = character.title.charAt(0).toUpperCase() + character.title.slice(1).toLowerCase();
      const folderName = SKILL_CDN_NAMES[character.id] || defaultName;
      const iconName = SKILL_ICON_NAMES[character.id] || defaultName;
      let adjustedSkillType = skillType;
      if (character.id === '55') {
        if (skillType === 'D1') adjustedSkillType = '1D1';
        else if (skillType === 'D2') adjustedSkillType = '2D2';
      }
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.skills}/SkillIcon${folderName}/SP_Icon${iconName}${adjustedSkillType}.png`,
        local: `${PATHS.local.base}/${PATHS.local.skills}/${character.name}/SP_Icon${character.name}${adjustedSkillType}.png`
      };
    }
    case 'stats': {
      const cdnName = STAT_CDN_NAMES[input as string];
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.stats}/T_Iconproperty${cdnName}_UI.png`,
        local: `${PATHS.local.base}/${PATHS.local.stats}/${input}.png`
      };
    }
    case 'sets': {
      const setName = SET_NAME_MAP[input as string];
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.sets}/T_IconElementAttri${setName}.png`,
        local: `${PATHS.local.base}/${PATHS.local.sets}/${input}.png`
      };
    }
    case 'wavebands': {
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.wavebands}/T_IconDevice_${id}_UI.png`,
        local: `${PATHS.local.base}/${PATHS.local.wavebands}/${name}.png`
      };
    }
    case 'quality': {
      return {
        cdn: `${PATHS.cdn.base}/${PATHS.cdn.quality}/${input}.png`,
        local: `${PATHS.local.base}/${PATHS.local.quality}/${input}.png`
      };
    }
  }
};

// Simple helper functions for common cases that return ImagePaths
export const getCharacterFacePaths = (character: Character | null): ImagePaths => {
  if (!character) {
    return {
      cdn: '/images/Resources/Resonator.png',
      local: '/images/Resources/Resonator.png'
    };
  }
  return getAssetPath('faces', character);
};

export const getCharacterIconPaths = (character: Character | null, useAltSkin?: boolean): ImagePaths => {
  if (!character) {
    return {
      cdn: '/images/Resources/Resonator.png',
      local: '/images/Resources/Resonator.png'
    };
  }
  return getAssetPath('icons', character, { useAltSkin });
};

export const getWeaponPaths = (weapon: Weapon | null): ImagePaths => {
  if (!weapon) {
    return {
      cdn: '/images/Resources/Weapon.png',
      local: '/images/Resources/Weapon.png'
    };
  }
  return getAssetPath('weapons', weapon);
};

export const getEchoPaths = (echo: Echo | null, isPhantom?: boolean): ImagePaths => {
  if (!echo) {
    return {
      cdn: '/images/Resources/Echo.png',
      local: '/images/Resources/Echo.png'
    };
  }
  return getAssetPath('echoes', echo, { isPhantom });
};

export const getElementPaths = (element: string): ImagePaths => {
  return getAssetPath('elements', element);
};

export const getWavebandPaths = (characterName: string, characterId?: string): ImagePaths => {
  return {
    cdn: `${PATHS.cdn.base}/${PATHS.cdn.wavebands}/T_IconDevice_${characterId || characterName}_UI.png`,
    local: `${PATHS.local.base}/${PATHS.local.wavebands}/${characterName}.png`
  };
};

export const getQualityPaths = (rarity: string): ImagePaths => {
  return getAssetPath('quality', rarity);
};
