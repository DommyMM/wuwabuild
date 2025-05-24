interface CharacterConfig {
    teamIds: string[];
    stats: string[];
    weapons: string[];
    sequences?: string[];
    rotation?: string[];
    notes?: string;
    enabled: boolean;
}

export const CHARACTER_CONFIGS: Record<string, CharacterConfig> = {
    '11': {
        teamIds: ['28', '13'], 
        stats: ['ATK', 'Energy Regen', 'Heavy Attack DMG Bonus', 'Aero DMG'],
        weapons: ['21010016', '21010015', '21010064', '21010074'],
        sequences: ['s0'],
        rotation: ['Intro', 'Forte Circuit', 'Skill', 'Heavy', 'Enhanced Skill'],
        notes: '5-star weapons at R1, 4-star at R5. Autumntrace and Helios at 4 stacks. \n S0R1 Shorekeeper + Moonlit Mortefi',
        enabled: true
        },
    '24': {
        teamIds: ['3', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Spectro DMG'],
        weapons: ['21010026', '21010015', '21010074', '21010064'],
        sequences: ['s0', 's1'],
        rotation: ['Skill', '4 BA', 'Nuke','Again (Buffed)', 'Liberation'],
        notes: '5-star weapons at R1, 4-star at R5. Autumntrace and Helios at 4 stacks. \n Stellar Verina + Moonlit Heron Zhezhi',
        enabled: true
    },
        '29': {
        teamIds: ['28', '33'],
        stats: ['ATK', 'Energy Regen', 'Basic Attack DMG Bonus', 'Havoc DMG'],
        weapons: ['21020017', '21020015', '21020044', '21020084'],
        sequences: ['s0'],
        rotation: ['Intro', 'Skill + Lib', 'Spin', 'Nuke', 'Spin', 'Outro'],
        notes: '5-star weapons at R1, 4-star at R5. Red Spring with stacked buffs. \n S0R1 Shorekeeper + Midnight Roccia',
        enabled: true
    },
    '32': {
        teamIds: ['28', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Glacio DMG'],
        weapons: ["21030017", "21030015", "21030074", "21030044"],
        sequences: ['s0', 's1'],
        rotation: ['Intro', 'Skill', 'Forte Circuit', 'Liberation', 'Outro'],
        notes: '5-star weapons at R1, 4-star at R5. Thunderbolt at max stacks. \n S0R1 Shorekeeper + Moonlit Heron Zhezhi',
        enabled: true
    }
};