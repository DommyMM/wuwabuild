export enum Element {
  Aero = "Aero",
  Glacio = "Glacio",
  Electro = "Electro",
  Havoc = "Havoc",
  Fusion = "Fusion",
  Spectro = "Spectro",
  Rover = "Rover"
}

export enum WeaponType {
  Pistol = "Pistol",
  Rectifier = "Rectifier",
  Broadblade = "Broadblade",
  Sword = "Sword",
  Gauntlet = "Gauntlet"
}

export enum Role {
  Concerto = "Concerto",
  Support = "Support",
  DPS = "DPS"
}

export type BonusType = Element | "Crit Rate" | "Crit DMG" | "Healing" | "ATK" | "HP" | "DEF";
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

export interface CDNSkillTreeNode {
  id: number;
  coordinate: number; // 1 = middle/lower, 2 = top/upper
  parentNodes: number[];
  name: string; // English stat name (e.g. "Crit. Rate+", "ATK+")
  icon: string; // CDN stat icon URL
  value: Array<{ Id: number; Value: number; IsRatio: boolean }>;
  valueText: string[];
}

/** Preprocessed forte node for easy lookup by tree + position. */
export interface ForteNodeData {
  name: string;
  icon: string;
  value: number;    // Parsed percentage (e.g. 1.2 for "1.20%")
}

export interface CDNCharacter {
  id: number;
  legacyId: string;
  name: I18nString;
  rarity: { id: number; color: string };
  weapon: { id: number; name: I18nString; icon: string };
  element: { id: number; name: I18nString; color: string; icon: Record<string, string> };
  icon: { iconRound: string; banner: string };
  skins: Array<{ id: number; icon: { iconRound: string; banner: string }; color: Record<string, string | null> }>;
  tags: Array<{ id: number; name: I18nString; icon: string }>;
  stats: { Life: number; Atk: number; Def: number; Crit: number; CritDamage: number; DamageChangeNormalSkill?: number };
  skillIcons?: Record<string, string>;
  skillTrees?: CDNSkillTreeNode[];
}

// CDN weapon ID -> WeaponType mapping
const WEAPON_ID_MAP: Record<number, WeaponType> = {
  1: WeaponType.Broadblade,
  2: WeaponType.Sword,
  3: WeaponType.Pistol,
  4: WeaponType.Gauntlet,
  5: WeaponType.Rectifier,
};

// CDN element ID -> Element mapping
const ELEMENT_ID_MAP: Record<number, Element> = {
  1: Element.Glacio,
  2: Element.Fusion,
  3: Element.Electro,
  4: Element.Aero,
  5: Element.Spectro,
  6: Element.Havoc,
};

// CDN tag ID -> Role mapping (approximate)
const ROLE_TAG_MAP: Record<number, Role> = {
  1: Role.Support,    // Coordinated Attack
  2: Role.DPS,        // Main Damage Dealer
  3: Role.Concerto,   // Concerto Efficiency
  4: Role.Support,    // Healing
};


export interface Character {
  name: string;
  id: string;
  legacyId?: string; // Old sequential ID for backward compatibility
  title: string;
  weaponType: WeaponType;
  element: Element;
  Role: Role;
  Bonus1: BonusType;
  Bonus2: "ATK" | "HP" | "DEF";
  HP: number;
  ATK: number;
  DEF: number;
  ER: number;
  // I18n display names (English fallback via `name` / enums)
  nameI18n?: I18nString;
  elementI18n?: I18nString;
  weaponI18n?: I18nString;
  // New fields from CDN
  cdnId?: number;
  iconRound?: string;
  banner?: string;
  rarity?: number;
  skins?: CDNCharacter['skins'];
  elementIcon?: string; // CDN element icon URL (element.icon["1"])
  skillIcons?: Record<string, string>; // CDN skill icon URLs keyed by type
  forteNodes?: Record<string, ForteNodeData>; // Keyed by "tree1.top", "tree1.middle", etc.
}

export const SKIN_CHARACTERS = ['Jinhsi', 'Sanhua', 'Changli', 'Carlotta'] as readonly string[];

