export const LEADERBOARD_CHAR_CONFIGS: Record<string, { weapons: string[]; sequences: string[] }> = {
  '1107': { // Carlotta
    weapons: ['21030016', '21030015', '21030074', '21030044'],
    sequences: ['s0', 's1'],
  },
  '1205': { // Changli
    weapons: ['21020016', '21020044', '21020015', '21020084'],
    sequences: ['s0', 's2'],
  },
  '1304': { // Jinhsi
    weapons: ['21010026', '21010074', '21010064', '21010015'],
    sequences: ['s0', 's1'],
  },
  '1404': { // Jiyan
    weapons: ['21010074', '21010064', '21010015', '21010016'],
    sequences: ['s0'],
  },
  '1409': { // Cartethyia
    weapons: ['21020044', '21020056', '21020015', '21020084'],
    sequences: ['s0'],
  },
  '1506': { // Phoebe
    weapons: ['21050074', '21050046', '21050027', '21050016'],
    sequences: ['s0'],
  },
  '1507': { // Zani
    weapons: ['21040015', '21040036', '21040094', '21040074'],
    sequences: ['s0', 's2'],
  },
  '1603': { // Camellya
    weapons: ['21020044', '21020015', '21020084', '21020026'],
    sequences: ['s0'],
  },
};

export const LB_TABLE_GRID = 'grid-cols-[48px_160px_72px_72px_88px_130px_minmax(0,1fr)]';
export const DEFAULT_LB_SORT = 'damage';
export const DEFAULT_LB_SEQUENCE = 's0';
