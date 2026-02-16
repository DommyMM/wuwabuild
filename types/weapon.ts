import { I18nString } from './character';

// ============================================================================
// Enums & basic types
// ============================================================================

export enum WeaponType {
  Pistol = "Pistol",
  Rectifier = "Rectifier",
  Broadblade = "Broadblade",
  Sword = "Sword",
  Gauntlet = "Gauntlet"
}

export type WeaponRarity = "1-star" | "2-star" | "3-star" | "4-star" | "5-star";

// ============================================================================
// CDN weapon shape (raw from sync_weapons.py output)
// ============================================================================

export interface CDNWeapon {
  id: number;
  name: I18nString;
  type: { id: number; name: I18nString; icon: string };
  rarity: { id: number; color: string };
  icon: { icon: string; iconMiddle: string; iconSmall: string };
  effect: I18nString;
  effectName: I18nString;
  /** Refinement params keyed by placeholder index ("0","1",...).
   *  Each value is an array of 5 strings (R1–R5), e.g. ["12%","15%","18%","21%","24%"].
   *  Scaling is NOT uniform — ratios vary per weapon, so all 5 ranks are stored. */
  params: Record<string, string[]>;
  stats: {
    first: { attribute: string; value: number };
    /** Substat value format (CDN quirk):
     *  - isRatio=true:  decimal ratio → multiply by 100 for display  (0.081 → 8.1%)
     *  - isRatio=false: integer →       divide by 100 for display    (1080  → 10.8%) */
    second: { attribute: string; name: I18nString; value: number; isRatio: boolean };
  };
}

// ============================================================================
// App-facing weapon (backward-compatible + CDN extras)
// ============================================================================

export interface Weapon {
  // Legacy fields (used by StatsContext, WeaponInfo, WeaponSelector, paths.ts)
  name: string;
  id: string;
  type: WeaponType;
  rarity: WeaponRarity;
  ATK: number;
  /** Display-ready substat name matching StatsContext expectations:
   *  "Crit Rate", "Crit DMG", "ATK", "HP", "DEF", "ER" */
  main_stat: string;
  /** Base substat value at lv1 in display-percentage units (e.g. 10.8 for 10.8%).
   *  Scale with STAT_CURVE for level progression. */
  base_main: number;

  // CDN-native fields (for i18n display, icons, passive details)
  nameI18n?: I18nString;
  cdnId?: number;
  iconUrl?: string;
  rarityColor?: string;
  /** Passive effect template with {0},{1},... placeholders (multilingual) */
  effect?: I18nString;
  /** Passive ability name (multilingual) */
  effectName?: I18nString;
  /** Refinement values per placeholder: params["0"][rank-1] gives the R{rank} value.
   *  Use directly — no scaling formula needed. */
  params?: Record<string, string[]>;
  /** Substat display name (multilingual), e.g. { en: "Crit. DMG", ja: "クリティカルダメージ" } */
  mainStatI18n?: I18nString;
}

export interface WeaponState {
  id: string | null;
  level: number;
  rank: number;
}

// ============================================================================
// CDN → App adapter (mirrors adaptCDNCharacter pattern)
// ============================================================================

/** CDN weapon type.id → WeaponType enum */
const WEAPON_TYPE_MAP: Record<number, WeaponType> = {
  1: WeaponType.Broadblade,
  2: WeaponType.Sword,
  3: WeaponType.Pistol,
  4: WeaponType.Gauntlet,
  5: WeaponType.Rectifier,
};

/** CDN rarity.id → WeaponRarity display string */
const RARITY_MAP: Record<number, WeaponRarity> = {
  1: "1-star",
  2: "2-star",
  3: "3-star",
  4: "4-star",
  5: "5-star",
};

/** CDN stats.second.attribute → display stat name used by StatsContext */
const STAT_NAME_MAP: Record<string, string> = {
  Atk: "ATK",
  CritRate: "Crit Rate",
  CritDamage: "Crit DMG",
  Hp: "HP",
  Def: "DEF",
  EnergyRecover: "ER",
};

/** Convert CDN substat value to display-percentage (e.g. 8.1 for "8.1%").
 *  isRatio=true:  0.081 → 8.1   (multiply by 100)
 *  isRatio=false: 1080  → 10.8  (divide by 100) */
function convertStatValue(value: number, isRatio: boolean): number {
  const raw = isRatio ? value * 100 : value / 100;
  return Math.round(raw * 10) / 10; // round to 1 decimal
}

export const adaptCDNWeapon = (cdn: CDNWeapon): Weapon => ({
  // Legacy fields
  name: cdn.name.en,
  id: String(cdn.id),
  type: WEAPON_TYPE_MAP[cdn.type.id] ?? WeaponType.Sword,
  rarity: RARITY_MAP[cdn.rarity.id] ?? "3-star",
  ATK: cdn.stats.first.value,
  main_stat: STAT_NAME_MAP[cdn.stats.second.attribute] ?? cdn.stats.second.attribute,
  base_main: convertStatValue(cdn.stats.second.value, cdn.stats.second.isRatio),

  // CDN-native fields
  nameI18n: cdn.name,
  cdnId: cdn.id,
  iconUrl: cdn.icon.iconMiddle,
  rarityColor: cdn.rarity.color,
  effect: cdn.effect,
  effectName: cdn.effectName,
  params: cdn.params,
  mainStatI18n: cdn.stats.second.name,
});

export const validateCDNWeapon = (w: CDNWeapon): boolean => (
  typeof w.id === 'number' &&
  typeof w.name?.en === 'string' &&
  w.name.en.length > 0 &&
  w.stats?.first?.value > 0
);
