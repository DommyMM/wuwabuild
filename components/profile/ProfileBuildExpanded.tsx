'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateOverallRV, DEFAULT_PREFERRED_STATS } from '@/lib/calculations/rollValues';
import { isPercentStat, BASE_STATS } from '@/lib/constants/statMappings';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { saveDraftBuild } from '@/lib/storage';
import { Character } from '@/lib/character';
import { Echo } from '@/lib/echo';
import { LB_SUMMARY_ICON, LB_SUMMARY_ICON_EMPTY, LB_SUMMARY_PILL, LB_SUMMARY_ROW, LB_SUMMARY_RV, LB_SUMMARY_VAL, RegionBadge } from '@/components/leaderboards/constants';
import { formatFlatStat, formatPercentStat } from '@/components/leaderboards/formatters';
import { BuildSimulationSection } from '@/components/leaderboards/BuildSimulationSection';
import { LeaderboardCard } from './LeaderboardCard';
import posthog from 'posthog-js';

const BASE_STATS_SET = new Set<string>(BASE_STATS);

type SubstatSummaryEntry = {
  type: string;
  total: number;
  count: number;
  icon: string;
  isPercent: boolean;
};

function getBasePercentVariant(stat: string): string | null {
  if (BASE_STATS_SET.has(stat)) return `${stat}%`;
  if (stat.endsWith('%') && BASE_STATS_SET.has(stat.slice(0, -1))) return stat.slice(0, -1);
  return null;
}

function normalizeSubstatKey(type: string | null | undefined): string | null {
  if (!type) return null;
  const trimmed = type.trim();
  return trimmed.length > 0 ? trimmed : null;
}

interface ProfileBuildExpandedProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry | undefined;
  isExpanded: boolean;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
  statIcons: Record<string, string> | null;
  getEcho: (id: string | null) => Echo | null;
  translateText: (i18n: Record<string, string> | undefined, fallback: string) => string;
  onRetryDetail: (buildId: string) => void;
  globalRank?: number;
  damage?: number;
  activeTrackKey?: string;
  activeWeaponId?: string;
}

