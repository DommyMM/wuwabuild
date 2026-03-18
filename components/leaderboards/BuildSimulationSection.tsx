'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';
import { getBuildMoves, getBuildSubstatUpgrades, getBuildStandings, LBMoveEntry, LBSubstatUpgradeTierSet, LBStandingEntry } from '@/lib/lb';
import { BuildMoveBreakdown } from './BuildMoveBreakdown';
import { BuildSubstatUpgrades, BuildUpgradeColumn } from './BuildSubstatUpgrades';
import { BuildStandingsTable } from './BuildStandingsTable';

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
};

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

function getTierRollValue(values: number[] | null, tier: UpgradeTierKey): number | null {
  if (!values || values.length === 0) return null;
  if (tier === 'min') return values[0] ?? null;
  if (tier === 'max') return values[values.length - 1] ?? null;
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

function hasCacheKey<T>(record: Record<string, T>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

interface BuildSimulationSectionProps {
  buildId: string;
  characterId: string;
  characterName: string;
  activeWeaponId: string;
  activeTrackKey: string;
  isExpanded: boolean;
  baseDamage?: number;
  globalRank?: number;
}

export const BuildSimulationSection: React.FC<BuildSimulationSectionProps> = ({
  buildId,
  characterId,
  characterName,
  activeWeaponId,
  activeTrackKey,
  isExpanded,
  baseDamage,
  globalRank,
}) => {
  const { getWeapon, getSubstatValues, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();
  const moveControllerRef = useRef<AbortController | null>(null);
  const upgradeControllerRef = useRef<AbortController | null>(null);
  const standingsControllerRef = useRef<AbortController | null>(null);

  const [movesByKey, setMovesByKey] = useState<Record<string, LBMoveEntry[]>>({});
  const [moveErrorsByKey, setMoveErrorsByKey] = useState<Record<string, string | null>>({});
  const [loadingMoveKeys, setLoadingMoveKeys] = useState<Record<string, boolean>>({});
  const [upgradesByKey, setUpgradesByKey] = useState<Record<string, LBSubstatUpgradeTierSet | null>>({});
  const [upgradeErrorsByKey, setUpgradeErrorsByKey] = useState<Record<string, string | null>>({});
  const [loadingUpgradeKeys, setLoadingUpgradeKeys] = useState<Record<string, boolean>>({});
  const [isMovesOpen, setIsMovesOpen] = useState(false);
  const [isUpgradesOpen, setIsUpgradesOpen] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<UpgradeTierKey>('median');
  const [standings, setStandings] = useState<LBStandingEntry[] | null>(null);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const [isStandingsOpen, setIsStandingsOpen] = useState(false);
  const hasBoardContext = buildId.length > 0 && activeWeaponId.length > 0 && activeTrackKey.length > 0;
  const moveKey = `${buildId}:${activeWeaponId}:${activeTrackKey}`;
  const upgradeKey = `${buildId}:${activeWeaponId}:${activeTrackKey}`;
  const weapon = getWeapon(activeWeaponId);
  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : activeWeaponId;
  const trackLabel = formatTrackLabel(activeTrackKey);
  const moves = movesByKey[moveKey] ?? [];
  const moveError = moveErrorsByKey[moveKey] ?? null;
  const isMoveLoading = loadingMoveKeys[moveKey] ?? false;
  const activeUpgrades = upgradesByKey[upgradeKey] ?? null;
  const upgradesError = upgradeErrorsByKey[upgradeKey] ?? null;
  const upgradesLoading = loadingUpgradeKeys[upgradeKey] ?? false;
  const shouldLoadMoves = isExpanded && isMovesOpen;
  const shouldLoadUpgrades = isExpanded && isUpgradesOpen;

  const loadMoves = useCallback((controller: AbortController) => {
    setLoadingMoveKeys((prev) => ({ ...prev, [moveKey]: true }));
    setMoveErrorsByKey((prev) => ({ ...prev, [moveKey]: null }));

    void getBuildMoves(buildId, activeWeaponId, activeTrackKey, controller.signal)
      .then((payload) => {
        setMovesByKey((prev) => ({ ...prev, [moveKey]: payload }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setMoveErrorsByKey((prev) => ({
          ...prev,
          [moveKey]: error instanceof Error ? error.message : 'Failed to load move breakdown.',
        }));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoadingMoveKeys((prev) => ({ ...prev, [moveKey]: false }));
        if (moveControllerRef.current === controller) {
          moveControllerRef.current = null;
        }
      });
  }, [activeTrackKey, activeWeaponId, buildId, moveKey]);

  const loadUpgrades = useCallback((controller: AbortController) => {
    setLoadingUpgradeKeys((prev) => ({ ...prev, [upgradeKey]: true }));
    setUpgradeErrorsByKey((prev) => ({ ...prev, [upgradeKey]: null }));

    void getBuildSubstatUpgrades(buildId, activeWeaponId, activeTrackKey, controller.signal)
      .then((payload) => {
        setUpgradesByKey((prev) => ({ ...prev, [upgradeKey]: payload }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setUpgradeErrorsByKey((prev) => ({
          ...prev,
          [upgradeKey]: error instanceof Error ? error.message : 'Failed to load substat upgrades.',
        }));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoadingUpgradeKeys((prev) => ({ ...prev, [upgradeKey]: false }));
        if (upgradeControllerRef.current === controller) {
          upgradeControllerRef.current = null;
        }
      });
  }, [activeTrackKey, activeWeaponId, buildId, upgradeKey]);

  useEffect(() => {
    if (!shouldLoadMoves || !hasBoardContext) return;
    if (hasCacheKey(movesByKey, moveKey) || loadingMoveKeys[moveKey]) return;

    moveControllerRef.current?.abort();
    const controller = new AbortController();
    moveControllerRef.current = controller;
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      loadMoves(controller);
    });
  }, [hasBoardContext, loadMoves, loadingMoveKeys, moveKey, movesByKey, shouldLoadMoves]);

  useEffect(() => {
    if (!shouldLoadUpgrades || !buildId) return;
    if (hasCacheKey(upgradesByKey, upgradeKey) || loadingUpgradeKeys[upgradeKey]) return;

    upgradeControllerRef.current?.abort();
    const controller = new AbortController();
    upgradeControllerRef.current = controller;
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      loadUpgrades(controller);
    });
  }, [buildId, loadUpgrades, loadingUpgradeKeys, shouldLoadUpgrades, upgradeKey, upgradesByKey]);

  const loadStandings = useCallback((controller: AbortController) => {
    setStandingsLoading(true);
    setStandingsError(null);

    void getBuildStandings(characterId, buildId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setStandings(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        void err;
        setStandingsError('Could not load leaderboard rankings.');
      })
      .finally(() => {
        // Always null the ref so re-opens can start a new request.
        if (standingsControllerRef.current === controller) {
          standingsControllerRef.current = null;
        }
        if (controller.signal.aborted) return;
        setStandingsLoading(false);
      });
  }, [characterId, buildId]);

  useEffect(() => {
    if (!isExpanded || !isStandingsOpen || !characterId || !buildId) return;
    // Use the ref (not standingsLoading state) as the in-flight guard so this effect
    // doesn't re-run when standingsLoading changes and abort its own in-flight request.
    if (standings !== null || standingsControllerRef.current) return;

    const controller = new AbortController();
    standingsControllerRef.current = controller;
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      loadStandings(controller);
    });
    return () => { controller.abort(); };
  }, [isExpanded, isStandingsOpen, characterId, buildId, loadStandings, standings]);

  useEffect(() => (() => {
    moveControllerRef.current?.abort();
    upgradeControllerRef.current?.abort();
    standingsControllerRef.current?.abort();
  }), []);

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
    if (!activeUpgrades || !Number.isFinite(baseDamage) || (baseDamage ?? 0) <= 0) {
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
        const rollValue = getTierRollValue(getSubstatValues(label), selectedUpgradeTier) ?? 0;
        const percentGain = gain > 0 ? (gain / (baseDamage ?? 1)) * 100 : 0;
        const projectedRank = tierRankMap[key] ?? 0;
        const rankDelta = (globalRank ?? 0) - projectedRank;

        return {
          key,
          canonicalLabel: label,
          label: getEchoSubstatShortLabel(statTranslations?.[label] ? t(statTranslations[label]) : label),
          icon,
          rollValue,
          gain,
          result: (baseDamage ?? 0) + gain,
          percentGain,
          isPercent,
          projectedRank,
          rankDelta,
        };
      })
      .filter((column) => column.gain > 0);
  }, [activeUpgrades, baseDamage, getSubstatValues, globalRank, selectedUpgradeTier, statIcons, statTranslations, t]);

  const orderedUpgradeColumns = useMemo(
    () => canonicalUpgradeSort(upgradeColumns, statTranslations),
    [statTranslations, upgradeColumns],
  );

  const actionButtonClassName = 'flex w-full items-center justify-between rounded border border-border bg-background-secondary px-3 py-2 text-xs font-semibold text-text-primary/75 transition-colors hover:border-accent/60 hover:text-text-primary cursor-pointer';

  return (
    <div className="space-y-3 font-plus-jakarta">
      {hasBoardContext && (
        <>
          <div className="mx-auto w-48">
            <button
              type="button"
              aria-expanded={isMovesOpen}
              onClick={() => setIsMovesOpen((prev) => !prev)}
              className={actionButtonClassName}
              title={`${weaponName} • ${trackLabel}`}
            >
              <span>{isMovesOpen ? 'Hide' : 'Show'} move breakdown</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isMovesOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>
          </div>

          {isMovesOpen && (
            <BuildMoveBreakdown
              isLoading={isMoveLoading}
              error={moveError}
              moves={moves}
            />
          )}

          <div className="mx-auto w-48">
            <button
              type="button"
              aria-expanded={isUpgradesOpen}
              onClick={() => setIsUpgradesOpen((prev) => !prev)}
              className={actionButtonClassName}
              title={`${weaponName} • ${trackLabel}`}
            >
              <span>{isUpgradesOpen ? 'Hide' : 'Show'} substat upgrades</span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isUpgradesOpen ? 'rotate-180 text-accent' : ''}`} />
            </button>
          </div>

          {isUpgradesOpen && (
            <BuildSubstatUpgrades
              isLoading={upgradesLoading}
              error={upgradesError}
              hasUpgradeData={upgradeRows.length > 0}
              hasBaseDamage={Boolean(baseDamage)}
              baseDamage={baseDamage}
              globalRank={globalRank}
              tierOptions={UPGRADE_TIER_OPTIONS}
              selectedTier={selectedUpgradeTier}
              onSelectTier={(tier) => setSelectedUpgradeTier(tier as UpgradeTierKey)}
              orderedUpgradeColumns={orderedUpgradeColumns}
            />
          )}
        </>
      )}

      <div className="mx-auto w-48">
        <button
          type="button"
          aria-expanded={isStandingsOpen}
          onClick={() => setIsStandingsOpen((prev) => !prev)}
          className={actionButtonClassName}
        >
          <span>{isStandingsOpen ? 'Hide' : 'Show'} leaderboard rank</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isStandingsOpen ? 'rotate-180 text-accent' : ''}`} />
        </button>
      </div>

      {isStandingsOpen && (
        <section className="space-y-2">
          <BuildStandingsTable
            standings={standings}
            standingsLoading={standingsLoading}
            standingsError={standingsError}
            characterId={characterId}
            characterName={characterName}
            buildId={buildId}
            hasBoardContext={hasBoardContext}
            activeWeaponId={activeWeaponId}
            activeTrackKey={activeTrackKey}
          />
        </section>
      )}
    </div>
  );
};
