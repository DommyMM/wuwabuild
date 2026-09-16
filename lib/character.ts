export enum Element {
  Aero = "Aero",
  Glacio = "Glacio",
  Electro = "Electro",
  Havoc = "Havoc",
  Fusion = "Fusion",
  Spectro = "Spectro",
  Rover = "Rover"
}

enum WeaponType {
  Pistol = "Pistol",
  Rectifier = "Rectifier",
  Broadblade = "Broadblade",
  Sword = "Sword",
  Gauntlet = "Gauntlet"
}

enum Role {
  Concerto = "Concerto",
  Support = "Support",
  DPS = "DPS"
}


export interface I18nString {
  en: string;
  ja?: string;
  ko?: string;
  de?: string;
  es?: string;
  fr?: string;
  id?: string;
  pt?: string;
  ru?: string;
  th?: string;
  vi?: string;
  uk?: string;
  'zh-Hans'?: string;
  'zh-Hant'?: string;
}

interface CDNSkillTreeNode {
  id: number;
  /** 1 is the middle node, 2 the top one */
  coordinate: number;
  parentNodes: number[];
  /** English stat name, e.g. "Crit. Rate+" or "ATK+" */
  name: string;
  /** CDN stat icon URL */
  icon: string;
  value: Array<{ id: number; value: number; isRatio: boolean }>;
  valueText: string[];
}

/** Forte node flattened for lookup by tree and position */
interface ForteNodeData {
  name: string;
  icon: string;
  /** Percent parsed out of valueText, 1.2 meaning "1.20%" */
  value: number;
}

export interface CDNChainEntry {
  id: number;
  name: I18nString | string;
  description?: I18nString | string;
  icon: string;
  param?: string[];
  /** Unconditional passive stat bonus, parsed at sync time */
  bonus?: { stat: string; value: number };
}

interface CDNMoveValueEntry {
  id: number;
  name: I18nString | string;
  values: string[];
}

interface CDNMoveEntry {
  id: number;
  type: number;
  sort: number;
  name: I18nString | string;
  description?: I18nString | string;
  descriptionParams?: string[];
  maxLevel?: number;
  values: CDNMoveValueEntry[];
}

export interface CDNCharacter {
  id: number;
  /** Derived from the icon URL at sync time, so it can be absent */
  legacyId?: string | null;
  name: I18nString;
  rarity: { id: number; color: string };
  weapon: { id: number; name: I18nString; icon: string };
  element: { id: number; name: I18nString; color: string; icon: Record<string, string> };
  icon: { iconRound: string; banner: string };
  skins: Array<{ id: number; icon: { iconRound: string; banner: string }; color: Record<string, string | null> }>;
  tags: Array<{ id: number; name: I18nString; icon: string }>;
  stats: { life: number; atk: number; def: number; crit: number; critDamage: number; damageChangeNormalSkill?: number };
  skillIcons?: Record<string, string>;
  skillTrees?: CDNSkillTreeNode[];
  chains?: CDNChainEntry[];
  moves?: CDNMoveEntry[];
  sequenceIcon?: string;
  preferredStats?: string[];
  /** Parsed at sync time from the inherent skills (type 4) */
  inherentBonuses?: InherentBonus[];
}

/** Panel-stat bonus from an inherent skill, e.g. Mornye Energy Regen +10%, applied always-on like a base stat */
interface InherentBonus {
  stat: string;
  value: number;
}

/** CDN weapon.id to WeaponType */
const WEAPON_ID_MAP: Record<number, WeaponType> = {
  1: WeaponType.Broadblade,
  2: WeaponType.Sword,
  3: WeaponType.Pistol,
  4: WeaponType.Gauntlet,
  5: WeaponType.Rectifier,
};

/** CDN element.id to Element */
const ELEMENT_ID_MAP: Record<number, Element> = {
  1: Element.Glacio,
  2: Element.Fusion,
  3: Element.Electro,
  4: Element.Aero,
  5: Element.Spectro,
  6: Element.Havoc,
};

