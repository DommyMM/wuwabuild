export enum WeaponType {
  Pistol = "Pistol",
  Rectifier = "Rectifier",
  Broadblade = "Broadblade",
  Sword = "Sword",
  Gauntlet = "Gauntlet"
}

export type WeaponRarity = "1-star" | "2-star" | "3-star" | "4-star" | "5-star";

export interface ScaledWeaponStats {
  scaledAtk: number;
  scaledMainStat: number;
  scaledPassive?: number;
  scaledPassive2?: number;
}

export interface Weapon {
  name: string;
  type: WeaponType;
  rarity: WeaponRarity;
  ATK: number;
  main_stat: string;
  base_main: number;
  passive?: string;
  passive_stat?: number;
  passive2?: string;
  passive_stat2?: number;
}

export interface WeaponConfig {
  level: number;
  rank: number;
}

export interface WeaponState {
  selectedWeapon: Weapon | null;
  config: WeaponConfig;
  scaledStats?: ScaledWeaponStats;
}