import { Echo } from '@/lib/echo';
import { StatName } from '@/lib/constants/statMappings';

interface EchoBonus {
  stat: StatName;
  value: number;
  characterCondition?: string[];
}

// Get echo bonus for a specific echo from echo.bonuses field
export const getEchoBonus = (echo: Echo): ReadonlyArray<EchoBonus> | null => {
  return echo.bonuses ?? null;
};

// Check if an echo has a phantom variant from echo.phantomIconUrl field
export const hasPhantomVariant = (echo: Echo): boolean => {
  return echo.phantomIconUrl !== undefined;
};
