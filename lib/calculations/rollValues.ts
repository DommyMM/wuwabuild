import { EchoPanelState } from '@/lib/echo';
import { BASE_STATS } from '@/lib/constants/statMappings';

const ECHO_SUBSTAT_CV_MAX = 42;
const BUILD_SUBSTAT_CV_MAX = ECHO_SUBSTAT_CV_MAX * 5;
const MAX_FOUR_COST_CRIT_MAIN_CV = 44;

export interface QualityTier {
  label: string;
  minPct: number;
  color: string;
  bgColor?: string;
  isMax?: boolean;
}

export const QUALITY_TIERS: readonly QualityTier[] = [
  { label: 'MAX', minPct: 100, color: '#CC0000', bgColor: 'rgba(255,255,255,0.95)', isMax: true },
  { label: 'Perfect', minPct: 94.8, color: '#FF00FF' },
  { label: 'Excellent', minPct: 85.7, color: '#00FFFF' },
  { label: 'High', minPct: 76.2, color: '#00FF00' },
  { label: 'Decent', minPct: 66.7, color: '#E6B800' },
  { label: 'Passable', minPct: 60, color: '#FF8C00' },
  { label: 'Bad', minPct: 0, color: '#888888' },
];

interface SubstatLike {
  type: string | null;
  value: number | null;
}

interface EchoMainSummary {
  cost: number;
  statType: string;
}

const getQualityTier = (pct: number): QualityTier => {
  const normalized = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  return QUALITY_TIERS.find((tier) => normalized >= tier.minPct) ?? QUALITY_TIERS[QUALITY_TIERS.length - 1];
};

const getQualityTierStyle = (pct: number): QualityTier => {
  const tier = getQualityTier(pct);
  return { ...tier };
};

const pctOf = (value: number, max: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
};

const critCV = (statType: string | null | undefined, value: number | null | undefined): number => {
  if (value == null) return 0;
  switch ((statType ?? '').trim()) {
    case 'Crit Rate':
    case 'Crit. Rate':
      return Number(value) * 2;
    case 'Crit DMG':
    case 'Crit. DMG':
      return Number(value);
    default:
      return 0;
  }
};

const calculateSubstatQuality = (
  statType: string | null | undefined,
  value: number | null | undefined,
  getSubstatValues: (stat: string) => number[] | null,
): number => {
  if (!statType || value == null) return 0;
  const buckets = getSubstatValues(statType);
  if (!buckets || buckets.length === 0) return 0;
  const max = Math.max(...buckets);
  if (max <= 0) return 0;
  return Math.max(0, Number(value) / max);
};

// Full-sheet echo RV: missing substat lines count as zero because echo levels
// deterministically unlock all five lines at max level.
export function calculateEchoRV(
  subStats: ReadonlyArray<SubstatLike>,
  getSubstatValues: (stat: string) => number[] | null,
): number {
  const sum = subStats.reduce(
    (total, sub) => total + calculateSubstatQuality(sub.type, sub.value, getSubstatValues),
    0,
  );
  return (sum / 5) * 100;
}

// Preferred-stat RV answers a different question from full-sheet RV:
// "How good are the selected/relevant stat types that appeared?"
export function calculateSelectedStatsRV(
  selectedSubstats: Map<string, { total: number; count: number }>,
  getSubstatValues: (stat: string) => number[] | null,
): number {
  if (selectedSubstats.size === 0) return 0;

  let sumStatQuality = 0;
  let validStatCount = 0;

  for (const [statType, { total, count }] of selectedSubstats.entries()) {
    if (count === 0) continue;
    const quality = calculateSubstatQuality(statType, total / count, getSubstatValues);
    if (quality === 0) continue;
    sumStatQuality += quality;
    validStatCount += 1;
  }

  return validStatCount === 0 ? 0 : (sumStatQuality / validStatCount) * 100;
}

export const DEFAULT_PREFERRED_STATS = ['Crit Rate', 'Crit DMG', 'Energy Regen'];

const BASE_STATS_SET = new Set<string>(BASE_STATS);

const getBasePercentVariant = (stat: string): string | null => {
  if (BASE_STATS_SET.has(stat)) return `${stat}%`;
  if (stat.endsWith('%') && BASE_STATS_SET.has(stat.slice(0, -1))) return stat.slice(0, -1);
  return null;
};

