import { EchoPanelState, Echo } from '@/types/echo';
import { StatName } from '@/types/stats';

/**
 * Calculate the default stat value for an echo based on its cost and level.
 * 4-cost and 3-cost echoes provide ATK, 1-cost echoes provide HP.
 */
export const calculateEchoDefaultStat = (cost: number, level: number): number => {
  const normalLevels = Math.floor(level - Math.floor(level / 5));
  const bonusLevels = Math.floor(level / 5);

  switch (cost) {
    case 4:
      return 30 + (normalLevels * 4.5) + (bonusLevels * 6);
    case 3:
      return 20 + (normalLevels * 3) + (bonusLevels * 4);
    case 1:
      if (level === 0) return 456;
      return 456 + 72 + ((level - 1) * 73);
    default:
      return 0;
  }
};

/**
 * Sum up all default echo stats from equipped echo panels.
 * Returns separate totals for ATK (from 4-cost and 3-cost) and HP (from 1-cost).
 */
export const sumEchoDefaultStats = (
  echoPanels: EchoPanelState[],
  getEcho: (id: string | null) => Echo | null
): { atk: number; hp: number } => {
  let totalATK = 0;
  let totalHP = 0;

  echoPanels.forEach(panel => {
    if (!panel.id || panel.level === undefined) return;
    const echo = getEcho(panel.id);
    if (!echo) return;

    const defaultStat = calculateEchoDefaultStat(echo.cost, panel.level);
    if (echo.cost === 4 || echo.cost === 3) {
      totalATK += defaultStat;
    } else if (echo.cost === 1) {
      totalHP += defaultStat;
    }
  });

  return { atk: totalATK, hp: totalHP };
};

/**
 * Sum main stats of a specific type from all echo panels.
 */
export const sumMainStats = (statType: StatName, panels: EchoPanelState[]): number => {
  return panels.reduce((total, panel) => {
    if (panel.stats.mainStat.type === statType && panel.stats.mainStat.value) {
      return total + panel.stats.mainStat.value;
    }
    return total;
  }, 0);
};

/**
 * Sum substats of a specific type from all echo panels.
 */
export const sumSubStats = (statType: StatName, panels: EchoPanelState[]): number => {
  return panels.reduce((total, panel) => (
    total + panel.stats.subStats.reduce((subTotal, stat) => {
      if (stat.type === statType && stat.value) {
        return subTotal + stat.value;
      }
      return subTotal;
    }, 0)
  ), 0);
};

/**
 * Sum both main and substats of a specific type.
 */
export const sumAllStats = (statType: StatName, panels: EchoPanelState[]): number => {
  return sumMainStats(statType, panels) + sumSubStats(statType, panels);
};

/**
 * Get the total cost of all equipped echoes.
 */
export const getTotalEchoCost = (
  echoPanels: EchoPanelState[],
  getEcho: (id: string | null) => Echo | null
): number => {
  return echoPanels.reduce((total, panel) => {
    if (!panel.id) return total;
    const echo = getEcho(panel.id);
    return total + (echo?.cost ?? 0);
  }, 0);
};

/**
 * Check if the total echo cost exceeds the limit (12).
 */
export const isEchoCostOverLimit = (
  echoPanels: EchoPanelState[],
  getEcho: (id: string | null) => Echo | null,
  limit: number = 12
): boolean => {
  return getTotalEchoCost(echoPanels, getEcho) > limit;
};

/**
 * Create default echo stats structure.
 */
export const createDefaultEchoStats = () => ({
  mainStat: { type: null, value: null },
  subStats: Array(5).fill(null).map(() => ({ type: null, value: null }))
});

/**
 * Create a default echo panel state.
 */
export const createDefaultEchoPanelState = (): EchoPanelState => ({
  id: null,
  level: 0,
  selectedElement: null,
  stats: createDefaultEchoStats(),
  phantom: false
});