export const isRover = (character: Character): boolean =>
  character.name.startsWith("Rover");

export type CharacterCreate = Omit<Character, "ER"> & { ER?: number };

export const createCharacter = (char: CharacterCreate): Character => ({
  ...char,
  ER: char.ER ?? 100
});

export const validateCharacter = (char: Character): boolean => {
  return (
    char.HP > 0 &&
    char.ATK > 0 &&
    char.DEF > 0 &&
    char.ER >= 0
  );
};

// parentNodes[0] → tree key mapping
const PARENT_TO_TREE: Record<number, string> = {
  1: 'tree1', 2: 'tree2', 3: 'tree4', 6: 'tree5',  // coord 1 (middle)
  9: 'tree1', 10: 'tree2', 11: 'tree4', 12: 'tree5', // coord 2 (top)
};

/** CDN node name → BonusType. Strips trailing "+" / "Bonus" and maps to our enum. */
const NODE_NAME_TO_BONUS: Record<string, BonusType> = {
  'Crit. Rate+': 'Crit Rate',
  'Crit. DMG+': 'Crit DMG',
  'ATK+': 'ATK',
  'HP+': 'HP',
  'DEF+': 'DEF',
  'Healing Bonus+': 'Healing',
  'Aero DMG Bonus+': Element.Aero,
  'Glacio DMG Bonus+': Element.Glacio,
  'Electro DMG Bonus+': Element.Electro,
  'Havoc DMG Bonus+': Element.Havoc,
  'Fusion DMG Bonus+': Element.Fusion,
  'Spectro DMG Bonus+': Element.Spectro,
};

/** Process CDN skillTrees into a lookup map keyed by "tree1.top", "tree1.middle", etc. */
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

  // Determine role from tags (first matching tag)
  let role = Role.DPS;
  for (const tag of cdn.tags) {
    if (ROLE_TAG_MAP[tag.id]) {
      role = ROLE_TAG_MAP[tag.id];
      break;
    }
  }

  // Process forte nodes from CDN skillTrees
  const forteNodes = processForteNodes(cdn.skillTrees);

  // Derive Bonus1/Bonus2 from actual skillTrees data (not heuristic)
  const tree1Middle = forteNodes?.['tree1.middle'];
  const tree2Middle = forteNodes?.['tree2.middle'];
  const bonus1: BonusType = (tree1Middle ? NODE_NAME_TO_BONUS[tree1Middle.name] : undefined)
    ?? (element === Element.Rover ? 'ATK' : element);
  const bonus2Name = tree2Middle ? NODE_NAME_TO_BONUS[tree2Middle.name] : undefined;
  const bonus2: 'ATK' | 'HP' | 'DEF' =
    (bonus2Name === 'ATK' || bonus2Name === 'HP' || bonus2Name === 'DEF') ? bonus2Name : 'ATK';

  return {
    name: isRoverChar ? 'Rover' : cdn.name.en,
    nameI18n: cdn.name,
    elementI18n: cdn.element.name,
    weaponI18n: cdn.weapon.name,
    id: String(cdn.id),
    legacyId: cdn.legacyId,
    title: '',
    weaponType: WEAPON_ID_MAP[cdn.weapon.id] ?? WeaponType.Sword,
    element,
    Role: role,
    Bonus1: bonus1,
    Bonus2: bonus2,
    HP: cdn.stats.Life,
    ATK: cdn.stats.Atk,
    DEF: cdn.stats.Def,
    ER: 100,
    cdnId: cdn.id,
    iconRound: cdn.icon.iconRound,
    banner: cdn.icon.banner,
    rarity: cdn.rarity.id,
    skins: cdn.skins,
    elementIcon: cdn.element.icon?.['1'],
    skillIcons: cdn.skillIcons,
    forteNodes,
  };
};

export const validateCDNCharacter = (char: CDNCharacter): boolean => {
  return (
    typeof char.id === 'number' &&
    typeof char.legacyId === 'string' &&
    char.stats?.Life > 0 &&
    char.stats?.Atk > 0 &&
    char.stats?.Def > 0
  );
};
