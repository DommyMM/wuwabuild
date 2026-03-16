'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';
import { getBuildMoves, getBuildSubstatUpgrades, getBuildStandings, LBMoveEntry, LBSubstatUpgradeTierSet, LBStandingEntry } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { BuildMoveBreakdown } from './BuildMoveBreakdown';
import { BuildSubstatUpgrades, BuildUpgradeColumn } from './BuildSubstatUpgrades';

const UPGRADE_STAT_LABELS: Record<string, string> = {
  HP: 'HP',
  HPPct: 'HP%',
  ATK: 'ATK',
  ATKPct: 'ATK%',
  DEF: 'DEF',
  DEFPct: 'DEF%',
  CritRate: 'Crit Rate',
  CritDMG: 'Crit DMG',
  EnergyRegen: 'Energy Regen',
  HealingBonus: 'Healing Bonus',
  AeroDMG: 'Aero DMG',
  GlacioDMG: 'Glacio DMG',
  FusionDMG: 'Fusion DMG',
  ElectroDMG: 'Electro DMG',
  HavocDMG: 'Havoc DMG',
  SpectroDMG: 'Spectro DMG',
  BasicAttackDMG: 'Basic Attack DMG Bonus',
  HeavyAttackDMG: 'Heavy Attack DMG Bonus',
  ResonanceSkillDMG: 'Resonance Skill DMG Bonus',
  ResonanceLiberationDMG: 'Resonance Liberation DMG Bonus',
};

const FLAT_UPGRADE_STATS = new Set(['HP', 'ATK', 'DEF']);
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
  const { getWeapon, getCharacter, getSubstatValues, statIcons, statTranslations } = useGameData();
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

  useEffect(() => {
    if (!isExpanded || !isStandingsOpen || !characterId || !buildId) return;
    if (standings !== null) return;

    standingsControllerRef.current?.abort();
    const controller = new AbortController();
    standingsControllerRef.current = controller;

    setStandingsLoading(true);
    setStandingsError(null);

    getBuildStandings(characterId, buildId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setStandings(data);
        setStandingsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setStandingsError('Could not load leaderboard rankings.');
        setStandingsLoading(false);
      });

    return () => { controller.abort(); };
  }, [isExpanded, isStandingsOpen, characterId, buildId]); // eslint-disable-line react-hooks/exhaustive-deps

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
          {standingsLoading && (
            <div className="mx-auto w-fit min-w-96 space-y-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={`standings-skel-${i}`} className="grid animate-pulse grid-cols-[5rem_4rem_9rem_6rem_7rem_5rem] gap-3 py-2">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <div key={j} className="h-7 rounded bg-white/8" />
                  ))}
                </div>
              ))}
            </div>
          )}

          {!standingsLoading && standingsError && (
            <p className="text-center text-xs text-text-primary/40">{standingsError}</p>
          )}

          {!standingsLoading && !standingsError && standings && standings.length > 0 && (
            <table className="mx-auto border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/55 text-xs font-semibold uppercase tracking-[0.18em] text-text-primary/48">
                  <th className="min-w-20 bg-background-secondary/48 py-2 pr-4 pl-3 text-left">Rank</th>
                  <th className="min-w-16 py-2 px-3 text-left">Top%</th>
                  <th className="min-w-36 py-2 px-3 text-left">Weapon</th>
                  <th className="min-w-24 py-2 px-3 text-left">Team</th>
                  <th className="min-w-28 py-2 px-3 text-left">Board</th>
                  <th className="min-w-20 py-2 pl-3 pr-3 text-right">Damage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/45">
                {standings.map((standingEntry) => {
                  const weapon = getWeapon(standingEntry.weaponId);
                  const weaponName = weapon?.name ?? standingEntry.weaponId;
                  const weaponIcon = weapon ? getWeaponPaths(weapon) : null;
                  const isR1 = weapon?.rarity === '5-star';
                  const rankPct = standingEntry.total > 0 ? (standingEntry.rank / standingEntry.total) * 100 : 0;
                  const topPctText = rankPct < 0.001 ? '< 0.001%' : `top ${rankPct.toFixed(3)}%`;
                  const isActiveBoard = hasBoardContext &&
                    standingEntry.weaponId === activeWeaponId &&
                    standingEntry.trackKey === activeTrackKey;

                  return (
                    <tr key={standingEntry.key} className={isActiveBoard ? 'bg-accent/8' : ''}>
                      <td className={`py-2.5 pr-4 pl-3 font-semibold text-text-primary border-l-2 ${isActiveBoard ? 'border-l-accent bg-accent/5' : 'border-l-transparent bg-background-secondary/32'}`}>
                        {standingEntry.rank.toLocaleString()}<span className="text-text-primary/40 text-xs">/{standingEntry.total.toLocaleString()}</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-text-primary/55">
                        {topPctText}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {weaponIcon ? (
                            <img src={weaponIcon} alt={weaponName} className="h-8 w-8 shrink-0 object-contain" />
                          ) : (
                            <div className="h-8 w-8 shrink-0 rounded bg-white/10" />
                          )}
                          <div className="leading-tight">
                            <div className="text-xs font-medium text-text-primary/85">{weaponName}</div>
                            <div className="text-[11px] text-text-primary/40">{isR1 ? 'R1' : 'R5'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1">
                          {(() => {
                            const mainChar = getCharacter(characterId);
                            const allIds = mainChar ? [characterId, ...standingEntry.teamCharacterIds] : standingEntry.teamCharacterIds;
                            return allIds.map((id) => {
                              const c = getCharacter(id);
                              return c?.head ? (
                                <img key={id} src={c.head} alt={c.name} title={c.name} className="h-8 w-8 object-cover object-top" />
                              ) : (
                                <div key={id} className="h-8 w-8 bg-border/25" />
                              );
                            });
                          })()}
                        </div>
                      </td>
                      <td className="whitespace-nowrap py-2.5 px-3">
                        <Link
                          href={`/leaderboards/${encodeURIComponent(characterId)}?weaponId=${encodeURIComponent(standingEntry.weaponId)}&track=${encodeURIComponent(standingEntry.trackKey)}`}
                          className={`text-xs transition-colors hover:text-accent ${isActiveBoard ? 'font-semibold text-accent/80' : 'text-text-primary/65'}`}
                        >
                          {characterName} — {standingEntry.trackLabel}
                        </Link>
                      </td>
                      <td className="py-2.5 pl-3 pr-3 text-right font-semibold tabular-nums text-accent">
                        {Math.round(standingEntry.damage).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
};
