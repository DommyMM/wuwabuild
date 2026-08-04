'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';
import { Character } from '@/lib/character';
import { getBoardOptimality, getBuildMoves, getBuildStandings, getBuildSubstatUpgrades, isHealTrackKey, LBBoardOptimality, LBBuildDetailEntry, LBMoveEntry, LBStandingEntry, LBSubstatUpgradeTierSet } from '@/lib/lb';
import { BuildMoveBreakdown } from './BuildMoveBreakdown';
import { BuildSubstatUpgrades, BuildUpgradeColumn } from './BuildSubstatUpgrades';
import { BuildStandingsTable } from './BuildStandingsTable';
import { RegionBadge, ScoringMode } from './constants';
import { transportError, useKeyedResource } from './useKeyedResource';

const BuildOptimalityPanel = dynamic(() => import('./BuildOptimalityPanel').then((module) => module.BuildOptimalityPanel), {
  ssr: false,
  loading: () => (
    <div className="rounded border border-border bg-background-secondary/70 p-3 text-center text-xs text-text-primary/55">
      Loading benchmark...
    </div>
  ),
});

const UPGRADE_STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  hp_pct: 'HP%',
  atk: 'ATK',
  atk_pct: 'ATK%',
  def: 'DEF',
  def_pct: 'DEF%',
  crit_rate: 'Crit Rate',
  crit_dmg: 'Crit DMG',
  energy_regen: 'Energy Regen',
  healing_bonus: 'Healing Bonus',
  aero_dmg: 'Aero DMG',
  glacio_dmg: 'Glacio DMG',
  fusion_dmg: 'Fusion DMG',
  electro_dmg: 'Electro DMG',
  havoc_dmg: 'Havoc DMG',
  spectro_dmg: 'Spectro DMG',
  basic_attack_dmg: 'Basic Attack DMG Bonus',
  heavy_attack_dmg: 'Heavy Attack DMG Bonus',
  resonance_skill_dmg: 'Resonance Skill DMG Bonus',
  resonance_liberation_dmg: 'Resonance Liberation DMG Bonus',
};

const FLAT_UPGRADE_STATS = new Set(['hp', 'atk', 'def']);
const UPGRADE_TIER_OPTIONS = [
  { key: 'min', label: 'Min' },
  { key: 'median', label: 'Mid' },
  { key: 'max', label: 'Max' },
] as const;

type UpgradeTierKey = keyof LBSubstatUpgradeTierSet;

type UpgradeRow = {
  key: string;
  label: string;
  icon: string;
  min: number;
  median: number;
  max: number;
  isPercent: boolean;
};

type OrderedUpgradeColumn = BuildUpgradeColumn & {
  canonicalLabel: string;
  projectedRank: number;
  rankDelta: number;
  showRankDelta: boolean;
};

function getWeightedMedianRollValue(probabilities: Array<[number, number]> | null): number | null {
  if (!probabilities || probabilities.length === 0) return null;

  const validRolls = probabilities.filter(([value, probability]) => (
    Number.isFinite(value) && Number.isFinite(probability) && probability > 0
  ));
  const totalProbability = validRolls.reduce((total, [, probability]) => total + probability, 0);
  if (totalProbability <= 0) return null;

  const threshold = totalProbability / 2;
  let cumulative = 0;
  for (const [value, probability] of validRolls) {
    cumulative += probability;
    if (cumulative >= threshold) {
      return value;
    }
  }

  return validRolls[validRolls.length - 1]?.[0] ?? null;
}