/** CDN tag.id to Role, an approximation since a tag is narrower than a role */
const ROLE_TAG_MAP: Record<number, Role> = {
  1: Role.Support,    // Coordinated Attack
  2: Role.DPS,        // Main Damage Dealer
  3: Role.Concerto,   // Concerto Efficiency
  4: Role.Support,    // Healing
};


export interface Character {
  name: string;
  id: string;
  /** Old sequential id, mapped to `id` when an older save is loaded */
  legacyId?: string;
  title: string;
  weaponType: WeaponType;
  element: Element;
  Role: Role;
  /** StatName off the tree1 middle node, e.g. 'Aero DMG' or 'Crit Rate' */
  Bonus1: string;
  /** StatName off the tree2 middle node, e.g. 'ATK' or 'HP' */
  Bonus2: string;
  HP: number;
  ATK: number;
  DEF: number;
  ER: number;
  nameI18n?: I18nString;
  elementI18n?: I18nString;
  weaponI18n?: I18nString;
  cdnId?: number;
  iconRound?: string;
  /** Square portrait, iconRound with HeadCircle256 swapped for Head256 */
  head?: string;
  banner?: string;
  rarity?: number;
  skins?: CDNCharacter['skins'];
  /** CDN element.icon["1"] */
  elementIcon?: string;
  /** Icon of the first tag that maps to a role, else of the first tag at all */
  roleIcon?: string;
  /** CDN skill icon URLs keyed by skill type */
  skillIcons?: Record<string, string>;
  /** Keyed "tree1.top", "tree1.middle" and so on */
  forteNodes?: Record<string, ForteNodeData>;
  /** Resonance chains S1 to S6 */
  chains?: CDNChainEntry[];
  /** Compact skill payload for tooltip rendering */
  moves?: CDNMoveEntry[];
  /** Center waveband art from the grouped Item data */
  sequenceIcon?: string;
  /** Rover's own element, undefined for everyone else */
  roverElementName?: Element;
  /** Preferred substats in priority order */
  preferredStats?: string[];
  inherentBonuses?: InherentBonus[];
}

type CharacterSkin = CDNCharacter['skins'][number];

const skinHasColorOverrides = (skin: CharacterSkin): boolean =>
  Object.values(skin.color ?? {}).some((value) => value != null);

const isAlternateSkinVariant = (
  character: Pick<Character, 'iconRound' | 'banner'>,
  skin: CharacterSkin
): boolean => {
  const hasDifferentRound = Boolean(character.iconRound && skin.icon.iconRound.toLowerCase() !== character.iconRound.toLowerCase());
  const hasDifferentBanner = Boolean(character.banner && skin.icon.banner.toLowerCase() !== character.banner.toLowerCase());
  return hasDifferentRound || hasDifferentBanner || skinHasColorOverrides(skin);
};

export const getAlternateSkin = (
  character: Pick<Character, 'iconRound' | 'banner' | 'skins'>
): CharacterSkin | undefined => character.skins?.find((skin) => isAlternateSkinVariant(character, skin));

export const hasAlternateSkin = (
  character: Pick<Character, 'iconRound' | 'banner' | 'skins'>
): boolean => Boolean(getAlternateSkin(character));

export const isRover = (character: Character): boolean =>
  character.name.startsWith("Rover");

/** Gender is nowhere in the CDN data, so it is coded here */
const ROVER_GENDER_BY_ID: Record<string, 'M' | 'F'> = {
  '1309': 'M', '1406': 'M', '1501': 'M', '1605': 'M',
  '1310': 'F', '1408': 'F', '1502': 'F', '1604': 'F',
};

export const getRoverGender = (id?: string): 'M' | 'F' | undefined => (
  id ? ROVER_GENDER_BY_ID[id] : undefined
);

