import { Echo } from '@/types/echo';
import { StatName } from '@/types/stats';

interface EchoBonus {
  stat: StatName;
  value: number;
}

/**
 * Get echo bonus for a specific echo.
 * Bonuses now come directly from CDN data (echo.bonuses field)
 * instead of the old hardcoded ECHO_BONUSES constant.
 */
export const getEchoBonus = (echo: Echo): ReadonlyArray<EchoBonus> | null => {
  return echo.bonuses ?? null;
};

/**
 * Check if an echo has a phantom variant.
 * Now data-driven via the phantomIconUrl field from CDN sync,
 * instead of the old hardcoded PHANTOM_ECHOES list.
 */
export const hasPhantomVariant = (echo: Echo): boolean => {
  return echo.phantomIconUrl !== undefined;
};
