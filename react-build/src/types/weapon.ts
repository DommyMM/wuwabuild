export enum WeaponType {
  Pistol = "Pistol",
  Rectifier = "Rectifier",
  Broadblade = "Broadblade",
  Sword = "Sword",
  Gauntlet = "Gauntlet"
}

export type WeaponRarity = "1-star" | "2-star" | "3-star" | "4-star" | "5-star";

export interface Weapon {
  name: string;
  type: WeaponType;
  rarity: WeaponRarity;
  baseAtk: number;
  subStat: string;
  subValue: number;
}