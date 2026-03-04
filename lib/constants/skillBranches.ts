export type SkillKey = 'normal-attack' | 'skill' | 'circuit' | 'liberation' | 'intro';

export interface SkillBranchDefinition {
  skillName: string;
  skillKey: SkillKey;
  treeKey: 'tree1' | 'tree2' | 'tree3' | 'tree4' | 'tree5';
  hasNodes: boolean;
}

export const SKILL_BRANCHES: SkillBranchDefinition[] = [
  { skillName: 'Normal Attack', skillKey: 'normal-attack', treeKey: 'tree1', hasNodes: true },
  { skillName: 'Resonance Skill', skillKey: 'skill', treeKey: 'tree2', hasNodes: true },
  { skillName: 'Forte Circuit', skillKey: 'circuit', treeKey: 'tree3', hasNodes: false },
  { skillName: 'Resonance Liberation', skillKey: 'liberation', treeKey: 'tree4', hasNodes: true },
  { skillName: 'Intro Skill', skillKey: 'intro', treeKey: 'tree5', hasNodes: true },
];

