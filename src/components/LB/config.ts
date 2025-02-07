interface CharacterConfig {
    description: string;
    teamIds: string[];
    stats: string[];
    weapons: string[]; 
}

export const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
    '24': {
        description: 'Jinhsi Hypercarry',
        teamIds: ['3', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Spectro DMG'],
        weapons: ['2401', '2402', '2403'] // TODO: Replace with actual Jinhsi weapon IDs
    },
    '32': {
        description: 'S0R1 Carlotta Hypercarry',
        teamIds: ['28', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Glacio DMG'],
        weapons: ["21030015", "21030017", "21030074", "21030044"] // Static Mist, Last Dance, Thunderbolt, Undying Flame
    }
};