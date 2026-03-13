'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBuildMoves, getBuildSubstatUpgrades, LBMoveEntry, LBSubstatUpgradeTierSet } from '@/lib/lb';
import { formatFlatStat, formatPercentStat } from './buildFormatters';

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

type UpgradeColumn = {
  key: string;
  canonicalLabel: string;
  label: string;
  icon: string;
  rollValue: number;
  gain: number;
  result: number;
  percentGain: number;
  isPercent: boolean;
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

function formatDamage(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatUpgradeValue(value: number, isPercent: boolean): string {
  return isPercent ? formatPercentStat(value) : formatFlatStat(value);
}

function formatSignedUpgradeValue(value: number, isPercent: boolean): string {
  const formatted = formatUpgradeValue(value, isPercent);
  return value > 0 ? `+${formatted}` : formatted;
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `+${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function getTierRollValue(values: number[] | null, tier: UpgradeTierKey): number | null {
  if (!values || values.length === 0) return null;
  if (tier === 'min') return values[0] ?? null;
  if (tier === 'max') return values[values.length - 1] ?? null;
  return values[Math.max(0, Math.floor((values.length - 1) / 2))] ?? null;
}

function getGainColor(percentGain: number, maxPercentGain: number): string {
  if (!Number.isFinite(percentGain) || percentGain <= 0) return 'rgba(224,224,224,0.6)';
  const ratio = maxPercentGain > 0 ? Math.min(1, percentGain / maxPercentGain) : 0;
  const lightness = 61 + (ratio * 14);
  return `hsl(129 73% ${lightness}%)`;
}

function canonicalUpgradeSort(
  columns: UpgradeColumn[],
  statTranslations: Record<string, Record<string, string>> | null | undefined,
): UpgradeColumn[] {
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
    .filter((column): column is UpgradeColumn => column !== undefined);

  const orderedKeys = new Set(ordered.map((column) => column.key));
  const leftovers = columns.filter((column) => !orderedKeys.has(column.key));
  return [...ordered, ...leftovers];
}

function hasCacheKey<T>(record: Record<string, T>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

interface BuildSimulationSectionProps {
  buildId: string;
  activeWeaponId: string;
  activeTrackKey: string;
  isExpanded: boolean;
  baseDamage?: number;
}

export const BuildSimulationSection: React.FC<BuildSimulationSectionProps> = ({
  buildId,
  activeWeaponId,
  activeTrackKey,
  isExpanded,
  baseDamage,
}) => {
  const { getWeapon, getSubstatValues, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();
  const moveControllerRef = useRef<AbortController | null>(null);
  const upgradeControllerRef = useRef<AbortController | null>(null);

  const [movesByKey, setMovesByKey] = useState<Record<string, LBMoveEntry[]>>({});
  const [moveErrorsByKey, setMoveErrorsByKey] = useState<Record<string, string | null>>({});
  const [loadingMoveKeys, setLoadingMoveKeys] = useState<Record<string, boolean>>({});
  const [upgradesByKey, setUpgradesByKey] = useState<Record<string, LBSubstatUpgradeTierSet | null>>({});
  const [upgradeErrorsByKey, setUpgradeErrorsByKey] = useState<Record<string, string | null>>({});
  const [loadingUpgradeKeys, setLoadingUpgradeKeys] = useState<Record<string, boolean>>({});
  const [isMovesOpen, setIsMovesOpen] = useState(false);
  const [isUpgradesOpen, setIsUpgradesOpen] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState<UpgradeTierKey>('median');

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

  useEffect(() => (() => {
    moveControllerRef.current?.abort();
    upgradeControllerRef.current?.abort();
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
      .filter((row) => row.min > 0 || row.median > 0 || row.max > 0)
      .sort((a, b) => {
        if (b.median !== a.median) return b.median - a.median;
        if (b.max !== a.max) return b.max - a.max;
        return a.label.localeCompare(b.label);
      });
  }, [activeUpgrades, statIcons, statTranslations, t]);

  const upgradeColumns = useMemo<UpgradeColumn[]>(() => {
    if (!activeUpgrades || !Number.isFinite(baseDamage) || (baseDamage ?? 0) <= 0) {
      return [];
    }

    return Object.entries(activeUpgrades[selectedUpgradeTier] ?? {})
      .map(([key, gain]) => {
        const label = UPGRADE_STAT_LABELS[key] ?? key;
        const isPercent = !FLAT_UPGRADE_STATS.has(key);
        const icon = statIcons?.[label] ?? statIcons?.[label.replace('%', '')] ?? '';
        const rollValue = getTierRollValue(getSubstatValues(label), selectedUpgradeTier) ?? 0;
        const percentGain = gain > 0 ? (gain / (baseDamage ?? 1)) * 100 : 0;

        return {
          key,
          canonicalLabel: label,
          label: statTranslations?.[label] ? t(statTranslations[label]) : label,
          icon,
          rollValue,
          gain,
          result: (baseDamage ?? 0) + gain,
          percentGain,
          isPercent,
        };
      })
      .filter((column) => column.gain > 0);
  }, [activeUpgrades, baseDamage, getSubstatValues, selectedUpgradeTier, statIcons, statTranslations, t]);

  const orderedUpgradeColumns = useMemo(
    () => canonicalUpgradeSort(upgradeColumns, statTranslations),
    [statTranslations, upgradeColumns],
  );

  const strongestPercentGain = useMemo(
    () => orderedUpgradeColumns.reduce((max, column) => Math.max(max, column.percentGain), 0),
    [orderedUpgradeColumns],
  );

  if (!hasBoardContext) {
    return null;
  }

  const actionButtonClassName = 'flex w-full items-center justify-between rounded border border-border bg-background-secondary px-3 py-2 text-xs font-semibold text-text-primary/75 transition-colors hover:border-accent/60 hover:text-text-primary cursor-pointer';
  const sectionMetaClassName = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/45';

  return (
    <div className="space-y-3 font-plus-jakarta">
      <div className="mx-auto flex w-full max-w-56 flex-col gap-2">
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

      {isMovesOpen && (
        <section className="space-y-3">
          <div className={`text-center ${sectionMetaClassName}`}>
            {weaponName} • {trackLabel}
          </div>

          {isMoveLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`move-skeleton-${index}`} className="animate-pulse border-b border-border/45 py-2.5 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="h-4 w-40 rounded bg-white/10" />
                    <div className="h-4 w-20 rounded bg-white/8" />
                  </div>
                  <div className="mt-2 h-3 w-2/3 rounded bg-white/6" />
                </div>
              ))}
            </div>
          )}

          {!isMoveLoading && moveError && (
            <div className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {moveError}
            </div>
          )}

          {!isMoveLoading && !moveError && moves.length === 0 && (
            <div className="py-1 text-sm text-text-primary/60">
              No move breakdown available for this board.
            </div>
          )}

          {!isMoveLoading && !moveError && moves.length > 0 && (
            <div className="divide-y divide-border/45 border-y border-border/45">
              {moves.map((move, moveIndex) => (
                <article key={`${move.name}-${moveIndex}`} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-text-primary">
                        {move.name || `Move ${moveIndex + 1}`}
                      </div>
                      <div className="mt-0.5 text-xs text-text-primary/48">
                        {move.hits.length > 0 ? `${move.hits.length} hit${move.hits.length === 1 ? '' : 's'}` : 'Total damage'}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold text-accent">{formatDamage(move.damage)}</div>
                    </div>
                  </div>

                  {move.hits.length > 0 && (
                    <div className="mt-2 space-y-1.5 border-l border-border/45 pl-3">
                      {move.hits.map((hit, hitIndex) => (
                        <div
                          key={`${move.name}-${hit.name}-${hitIndex}`}
                          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-x-3 text-sm"
                        >
                          <div className="min-w-0 truncate text-text-primary/82">{hit.name}</div>
                          <div className="text-text-primary/55">{formatPercentStat(hit.percentage)}</div>
                          <div className="text-right font-medium text-white/88">{formatDamage(hit.damage)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {isUpgradesOpen && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border/60 bg-background-secondary/75 p-0.5">
              {UPGRADE_TIER_OPTIONS.map((option) => {
                const isActive = option.key === selectedUpgradeTier;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedUpgradeTier(option.key)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
                      isActive
                        ? 'bg-accent text-black'
                        : 'text-text-primary/62 hover:text-text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {upgradesLoading && (
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={`upgrade-skeleton-${index}`} className="grid grid-cols-[minmax(0,1.25fr)_0.8fr_0.8fr_0.8fr] gap-3 animate-pulse border-b border-border/45 py-2.5 last:border-b-0">
                  <div className="h-4 rounded bg-white/10" />
                  <div className="h-4 rounded bg-white/8" />
                  <div className="h-4 rounded bg-white/8" />
                  <div className="h-4 rounded bg-white/8" />
                </div>
              ))}
            </div>
          )}

          {!upgradesLoading && upgradesError && (
            <div className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {upgradesError}
            </div>
          )}

          {!upgradesLoading && !upgradesError && upgradeRows.length === 0 && (
            <div className="py-1 text-sm text-text-primary/60">
              No substat upgrade data available for this board.
            </div>
          )}

          {!upgradesLoading && !upgradesError && upgradeRows.length > 0 && !baseDamage && (
            <div className="py-1 text-sm text-text-primary/60">
              Missing current board context for projected result rendering.
            </div>
          )}

          {!upgradesLoading && !upgradesError && upgradeRows.length > 0 && Boolean(baseDamage) && orderedUpgradeColumns.length > 0 && (
            <table className="border-collapse text-sm mx-auto">
              <thead>
                <tr className="border-b border-border/55 text-xs font-semibold uppercase tracking-[0.18em] text-text-primary/48">
                  <th className="min-w-30 bg-background-secondary/48 py-2 pr-4 pl-3 text-left">Substat</th>
                  <th className="min-w-30 py-2 px-3 text-center text-accent">Original</th>
                  {orderedUpgradeColumns.map((column) => (
                    <th key={`upgrade-column-${column.key}`} className="min-w-30 py-2 px-3 text-center">
                      <div className="flex items-end justify-center gap-1">
                        {column.icon ? (
                          <img src={column.icon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
                        ) : (
                          <span className="h-3.5 w-3.5 shrink-0 rounded bg-white/12" />
                        )}
                        <span className="leading-none">{column.label}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-border/45">
                <tr>
                  <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">Projected damage</th>
                  <td className="px-3 py-2.5 text-center font-semibold text-white/92">
                    {formatDamage(baseDamage ?? 0)}
                  </td>
                  {orderedUpgradeColumns.map((column) => {
                    return (
                      <td key={`upgrade-result-${column.key}`} className="px-3 py-2.5 text-center">
                        <div className="font-semibold text-white/92">{formatDamage(column.result)}</div>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">Gain over base</th>
                  <td className="px-3 py-2.5 text-center text-text-primary/35">—</td>
                  {orderedUpgradeColumns.map((column) => (
                    <td key={`upgrade-gain-${column.key}`} className="px-3 py-2.5 text-center font-semibold" style={{ color: getGainColor(column.percentGain, strongestPercentGain) }}>
                      +{formatDamage(column.gain)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">% gain over base</th>
                  <td className="px-3 py-2.5 text-center text-text-primary/35">—</td>
                  {orderedUpgradeColumns.map((column) => (
                    <td key={`upgrade-percent-${column.key}`} className="px-3 py-2.5 text-center font-semibold" style={{ color: getGainColor(column.percentGain, strongestPercentGain) }}>
                      {formatSignedPercent(column.percentGain)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">Added roll</th>
                  <td className="px-3 py-2.5 text-center text-text-primary/35">—</td>
                  {orderedUpgradeColumns.map((column) => (
                    <td key={`upgrade-roll-${column.key}`} className="px-3 py-2.5 text-center text-text-primary/78">
                      {formatSignedUpgradeValue(column.rollValue, column.isPercent)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
};