/** Exact Rover variant for a gender and element, falling back to any variant of that element */
export function findRoverVariant(
  characters: Character[],
  options: { element?: string; gender?: 'M' | 'F' } = {},
): Character | undefined {
  const { element, gender } = options;
  return characters.find(
    (c) => isRover(c) &&
      (!element || c.roverElementName === element) &&
      (!gender || getRoverGender(c.id) === gender),
  ) ?? characters.find(
    (c) => isRover(c) && (!element || c.roverElementName === element),
  );
}

type CharacterDisplayInput = Pick<Character, 'id' | 'name' | 'element' | 'roverElementName'>;

interface CharacterDisplayOptions {
  baseName?: string;
  roverElement?: string | null;
  showRoverElement?: boolean;
}

const isRoverCharacter = (character: CharacterDisplayInput): boolean =>
  character.element === Element.Rover || character.name.startsWith('Rover');

export const formatCharacterDisplayName = (
  character: CharacterDisplayInput,
  options: CharacterDisplayOptions = {},
): string => {
  const baseName = options.baseName ?? character.name;
  if (!isRoverCharacter(character)) return baseName;

  const gender = getRoverGender(character.id);
  const roverElement = options.showRoverElement === false
    ? null
    : options.roverElement ?? character.roverElementName;
  const normalizedElement = (
    typeof roverElement === 'string' &&
    roverElement.trim().length > 0 &&
    roverElement !== Element.Rover
  ) ? roverElement.trim() : null;

  return [baseName, gender ? `(${gender})` : null, normalizedElement].filter(Boolean).join(' ');
};

/** parentNodes[0] to tree key */
const PARENT_TO_TREE: Record<number, string> = {
  1: 'tree1', 2: 'tree2', 3: 'tree4', 6: 'tree5',  // coord 1 (middle)
  9: 'tree1', 10: 'tree2', 11: 'tree4', 12: 'tree5', // coord 2 (top)
};

/** CDN node name to the StatName used in calculations and display */
const NODE_NAME_TO_BONUS: Record<string, string> = {
  'Crit. Rate+': 'Crit Rate',
  'Crit. Rate Up': 'Crit Rate',
  'Crit. DMG+': 'Crit DMG',
  'Crit. DMG Up': 'Crit DMG',
  'ATK+': 'ATK',
  'ATK Up': 'ATK',
  'HP+': 'HP',
  'HP Up': 'HP',
  'DEF+': 'DEF',
  'DEF Up': 'DEF',
  'Healing Bonus+': 'Healing Bonus',
  'Healing Bonus Up': 'Healing Bonus',
  'Aero DMG Bonus+': 'Aero DMG',
  'Aero DMG Bonus Up': 'Aero DMG',
  'Glacio DMG Bonus+': 'Glacio DMG',
  'Glacio DMG Bonus Up': 'Glacio DMG',
  'Electro DMG Bonus+': 'Electro DMG',
  'Electro DMG Bonus Up': 'Electro DMG',
  'Havoc DMG Bonus+': 'Havoc DMG',
  'Havoc DMG Bonus Up': 'Havoc DMG',
  'Fusion DMG Bonus+': 'Fusion DMG',
  'Fusion DMG Bonus Up': 'Fusion DMG',
  'Spectro DMG Bonus+': 'Spectro DMG',
  'Spectro DMG Bonus Up': 'Spectro DMG',
};

/** Flattens skillTrees into a map keyed "tree1.top", "tree1.middle" and so on */
const processForteNodes = (trees?: CDNSkillTreeNode[]): Record<string, ForteNodeData> | undefined => {
  if (!trees?.length) return undefined;
  const result: Record<string, ForteNodeData> = {};
  for (const node of trees) {
    const parent = node.parentNodes?.[0];
    if (parent == null) continue;
    const treeKey = PARENT_TO_TREE[parent];
    if (!treeKey) continue;
    const position = node.coordinate === 2 ? 'top' : 'middle';
    const valueStr = node.valueText?.[0] ?? '0';
    result[`${treeKey}.${position}`] = {
      name: node.name,
      icon: node.icon,
      value: parseFloat(valueStr),
    };
  }
  return Object.keys(result).length ? result : undefined;
};