function formatTrackLabel(trackKey: string): string {
  return trackKey
    .split('_')
    .filter(Boolean)
    .map((part) => {
      if (/^s\d+$/i.test(part)) return part.toUpperCase();
      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(' ');
}

function getTierRollValue(
  values: number[] | null,
  tier: UpgradeTierKey,
  probabilities?: Array<[number, number]> | null,
): number | null {
  if (!values || values.length === 0) return null;
  if (tier === 'min') return values[0] ?? null;
  if (tier === 'max') return values[values.length - 1] ?? null;
  const weightedMedian = getWeightedMedianRollValue(probabilities ?? null);
  if (weightedMedian != null) return weightedMedian;
  return values[Math.max(0, Math.floor((values.length - 1) / 2))] ?? null;
}

function canonicalUpgradeSort(
  columns: OrderedUpgradeColumn[],
  statTranslations: Record<string, Record<string, string>> | null | undefined,
): OrderedUpgradeColumn[] {
  const naturalOrder: string[] = [];

  if (statTranslations) {
    const seen = new Set<string>();
    for (const key of Object.keys(statTranslations)) {
      if (seen.has(key)) continue;
      if (columns.some((column) => column.canonicalLabel === key)) {
        naturalOrder.push(key);
        seen.add(key);
      }
    }
  } else {
    naturalOrder.push(...columns.map((column) => column.canonicalLabel));
  }

  const crits: string[] = [];
  const flats: string[] = [];
  const rest: string[] = [];

  for (const label of naturalOrder) {
    if (label === 'Crit Rate' || label === 'Crit DMG') {
      crits.push(label);
    } else if (label === 'ATK' || label === 'HP' || label === 'DEF') {
      flats.push(label);
    } else {
      rest.push(label);
    }
  }

  const orderedLabels = [...crits, ...rest, ...flats];
  const ordered = orderedLabels
    .map((label) => columns.find((column) => column.canonicalLabel === label))
    .filter((column): column is OrderedUpgradeColumn => column !== undefined);

  const orderedKeys = new Set(ordered.map((column) => column.key));
  const leftovers = columns.filter((column) => !orderedKeys.has(column.key));
  return [...ordered, ...leftovers];
}

// Centred and sized to their own label, so the chevron sits beside the text it
// belongs to and the stack reads as one column of controls with "View in
// Editor". Spanning the full measure left ~1000px of dead space between label
// and chevron; the old fixed 192px jammed them together instead.
const SECTION_TOGGLE_CLASS = 'mx-auto flex w-fit items-center gap-2 rounded border border-border bg-background-secondary px-4 py-2 text-xs font-semibold text-text-primary/75 transition-[color,border-color,transform] duration-150 hover:border-accent/60 hover:text-text-primary active:scale-[0.97] cursor-pointer';
const ACTION_BUTTON_CLASS = 'flex w-full items-center justify-center rounded border border-border bg-background-secondary px-3 py-2 text-xs font-semibold text-text-primary/75 transition-[color,border-color,transform] duration-150 hover:border-accent/60 hover:text-text-primary active:scale-[0.97] cursor-pointer';

interface BuildSimulationSectionProps {
  buildId: string;
  buildDetail: LBBuildDetailEntry;
  character: Character | null;
  characterId: string;
  characterName: string;
  regionBadge: RegionBadge | null;
  activeWeaponId: string;
  activeTrackKey: string;
  isExpanded: boolean;
  baseDamage?: number;
  globalRank?: number;
  currentScoring?: ScoringMode;
  onViewInEditor?: () => void;
}

export const BuildSimulationSection: React.FC<BuildSimulationSectionProps> = ({
  buildId,
  buildDetail,
  character,
  characterId,
  characterName,
  regionBadge,
  activeWeaponId,
  activeTrackKey,
  isExpanded,
  baseDamage,
  globalRank,
  currentScoring = 'adjusted',
  onViewInEditor,
}) => {
  const { getWeapon, getSubstatValues, getSubstatRollProbabilities, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();

  const [isMovesOpen, setIsMovesOpen] = useState(false);
  const [isUpgradesOpen, setIsUpgradesOpen] = useState(false);
  const [isOptimalityOpen, setIsOptimalityOpen] = useState(false);
  const [isStandingsOpen, setIsStandingsOpen] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<UpgradeTierKey>('median');

  const hasBoardContext = buildId.length > 0 && activeWeaponId.length > 0 && activeTrackKey.length > 0;
  // Moves, upgrades and the benchmark are all scoped to one build on one board.
  const boardKey = `${buildId}:${activeWeaponId}:${activeTrackKey}`;
  const weapon = getWeapon(activeWeaponId);
  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : activeWeaponId;
  const trackLabel = formatTrackLabel(activeTrackKey);
  const isHealing = isHealTrackKey(activeTrackKey);

  const movesResource = useKeyedResource<LBMoveEntry[]>({
    key: boardKey,
    enabled: isExpanded && isMovesOpen && hasBoardContext,
    fetch: (signal) => getBuildMoves(buildId, activeWeaponId, activeTrackKey, signal),
    errorMessage: transportError('Failed to load move breakdown.'),
  });
  const upgradesResource = useKeyedResource<LBSubstatUpgradeTierSet | null>({
    key: boardKey,
    enabled: isExpanded && isUpgradesOpen && buildId.length > 0,
    fetch: (signal) => getBuildSubstatUpgrades(buildId, activeWeaponId, activeTrackKey, signal),
    errorMessage: transportError('Failed to load substat upgrades.'),
  });
  const optimalityResource = useKeyedResource<LBBoardOptimality | null>({
    key: boardKey,
    enabled: isExpanded && isOptimalityOpen && hasBoardContext,
    fetch: (signal) => getBoardOptimality(characterId, activeWeaponId, activeTrackKey, buildId, signal),
    errorMessage: transportError('Failed to load reference benchmark.'),
  });
  // Standings span every board this build appears on, so they key on the build
  // alone. The transport error is swallowed for a reader-facing message.
  const standingsResource = useKeyedResource<LBStandingEntry[]>({
    key: characterId && buildId ? `${characterId}:${buildId}` : '',
    enabled: isExpanded && isStandingsOpen,
    fetch: (signal) => getBuildStandings(characterId, buildId, signal),
    errorMessage: () => 'Could not load leaderboard rankings.',
  });

  const moves = movesResource.data ?? [];
  const activeUpgrades = upgradesResource.data ?? null;
  const optimality = optimalityResource.data ?? null;
  const scoreBaseDamage = activeUpgrades?.baseDamage && activeUpgrades.baseDamage > 0
    ? activeUpgrades.baseDamage
    : currentScoring === 'raw'
      ? undefined
      : baseDamage;
  const scoreGlobalRank = activeUpgrades?.currentRank && activeUpgrades.currentRank > 0
    ? activeUpgrades.currentRank
    : currentScoring === 'raw'
      ? undefined
      : globalRank;
  const showUpgradeRankDelta = (scoreGlobalRank ?? 0) > 0;

  const upgradeRows = useMemo<UpgradeRow[]>(() => {
    if (!activeUpgrades) return [];
    const keys = new Set([
      ...Object.keys(activeUpgrades.min),
      ...Object.keys(activeUpgrades.median),
      ...Object.keys(activeUpgrades.max),
    ]);

    return Array.from(keys)
      .map((key) => {
        const label = UPGRADE_STAT_LABELS[key] ?? key;
        const isPercent = !FLAT_UPGRADE_STATS.has(key);
        const icon = statIcons?.[label] ?? statIcons?.[label.replace('%', '')] ?? '';
        return {
          key,
          label: statTranslations?.[label] ? t(statTranslations[label]) : label,
          icon,
          min: activeUpgrades.min[key] ?? 0,
          median: activeUpgrades.median[key] ?? 0,
          max: activeUpgrades.max[key] ?? 0,
          isPercent,
        };
      })
      .filter((row) => row.min > 0 || row.median > 0 || row.max > 0);
  }, [activeUpgrades, statIcons, statTranslations, t]);

  const upgradeColumns = useMemo<OrderedUpgradeColumn[]>(() => {
    if (!activeUpgrades || !Number.isFinite(scoreBaseDamage) || (scoreBaseDamage ?? 0) <= 0) {
      return [];
    }

    const tierRankMap: Record<string, number> =
      selectedUpgradeTier === 'min'
        ? activeUpgrades.minRank
        : selectedUpgradeTier === 'max'
          ? activeUpgrades.maxRank
          : activeUpgrades.medianRank;

    return Object.entries(activeUpgrades[selectedUpgradeTier] ?? {})
      .map(([key, gain]) => {
        const label = UPGRADE_STAT_LABELS[key] ?? key;
        const isPercent = !FLAT_UPGRADE_STATS.has(key);
        const icon = statIcons?.[label] ?? statIcons?.[label.replace('%', '')] ?? '';
        const rollValue = getTierRollValue(
          getSubstatValues(label),
          selectedUpgradeTier,
          getSubstatRollProbabilities(label),
        ) ?? 0;
        const percentGain = gain > 0 ? (gain / (scoreBaseDamage ?? 1)) * 100 : 0;
        const projectedRank = tierRankMap[key] ?? 0;
        const rankDelta = showUpgradeRankDelta ? ((scoreGlobalRank ?? 0) - projectedRank) : 0;

        return {
          key,
          canonicalLabel: label,
          label: getEchoSubstatShortLabel(statTranslations?.[label] ? t(statTranslations[label]) : label),
          icon,
          rollValue,
          gain,
          result: (scoreBaseDamage ?? 0) + gain,
          percentGain,
          isPercent,
          projectedRank,
          rankDelta,
          showRankDelta: showUpgradeRankDelta,
        };
      })
      .filter((column) => column.gain > 0);
  }, [activeUpgrades, getSubstatRollProbabilities, getSubstatValues, scoreBaseDamage, scoreGlobalRank, selectedUpgradeTier, showUpgradeRankDelta, statIcons, statTranslations, t]);

  const orderedUpgradeColumns = useMemo(
    () => canonicalUpgradeSort(upgradeColumns, statTranslations),
    [statTranslations, upgradeColumns],
  );

  return (
    // Width comes from the host shell so every section of the expanded row
    // shares one measure; this component never sets its own max-width.
    <div className="relative w-full space-y-3 font-plus-jakarta">
      {onViewInEditor && (
        <div className="mx-auto w-48">
          <button type="button" onClick={onViewInEditor} className={ACTION_BUTTON_CLASS}>
            View in Editor
          </button>
        </div>
      )}

      {hasBoardContext && (
        <>
          <div>
            <button
              type="button"
              aria-expanded={isMovesOpen}
              onClick={() => setIsMovesOpen((prev) => !prev)}
              className={SECTION_TOGGLE_CLASS}
              title={`${weaponName} • ${trackLabel}`}
            >
              <span>{isMovesOpen ? 'Hide' : 'Show'} {isHealing ? 'heal' : 'move'} breakdown</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isMovesOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>
          </div>

          {isMovesOpen && (
            <BuildMoveBreakdown
              isLoading={movesResource.isLoading}
              error={movesResource.error}
              moves={moves}
              isHealing={isHealing}
              scoreOverride={scoreBaseDamage}
              onRetry={movesResource.retry}
            />
          )}

          <div>
            <button
              type="button"
              aria-expanded={isUpgradesOpen}
              onClick={() => setIsUpgradesOpen((prev) => !prev)}
              className={SECTION_TOGGLE_CLASS}
              title={`${weaponName} • ${trackLabel}`}
            >
              <span>{isUpgradesOpen ? 'Hide' : 'Show'} substat upgrades</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isUpgradesOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>
          </div>

          {isUpgradesOpen && (
            <div className="space-y-2">
              {currentScoring === 'raw' && (
                <p className="text-center text-xs leading-snug text-text-primary/45">
                  Substat projections use Score, matching official ranks and upgrade deltas.
                </p>
              )}
              <BuildSubstatUpgrades
                isLoading={upgradesResource.isLoading}
                error={upgradesResource.error}
                hasUpgradeData={upgradeRows.length > 0}
                hasBaseDamage={Boolean(scoreBaseDamage)}
                baseDamage={scoreBaseDamage}
                globalRank={scoreGlobalRank}
                showRankDelta={showUpgradeRankDelta}
                tierOptions={UPGRADE_TIER_OPTIONS}
                selectedTier={selectedUpgradeTier}
                onSelectTier={(tier) => setSelectedUpgradeTier(tier as UpgradeTierKey)}
                orderedUpgradeColumns={orderedUpgradeColumns}
                onRetry={upgradesResource.retry}
              />
            </div>
          )}
        </>
      )}

      <div>
        <button
          type="button"
          aria-expanded={isStandingsOpen}
          onClick={() => setIsStandingsOpen((prev) => !prev)}
          className={SECTION_TOGGLE_CLASS}
        >
          <span>{isStandingsOpen ? 'Hide' : 'Show'} leaderboard rank</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isStandingsOpen ? 'rotate-180 text-accent' : ''}`} />
        </button>
      </div>

      {isStandingsOpen && (
        <section className="space-y-2">
          <BuildStandingsTable
            standings={standingsResource.data ?? null}
            standingsLoading={standingsResource.isLoading}
            standingsError={standingsResource.error}
            characterId={characterId}
            characterName={characterName}
            buildId={buildId}
            hasBoardContext={hasBoardContext}
            activeWeaponId={activeWeaponId}
            activeTrackKey={activeTrackKey}
            currentScoring={currentScoring}
            onRetry={standingsResource.retry}
          />
        </section>
      )}

      {hasBoardContext && (
        <>
          <div>
            <button
              type="button"
              aria-expanded={isOptimalityOpen}
              onClick={() => setIsOptimalityOpen((prev) => !prev)}
              className={SECTION_TOGGLE_CLASS}
              title={`${weaponName} • ${trackLabel}`}
            >
              <span>{isOptimalityOpen ? 'Hide' : 'Show'} theoretical bench</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOptimalityOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>
          </div>

          {isOptimalityOpen && (
            <BuildOptimalityPanel
              data={optimality}
              loading={optimalityResource.isLoading}
              error={optimalityResource.error}
              baseDamage={scoreBaseDamage}
              buildDetail={buildDetail}
              character={character}
              characterName={characterName}
              regionBadge={regionBadge}
              onRetry={optimalityResource.retry}
            />
          )}
        </>
      )}
    </div>
  );
};
