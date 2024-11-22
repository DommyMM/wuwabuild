import { Character } from './character';

export interface ForteImagePaths {
  imagePaths: Record<string, (characterName: string) => string>;
  sharedImages: Record<string, (character: Character) => string>;
}

export interface SkillBranch {
  skillName: string;
  skillKey: keyof ForteImagePaths['imagePaths'];
  treeKey: string;
}

export const forteImagePaths: ForteImagePaths = {
  imagePaths: {
    'normal-attack': (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}A1.png`,
    'skill': (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}B1.png`,
    'tree3-top': (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}D2.png`,
    'tree3-middle': (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}D1.png`,
    'circuit': (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}Y.png`,
    'liberation': (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}C1.png`,  
    'intro': (characterName) => `images/Skills/${characterName}/SP_Icon${characterName}QTE.png`
  },
  sharedImages: {
    'tree1': (character) => `images/Stats/${character.Bonus1}.png`,
    'tree2': (character) => `images/Stats/${character.Bonus2}.png`, 
    'tree4': (character) => `images/Stats/${character.Bonus2}.png`,
    'tree5': (character) => `images/Stats/${character.Bonus1}.png`
  }
};