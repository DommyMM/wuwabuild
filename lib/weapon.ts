import { I18nString } from './character';
import { BasePercentStatName, ElementalDmgStatName, StatName } from './constants/statMappings';

export enum WeaponType {
  Pistol = "Pistol",
  Rectifier = "Rectifier",
  Broadblade = "Broadblade",
  Sword = "Sword",
  Gauntlet = "Gauntlet"
}

export type WeaponRarity = "1-star" | "2-star" | "3-star" | "4-star" | "5-star";

export type WeaponPassiveStatName = Extract<
  StatName,
  | BasePercentStatName
  | ElementalDmgStatName
  | 'Crit Rate'
  | 'Crit DMG'
  | 'Energy Regen'
  | 'Basic Attack DMG Bonus'
  | 'Heavy Attack DMG Bonus'
  | 'Resonance Skill DMG Bonus'
  | 'Resonance Liberation DMG Bonus'
>;

export type WeaponPassiveBonusesByRank = Partial<Record<WeaponPassiveStatName, number[]>>;

export interface CDNWeapon {
  id: number;
  legacyId?: string;
  name: I18nString;
  type: { id: number; name: I18nString; icon: string };
  rarity: { id: number; color: string };
  icon: { icon: string; iconMiddle: string; iconSmall: string };
  effect: I18nString;
  effectName: I18nString;
  /**
   * Refinement values keyed by placeholder index ("0","1",...), e.g. ["12%","15%","18%","21%","24%"]
   *
   * - Each array holds R1 to R5 in full since ratios vary per weapon, there is no scaling formula
   */
  params: Record<string, string[]>;
  /** Parsed from the first unconditional sentence of effect.en, each value R1 to R5 */
  unconditionalPassiveBonuses?: WeaponPassiveBonusesByRank;
  stats: {
    first: { attribute: string; value: number };
    /** isRatio true means a decimal ratio (0.081 displays as 8.1%), false an integer (1080 displays as 10.8%) */
    second: { attribute: string; name: I18nString; value: number; isRatio: boolean };
  };
}

/** Weapon as the UI reads it: flat legacy fields plus the CDN-native i18n, icon and passive fields */
export interface Weapon {
  name: string;
  id: string;
  legacyId?: string;
  type: WeaponType;
  rarity: WeaponRarity;
  ATK: number;
  /** One of STAT_NAME_MAP's display names ("Crit Rate", "ATK", "ER", ...), or the raw CDN attribute when unmapped */
  main_stat: string;
  /** Substat at level 1 in display units, 10.8 meaning 10.8%, scaled by STAT_CURVE for higher levels */
  base_main: number;

  nameI18n?: I18nString;
  cdnId?: number;
  iconUrl?: string;
  rarityColor?: string;
  /** Passive text with {0},{1},... placeholders filled from params */
  effect?: I18nString;
  effectName?: I18nString;
  /** params["0"][rank - 1] is the R{rank} value, used as-is with no scaling */
  params?: Record<string, string[]>;
  /** Stat name to [R1..R5], precomputed by the sync script */
  unconditionalPassiveBonuses?: WeaponPassiveBonusesByRank;
  /** CDN's own substat label, which can differ from the normalized main_stat */
  mainStatI18n?: I18nString;
}

/** CDN type.id to WeaponType */
const WEAPON_TYPE_MAP: Record<number, WeaponType> = {
  1: WeaponType.Broadblade,
  2: WeaponType.Sword,
  3: WeaponType.Pistol,
  4: WeaponType.Gauntlet,
  5: WeaponType.Rectifier,
};

/** CDN rarity.id to the display string */
const RARITY_MAP: Record<number, WeaponRarity> = {
  1: "1-star",
  2: "2-star",
  3: "3-star",
  4: "4-star",
  5: "5-star",
};

/** CDN stats.second.attribute to the display stat name */
const STAT_NAME_MAP: Record<string, string> = {
  Atk: "ATK",
  Crit: "Crit Rate",
  CritRate: "Crit Rate",
  CritDamage: "Crit DMG",
  LifeMax: "HP",
  Hp: "HP",
  Def: "DEF",
  EnergyEfficiency: "ER",
  EnergyRecover: "ER",
};

/** Ratios scale up by 100 (0.081 to 8.1), integers down by 100 (1080 to 10.8) */
function convertStatValue(value: number, isRatio: boolean): number {
  return isRatio ? value * 100 : value / 100;
}

export const adaptCDNWeapon = (cdn: CDNWeapon): Weapon => ({
  name: cdn.name.en,
  id: String(cdn.id),
  legacyId: cdn.legacyId,
  type: WEAPON_TYPE_MAP[cdn.type.id] ?? WeaponType.Sword,
  rarity: RARITY_MAP[cdn.rarity.id] ?? "3-star",
  ATK: cdn.stats.first.value,
  main_stat: STAT_NAME_MAP[cdn.stats.second.attribute] ?? cdn.stats.second.attribute,
  base_main: convertStatValue(cdn.stats.second.value, cdn.stats.second.isRatio),
  nameI18n: cdn.name,
  cdnId: cdn.id,
  iconUrl: cdn.icon.icon,
  rarityColor: cdn.rarity.color,
  effect: cdn.effect,
  effectName: cdn.effectName,
  params: cdn.params,
  unconditionalPassiveBonuses: cdn.unconditionalPassiveBonuses,
  mainStatI18n: cdn.stats.second.name,
});

export const validateCDNWeapon = (value: unknown): value is CDNWeapon => {
  if (!value || typeof value !== 'object') return false;
  const w = value as Partial<CDNWeapon>;
  return (
  typeof w.id === 'number' &&
  typeof w.name?.en === 'string' &&
  typeof w.type?.id === 'number' &&
  typeof w.rarity?.id === 'number' &&
  typeof w.icon?.icon === 'string' &&
  typeof w.stats?.first?.value === 'number' &&
  typeof w.stats?.second?.attribute === 'string' &&
  typeof w.stats.second.value === 'number' &&
  typeof w.stats.second.isRatio === 'boolean'
  );
};
