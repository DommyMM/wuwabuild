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

// ============================================================================
// CDN Character Types (from sync_characters.py)
// ============================================================================

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

// ============================================================================
// Legacy Character Interface (for backward compatibility)
// ============================================================================

export interface Character {
  name: string;
  id: string;
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
  // New fields from CDN
  cdnId?: number;
  iconRound?: string;
  banner?: string;
  rarity?: number;
  skins?: CDNCharacter['skins'];
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

// ============================================================================
// CDN to Legacy Adapter
// ============================================================================

export const adaptCDNCharacter = (cdn: CDNCharacter): Character => {
  const elementName = cdn.element.name.en;
  const element = ELEMENT_ID_MAP[cdn.element.id] ??
    (elementName.includes('Rover') ? Element.Rover : Element.Spectro);

  // Determine role from tags (first matching tag)
  let role = Role.DPS;
  for (const tag of cdn.tags) {
    if (ROLE_TAG_MAP[tag.id]) {
      role = ROLE_TAG_MAP[tag.id];
      break;
    }
  }

  // Determine bonus types based on element/role (simplified heuristic)
  const bonus1: BonusType = element === Element.Rover ? "ATK" : element;
  const bonus2: "ATK" | "HP" | "DEF" = "ATK";

  return {
    name: cdn.name.en,
    id: cdn.legacyId,
    title: '', // Not available in CDN data
    weaponType: WEAPON_ID_MAP[cdn.weapon.id] ?? WeaponType.Sword,
    element,
    Role: role,
    Bonus1: bonus1,
    Bonus2: bonus2,
    HP: cdn.stats.Life,
    ATK: cdn.stats.Atk,
    DEF: cdn.stats.Def,
    ER: 100, // Default ER
    // New fields
    cdnId: cdn.id,
    iconRound: cdn.icon.iconRound,
    banner: cdn.icon.banner,
    rarity: cdn.rarity.id,
    skins: cdn.skins,
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