export const getAvailablePreferredSubstats = (
  echoPanels: ReadonlyArray<EchoPanelState>,
  preferredStats: readonly string[],
): Set<string> => {
  const rolled = new Set<string>();
  for (const panel of echoPanels) {
    for (const substat of panel.stats.subStats) {
      const key = substat.type?.trim();
      if (key && substat.value !== null) rolled.add(key);
    }
  }

  const selected = new Set<string>();
  for (const stat of preferredStats) {
    if (rolled.has(stat)) selected.add(stat);
    const variant = getBasePercentVariant(stat);
    if (variant && rolled.has(variant)) selected.add(variant);
  }
  return selected;
};

// Individual echo CV is substats only. Main stats are deterministic and are not
// part of single-echo roll quality.
export const calculateEchoSubstatCV = (panel: EchoPanelState): number => (
  panel.stats.subStats.reduce((sum, stat) => sum + critCV(stat.type, stat.value), 0)
);

// Total build CV keeps the existing WuwaBuilds value model: all echo substat CV
// plus the best 4-cost crit main only. Extra 4-cost crit mains are penalized.
export const calculateCV = (
  echoPanels: EchoPanelState[],
  getEchoCost: (panel: EchoPanelState) => number | null | undefined,
): number => {
  let cv = echoPanels.reduce((sum, panel) => sum + calculateEchoSubstatCV(panel), 0);
  const fourCostCritMainCVs: number[] = [];

  echoPanels.forEach((panel) => {
    const mainCV = critCV(panel.stats.mainStat.type, panel.stats.mainStat.value);
    if (mainCV === 0) return;
    cv += mainCV;
    if (getEchoCost(panel) === 4) fourCostCritMainCVs.push(mainCV);
  });

  if (fourCostCritMainCVs.length > 1) {
    cv -= fourCostCritMainCVs.reduce((a, b) => a + b, 0) - Math.max(...fourCostCritMainCVs);
  }

  return cv;
};

const calculateAllowedCritMainCV = (
  mainStats: ReadonlyArray<EchoMainSummary> | null | undefined,
): number => (
  (mainStats ?? []).some((main) => main.cost === 4 && critCV(main.statType, MAX_FOUR_COST_CRIT_MAIN_CV) > 0)
    ? MAX_FOUR_COST_CRIT_MAIN_CV
    : 0
);

const calculateBuildSubstatCV = (
  finalCV: number,
  mainStats: ReadonlyArray<EchoMainSummary> | null | undefined,
): number => Math.max(0, Number(finalCV) - calculateAllowedCritMainCV(mainStats));

export const getEchoCVTierStyle = (cv: number): QualityTier => getQualityTierStyle(pctOf(cv, ECHO_SUBSTAT_CV_MAX));

// RV averages all five substat lines against their max roll, so reaching a given
// percentile is rarer than the same CV percentile — grade RV one quality tier more
// generously (e.g. a "High"/green CV band shows as "Excellent"/cyan for RV). The MAX
// glow still requires a literal 100 (every line maxed); a genuinely low RV stays Bad.
export const getEchoRVTierStyle = (rv: number): QualityTier => {
  const normalized = Math.max(0, Math.min(100, Number.isFinite(rv) ? rv : 0));
  if (normalized >= 100) return { ...QUALITY_TIERS[0] };
  const lastIdx = QUALITY_TIERS.length - 1;
  const baseIdx = QUALITY_TIERS.findIndex((tier) => normalized >= tier.minPct);
  const idx = baseIdx < 0 ? lastIdx : baseIdx;
  const bumpedIdx = idx === lastIdx ? lastIdx : Math.max(1, idx - 1);
  return { ...QUALITY_TIERS[bumpedIdx] };
};

export const getEchoCVFrameColor = (cv: number): string => {
  const tier = getEchoCVTierStyle(cv);
  return tier.label === 'Bad' ? '#fbbf24' : tier.color;
};

const getBuildCVTierStyle = (
  finalCV: number,
  mainStats: ReadonlyArray<EchoMainSummary> | null | undefined,
): QualityTier => getQualityTierStyle(pctOf(calculateBuildSubstatCV(finalCV, mainStats), BUILD_SUBSTAT_CV_MAX));

export const getBuildCVRatingColor = (
  finalCV: number,
  mainStats: ReadonlyArray<EchoMainSummary> | null | undefined,
): string => getBuildCVTierStyle(finalCV, mainStats).color;