export const ProfileBuildExpanded: React.FC<ProfileBuildExpandedProps> = ({
  entry,
  detail,
  isExpanded,
  isDetailLoading,
  detailError,
  character,
  characterName,
  regionBadge,
  statIcons,
  onRetryDetail,
  globalRank,
  damage,
  activeTrackKey,
  activeWeaponId,
}) => {
  const router = useRouter();
  const { getSubstatValues, statTranslations } = useGameData();
  const [selectedSubstats, setSelectedSubstats] = useState<Set<string>>(new Set());
  const [hasManuallyInteracted, setHasManuallyInteracted] = useState(false);

  const handleViewBuild = () => {
    if (!detail) return;
    posthog.capture('profile_open_in_editor_click', {
      character_id: detail.buildState.characterId ?? null,
    });
    saveDraftBuild(detail.buildState);
    router.push('/edit');
  };

  const autoSelectedSubstats = useMemo(() => {
    if (!detail) return new Set<string>();
    const preferredStats = character?.preferredStats ?? DEFAULT_PREFERRED_STATS;
    const availableStats = new Set<string>();
    for (const panel of detail.buildState.echoPanels) {
      for (const sub of panel.stats.subStats) {
        const key = normalizeSubstatKey(sub.type);
        if (key && sub.value !== null) availableStats.add(key);
      }
    }
    const toSelect = new Set<string>();
    for (const stat of preferredStats) {
      if (availableStats.has(stat)) toSelect.add(stat);
      const variant = getBasePercentVariant(stat);
      if (variant && availableStats.has(variant)) toSelect.add(variant);
    }
    return toSelect;
  }, [detail, character]);

  const detailSubstatSummary = useMemo<SubstatSummaryEntry[]>(() => {
    if (!detail) return [];
    const map = new Map<string, SubstatSummaryEntry>();
    for (const panel of detail.buildState.echoPanels) {
      for (const sub of panel.stats.subStats) {
        const key = normalizeSubstatKey(sub.type);
        if (!key || sub.value === null) continue;
        const cur = map.get(key);
        if (cur) { cur.count += 1; cur.total += Number(sub.value); continue; }
        map.set(key, {
          type: key,
          total: Number(sub.value),
          count: 1,
          icon: statIcons?.[key] ?? statIcons?.[key.replace('%', '')] ?? '',
          isPercent: isPercentStat(key),
        });
      }
    }
    const statOrder: string[] = [];
    if (statTranslations) {
      const seen = new Set<string>();
      for (const rawKey of Object.keys(statTranslations)) {
        if (seen.has(rawKey) || !map.has(rawKey)) continue;
        statOrder.push(rawKey);
        seen.add(rawKey);
      }
    } else {
      statOrder.push(...map.keys());
    }
    const crits: string[] = [], flats: string[] = [], rest: string[] = [];
    for (const key of statOrder) {
      if (key === 'Crit Rate' || key === 'Crit DMG') crits.push(key);
      else if (BASE_STATS_SET.has(key)) flats.push(key);
      else rest.push(key);
    }
    return [...crits, ...rest, ...flats].map((key) => map.get(key)!);
  }, [detail, statIcons, statTranslations]);

  const activeSelectedSubstats = hasManuallyInteracted ? selectedSubstats : autoSelectedSubstats;
  const hasSelectedSubstats = activeSelectedSubstats.size > 0;
  const toggleSubstat = (type: string) => {
    const key = normalizeSubstatKey(type);
    if (!key) return;
    setHasManuallyInteracted(true);
    setSelectedSubstats((prev) => {
      const base = hasManuallyInteracted ? prev : autoSelectedSubstats;
      const next = new Set(base);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const totalSelectedRolls = useMemo(() => (
    detailSubstatSummary
      .filter((s) => activeSelectedSubstats.has(s.type))
      .reduce((sum, s) => sum + s.count, 0)
  ), [activeSelectedSubstats, detailSubstatSummary]);

  const overallRV = useMemo(() => {
    if (activeSelectedSubstats.size === 0 || detailSubstatSummary.length === 0) return 0;
    const selectedMap = new Map<string, { total: number; count: number }>();
    for (const s of detailSubstatSummary) {
      if (activeSelectedSubstats.has(s.type)) selectedMap.set(s.type, { total: s.total, count: s.count });
    }
    return calculateOverallRV(selectedMap, getSubstatValues);
  }, [activeSelectedSubstats, detailSubstatSummary, getSubstatValues]);

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="overflow-x-visible overflow-y-hidden border-t border-border/50 bg-black/15 tracking-wide"
        >
          <div className="mx-auto w-full max-w-330 space-y-4 px-4 pt-5 pb-3">
            {isDetailLoading && (
              <div className="flex items-center justify-center gap-3 py-8 text-sm text-text-primary/55">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                Loading build details...
              </div>
            )}

            {!isDetailLoading && detailError && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/45 bg-red-500/10 p-3 text-sm text-red-200">
                <span>{detailError}</span>
                <button
                  type="button"
                  className="rounded border border-red-300/60 px-2 py-1 text-xs font-semibold text-red-100 transition-colors hover:bg-red-400/15"
                  onClick={() => onRetryDetail(entry.id)}
                >
                  Retry
                </button>
              </div>
            )}

            {!isDetailLoading && !detailError && detail && (
              <>
                {/* ── LeaderboardCard — the hero visual ── */}
                <LeaderboardCard entry={entry} detail={detail} />

                {/* ── Substat summary pills ── */}
                {detailSubstatSummary.length > 0 && (
                  <div className={LB_SUMMARY_ROW}>
                    {detailSubstatSummary.map((summary) => {
                      const isSelected = activeSelectedSubstats.has(summary.type);
                      const isDimmed = hasSelectedSubstats && !isSelected;
                      const totalText = summary.isPercent
                        ? formatPercentStat(summary.total)
                        : formatFlatStat(summary.total);
                      return (
                        <button
                          key={`${detail.id}-summary-${summary.type}`}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleSubstat(summary.type)}
                          className={`${LB_SUMMARY_PILL} ${
                            isSelected
                              ? 'border-amber-300/75 opacity-100'
                              : isDimmed
                                ? 'border-amber-300/45 opacity-40'
                                : 'border-amber-300/45 opacity-100'
                          }`}
                          title={summary.type}
                        >
                          <span className="text-amber-300">x{summary.count}</span>
                          {summary.icon ? (
                            <img src={summary.icon} alt="" className={LB_SUMMARY_ICON} />
                          ) : (
                            <span className={LB_SUMMARY_ICON_EMPTY} />
                          )}
                          <span className={LB_SUMMARY_VAL}>{totalText}</span>
                        </button>
                      );
                    })}

                    <div
                      className={`${LB_SUMMARY_RV} ${
                        hasSelectedSubstats
                          ? 'border border-amber-300/75 opacity-100'
                          : 'border border-amber-300/45 opacity-70'
                      }`}
                    >
                      <span className="text-amber-300">x{totalSelectedRolls}</span>
                      <span>•</span>
                      <span className="text-amber-300">RV</span>
                      <span className={LB_SUMMARY_VAL}>{(totalSelectedRolls * overallRV).toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* ── Simulation section (standings + view in editor) ── */}
                <BuildSimulationSection
                  buildId={detail.id}
                  buildDetail={detail}
                  character={character}
                  characterId={detail.buildState.characterId ?? ''}
                  characterName={characterName}
                  regionBadge={regionBadge}
                  activeWeaponId={activeWeaponId ?? ''}
                  activeTrackKey={activeTrackKey ?? ''}
                  isExpanded={isExpanded}
                  baseDamage={damage}
                  globalRank={globalRank}
                  onViewInEditor={handleViewBuild}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
