interface LeaderboardParams {
    characterId: string;
    weapon: string;
    sort?: string;
    direction?: 'asc' | 'desc';
    page?: number;
    sequence?: string;
    pageSize?: number;
}

export function createLeaderboardUrl(params: LeaderboardParams): string {
    const urlParams = new URLSearchParams({
        weapon: params.weapon
    });
    if (params.sort && params.sort !== 'damage') {
        urlParams.set('sort', params.sort);
    }
    if (params.direction && params.direction !== 'desc') {
        urlParams.set('direction', params.direction);
    }
    if (params.page && params.page > 1) {
        urlParams.set('page', String(params.page));
    }
    if (params.sequence && params.sequence !== 's0') {
        urlParams.set('sequence', params.sequence);
    }
    if (params.pageSize && params.pageSize !== 10) {
        urlParams.set('pageSize', String(params.pageSize));
    }
    return `/leaderboards/${params.characterId}?${urlParams.toString()}`;
}

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
    '24': {
        teamIds: ['3', '27'],
        stats: ['ATK', 'Energy Regen', 'Resonance Skill DMG Bonus', 'Spectro DMG'],
        weapons: ['2401', '2402', '2403'],
        enabled: false
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