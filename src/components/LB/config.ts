interface CharacterConfig {
    description: string;
    teamIds: string[];
    stats: string[];
}

export const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
    '24': {
        description: 'Jinhsi Hypercarry',
        teamIds: ['3', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Spectro DMG']
    },
    '32': {
        description: 'Team Rankings',
        teamIds: ['28', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Glacio DMG']
    }
};