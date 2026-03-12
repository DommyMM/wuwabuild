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

type UpgradeRow = {
  key: string;
  label: string;
  icon: string;
  min: number;
  median: number;
  max: number;
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

function hasCacheKey<T>(record: Record<string, T>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

interface BuildSimulationSectionProps {
  buildId: string;
  activeWeaponId: string;
  activeTrackKey: string;
  isExpanded: boolean;
}

export const BuildSimulationSection: React.FC<BuildSimulationSectionProps> = ({
  buildId,
  activeWeaponId,
  activeTrackKey,
  isExpanded,
}) => {
  const { getWeapon, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();
  const moveControllerRef = useRef<AbortController | null>(null);
  const upgradeControllerRef = useRef<AbortController | null>(null);

  const [movesByKey, setMovesByKey] = useState<Record<string, LBMoveEntry[]>>({});
  const [moveErrorsByKey, setMoveErrorsByKey] = useState<Record<string, string | null>>({});
  const [loadingMoveKeys, setLoadingMoveKeys] = useState<Record<string, boolean>>({});
  const [upgradesByWeaponTrack, setUpgradesByWeaponTrack] = useState<Record<string, Record<string, LBSubstatUpgradeTierSet>> | null>(null);
  const [upgradesLoading, setUpgradesLoading] = useState(false);
  const [upgradesError, setUpgradesError] = useState<string | null>(null);
  const [isMovesOpen, setIsMovesOpen] = useState(false);
  const [isUpgradesOpen, setIsUpgradesOpen] = useState(false);

  const hasBoardContext = buildId.length > 0 && activeWeaponId.length > 0 && activeTrackKey.length > 0;
  const moveKey = `${buildId}:${activeWeaponId}:${activeTrackKey}`;
  const weapon = getWeapon(activeWeaponId);
  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : activeWeaponId;
  const trackLabel = formatTrackLabel(activeTrackKey);
  const moves = movesByKey[moveKey] ?? [];
  const moveError = moveErrorsByKey[moveKey] ?? null;
  const isMoveLoading = loadingMoveKeys[moveKey] ?? false;
  const activeUpgrades = upgradesByWeaponTrack?.[activeWeaponId]?.[activeTrackKey] ?? null;
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
    setUpgradesLoading(true);
    setUpgradesError(null);

    void getBuildSubstatUpgrades(buildId, controller.signal)
      .then((payload) => {
        setUpgradesByWeaponTrack(payload);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setUpgradesError(error instanceof Error ? error.message : 'Failed to load substat upgrades.');
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setUpgradesLoading(false);
        if (upgradeControllerRef.current === controller) {
          upgradeControllerRef.current = null;
        }
      });
  }, [buildId]);

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
    if (!shouldLoadUpgrades || !buildId || upgradesByWeaponTrack || upgradesLoading) return;

    upgradeControllerRef.current?.abort();
    const controller = new AbortController();
    upgradeControllerRef.current = controller;
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      loadUpgrades(controller);
    });
  }, [buildId, loadUpgrades, shouldLoadUpgrades, upgradesByWeaponTrack, upgradesLoading]);

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

  if (!hasBoardContext) {
    return null;
  }

  const actionRowClassName = 'group flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-[linear-gradient(155deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_34%,rgba(0,0,0,0.34)_100%)] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.22)] transition-colors hover:border-accent/35 hover:bg-[linear-gradient(155deg,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0.04)_34%,rgba(0,0,0,0.38)_100%)]';

  return (
    <div className="space-y-3">
      <section className="space-y-2">
        <button
          type="button"
          aria-expanded={isMovesOpen}
          onClick={() => setIsMovesOpen((prev) => !prev)}
          className={actionRowClassName}
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent/82">Move Breakdown</div>
            <div className="mt-1 truncate text-sm text-text-primary/68">{weaponName} • {trackLabel}</div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-text-primary/60 transition-transform ${isMovesOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMovesOpen && (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_28%,rgba(0,0,0,0.34)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.28)]">
            {isMoveLoading && (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`move-skeleton-${index}`} className="animate-pulse rounded-xl border border-white/8 bg-black/25 p-3">
                    <div className="h-4 w-40 rounded bg-white/10" />
                    <div className="mt-3 h-3 w-full rounded bg-white/6" />
                    <div className="mt-2 h-3 w-2/3 rounded bg-white/6" />
                  </div>
                ))}
              </div>
            )}

            {!isMoveLoading && moveError && (
              <div className="rounded-xl border border-red-400/35 bg-red-500/8 px-3 py-2 text-sm text-red-100">
                {moveError}
              </div>
            )}

            {!isMoveLoading && !moveError && moves.length === 0 && (
              <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-4 text-sm text-text-primary/60">
                No move breakdown available for this board.
              </div>
            )}

            {!isMoveLoading && !moveError && moves.map((move, moveIndex) => (
              <article
                key={`${move.name}-${moveIndex}`}
                className="rounded-xl border border-white/8 bg-black/22 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-text-primary">{move.name || `Move ${moveIndex + 1}`}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-text-primary/45">
                      {move.hits.length > 0 ? `${move.hits.length} hit${move.hits.length === 1 ? '' : 's'}` : 'Total'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-semibold text-accent">{formatDamage(move.damage)}</div>
                    <div className="text-[11px] uppercase tracking-[0.16em] text-text-primary/45">Damage</div>
                  </div>
                </div>

                {move.hits.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {move.hits.map((hit, hitIndex) => (
                      <div
                        key={`${move.name}-${hit.name}-${hitIndex}`}
                        className="rounded-lg border border-white/7 bg-white/[0.03] px-2.5 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 text-sm font-medium text-text-primary">{hit.name}</div>
                          <div className="shrink-0 text-sm font-semibold text-white/88">{formatDamage(hit.damage)}</div>
                        </div>
                        <div className="mt-1 text-xs text-text-primary/55">{formatPercentStat(hit.percentage)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <button
          type="button"
          aria-expanded={isUpgradesOpen}
          onClick={() => setIsUpgradesOpen((prev) => !prev)}
          className={actionRowClassName}
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-accent/82">Substat Upgrades</div>
            <div className="mt-1 truncate text-sm text-text-primary/68">{weaponName} • {trackLabel}</div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-text-primary/60 transition-transform ${isUpgradesOpen ? 'rotate-180' : ''}`} />
        </button>

        {isUpgradesOpen && (
          <div className="rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.03)_28%,rgba(0,0,0,0.34)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.28)]">
            {upgradesLoading && (
              <div className="space-y-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={`upgrade-skeleton-${index}`} className="grid grid-cols-[minmax(0,1.2fr)_0.8fr_0.8fr_0.8fr] gap-3 animate-pulse rounded-lg border border-white/8 bg-black/20 px-3 py-2.5">
                    <div className="h-4 rounded bg-white/10" />
                    <div className="h-4 rounded bg-white/8" />
                    <div className="h-4 rounded bg-white/8" />
                    <div className="h-4 rounded bg-white/8" />
                  </div>
                ))}
              </div>
            )}

            {!upgradesLoading && upgradesError && (
              <div className="rounded-xl border border-red-400/35 bg-red-500/8 px-3 py-2 text-sm text-red-100">
                {upgradesError}
              </div>
            )}

            {!upgradesLoading && !upgradesError && upgradeRows.length === 0 && (
              <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-4 text-sm text-text-primary/60">
                No substat upgrade data available for this board.
              </div>
            )}

            {!upgradesLoading && !upgradesError && upgradeRows.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-white/8 bg-black/18">
                <div className="grid grid-cols-[minmax(0,1.2fr)_0.8fr_0.8fr_0.8fr] gap-3 border-b border-white/8 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/50">
                  <div>Stat</div>
                  <div className="text-right">Min</div>
                  <div className="text-right">Median</div>
                  <div className="text-right">Max</div>
                </div>

                <div className="divide-y divide-white/6">
                  {upgradeRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid grid-cols-[minmax(0,1.2fr)_0.8fr_0.8fr_0.8fr] gap-3 px-3 py-2.5 text-sm"
                    >
                      <div className="flex min-w-0 items-center gap-2 text-text-primary">
                        {row.icon ? (
                          <img src={row.icon} alt="" className="h-4 w-4 shrink-0 object-contain" />
                        ) : (
                          <span className="h-4 w-4 shrink-0 rounded bg-white/12" />
                        )}
                        <span className="truncate">{row.label}</span>
                      </div>
                      <div className="text-right text-text-primary/68">{formatUpgradeValue(row.min, row.isPercent)}</div>
                      <div className="text-right font-semibold text-white/90">{formatUpgradeValue(row.median, row.isPercent)}</div>
                      <div className="text-right text-accent">{formatUpgradeValue(row.max, row.isPercent)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
