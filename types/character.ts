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