export const adaptCDNCharacter = (cdn: CDNCharacter): Character => {
  const isRoverChar = cdn.name.en.startsWith('Rover');
  const element = isRoverChar
    ? Element.Rover
    : (ELEMENT_ID_MAP[cdn.element.id] ?? Element.Spectro);

  // First tag that maps to a role wins, otherwise DPS stands and the first tag still supplies the icon
  let role = Role.DPS;
  let roleIcon: string | undefined;
  for (const tag of cdn.tags) {
    if (ROLE_TAG_MAP[tag.id]) {
      role = ROLE_TAG_MAP[tag.id];
      roleIcon = tag.icon;
      break;
    }
  }
  if (!roleIcon) roleIcon = cdn.tags[0]?.icon;

  const forteNodes = processForteNodes(cdn.skillTrees);

  // ATK stands in when a tree's middle node is missing or its name is unmapped
  const tree1Middle = forteNodes?.['tree1.middle'];
  const tree2Middle = forteNodes?.['tree2.middle'];
  const bonus1 = (tree1Middle ? NODE_NAME_TO_BONUS[tree1Middle.name] : undefined) ?? 'ATK';
  const bonus2 = (tree2Middle ? NODE_NAME_TO_BONUS[tree2Middle.name] : undefined) ?? 'ATK';

  return {
    name: isRoverChar ? 'Rover' : cdn.name.en,
    nameI18n: isRoverChar ? { ...cdn.name, en: 'Rover' } : cdn.name,
    elementI18n: cdn.element.name,
    weaponI18n: cdn.weapon.name,
    id: String(cdn.id),
    legacyId: cdn.legacyId ?? undefined,
    title: '',
    weaponType: WEAPON_ID_MAP[cdn.weapon.id] ?? WeaponType.Sword,
    element,
    Role: role,
    Bonus1: bonus1,
    Bonus2: bonus2,
    HP: cdn.stats.life,
    ATK: cdn.stats.atk,
    DEF: cdn.stats.def,
    ER: 100,
    cdnId: cdn.id,
    iconRound: cdn.icon.iconRound,
    head: cdn.icon.iconRound?.replace(/HeadCircle256/g, 'Head256'),
    banner: cdn.icon.banner,
    rarity: cdn.rarity.id,
    skins: cdn.skins,
    elementIcon: cdn.element.icon?.['1'],
    roleIcon,
    skillIcons: cdn.skillIcons,
    forteNodes,
    chains: cdn.chains,
    moves: cdn.moves,
    sequenceIcon: cdn.sequenceIcon,
    preferredStats: Array.isArray(cdn.preferredStats)
      ? cdn.preferredStats.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : undefined,
    inherentBonuses: cdn.inherentBonuses,
    roverElementName: isRoverChar ? (ELEMENT_ID_MAP[cdn.element.id] ?? Element.Spectro) : undefined,
  };
};

export const validateCDNCharacter = (value: unknown): value is CDNCharacter => {
  if (!value || typeof value !== 'object') return false;
  const char = value as Partial<CDNCharacter>;
  return (
    typeof char.id === 'number' &&
    typeof char.name?.en === 'string' &&
    typeof char.rarity?.id === 'number' &&
    typeof char.weapon?.id === 'number' &&
    typeof char.element?.id === 'number' &&
    typeof char.icon?.iconRound === 'string' &&
    typeof char.icon?.banner === 'string' &&
    Array.isArray(char.skins) &&
    Array.isArray(char.tags) &&
    typeof char.stats?.life === 'number' &&
    typeof char.stats?.atk === 'number' &&
    typeof char.stats?.def === 'number'
  );
};
