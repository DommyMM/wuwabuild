interface CharacterConfig {
    teamIds: string[];
    stats: string[];
    weapons: string[];
    sequences?: string[];
    rotation?: string[];
    notes?: string;
}

export const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
    '24': {
        teamIds: ['3', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Spectro DMG'],
        weapons: ['2401', '2402', '2403']
    },
    '32': {
        teamIds: ['28', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Glacio DMG'],
        weapons: ["21030017", "21030015", "21030074", "21030044"],
        sequences: ['s0', 's1'],
        rotation: ['Intro', 'Skill', 'Forte Circuit', 'Liberation', 'Outro'],
        notes: '5-star weapons at R1, 4-star at R5. Thunderbolt at max stacks. \n S0R1 Shorekeeper + Moonlit Heron Zhezhi' 
    }
};