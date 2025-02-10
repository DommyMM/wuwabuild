interface CharacterConfig {
    teamIds: string[];
    stats: string[];
    weapons: string[];
    sequences?: string[];
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
        sequences: ['s0', 's1']
    }
};