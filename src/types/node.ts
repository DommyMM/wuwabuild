import { Character } from './character';
import { getAssetPath } from './paths';

export interface ForteImagePaths {
  imagePaths: Record<string, (character: Character) => string>;
  sharedImages: Record<string, (character: Character) => string>;
}

export interface SkillBranch {
  skillName: string;
  skillKey: keyof ForteImagePaths['imagePaths'];
  treeKey: string;
}

const A1_LOCAL_IDS: Record<number, true> = {
  4: true,
  5: true,
  23: true,
  24: true,
  25: true,
  27: true,
  28: true,
  31: true,
  37: true,
  38: true,
  44: true
};

const SKILL_TYPES = {
  'normal-attack': 'A1',
  'skill': 'B1',
  'tree3-top': 'D2',
  'tree3-middle': 'D1',
  'circuit': 'Y',
  'liberation': 'C1',
  'intro': 'QTE',
  'base': 'T'
} as const;

export const forteImagePaths: ForteImagePaths = {
  imagePaths: Object.fromEntries(
    Object.entries(SKILL_TYPES).map(([key, value]) => [
      key,
      (character: Character) => {
        const paths = getAssetPath('skills', character, false, false, value);
        const id = Number(character.id);
        return (value === 'A1' && id in A1_LOCAL_IDS) ? paths.local : paths.local;
      }
    ])
  ),
  sharedImages: {
    'tree1': (character) => getAssetPath('stats', character.Bonus1).local,
    'tree2': (character) => getAssetPath('stats', character.Bonus2).local,
    'tree4': (character) => getAssetPath('stats', character.Bonus2).local,
    'tree5': (character) => getAssetPath('stats', character.Bonus1).local
  }
};