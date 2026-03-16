'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { useResolvedLeaderboardLink } from '@/hooks/useResolvedLeaderboardLink';
import { calculateEchoSubstatCV, getEchoCVFrameColor, getEchoCVTierStyle } from '@/lib/calculations/rollValues';
import { calculateOverallRV, DEFAULT_PREFERRED_STATS } from '@/lib/calculations/rollValues';
import { getSubstatTierColor } from '@/lib/calculations/substatTiers';
import { isPercentStat, BASE_STATS } from '@/lib/constants/statMappings';
import { FORTE_LABELS } from '@/lib/constants/skillBranches';
import { Echo } from '@/lib/echo';
import { Character } from '@/lib/character';
import { getBuildStandings, LBBuildDetailEntry, LBBuildRowEntry, LBStandingEntry } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { ECHO_IMAGE_FADE_STYLE } from '@/components/card/EchoSection';
import { saveDraftBuild } from '@/lib/storage';
import { RegionBadge } from './constants';
import { formatFlatStat, formatPercentStat } from './formatters';
import { BuildSimulationSection } from './BuildSimulationSection';

type SubstatSummaryEntry = {
  type: string;
  total: number;
  count: number;
  icon: string;
  isPercent: boolean;
};

const BASE_STATS_SET = new Set<string>(BASE_STATS);
const SUMMARY_PILL_ROW_CLASS_NAME = 'mx-auto flex w-max max-w-none flex-nowrap items-center justify-center gap-2';

const SkeletonBlock: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse rounded bg-white/8 ${className}`} />
);

const BuildExpandedSkeleton: React.FC = () => (
  <>
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-sm" />
        <SkeletonBlock className="h-6 w-36" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {Array.from({ length: 5 }).map((_, index) => (
          <SkeletonBlock key={`forte-skeleton-${index}`} className="h-6 w-16 rounded" />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-5 w-10 rounded-full" />
      </div>
    </div>

    <div className="grid grid-cols-5 gap-4 min-w-0">
      {Array.from({ length: 5 }).map((_, panelIndex) => (
        <div
          key={`echo-panel-skeleton-${panelIndex}`}
          className="relative min-w-0 aspect-6/5 rounded-xl border border-white/10 bg-[linear-gradient(170deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_28%,rgba(0,0,0,0.28)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_-14px_24px_rgba(0,0,0,0.12),0_8px_16px_rgba(0,0,0,0.24)]"
        >
          <div className="absolute top-0 left-1/2 z-3 -translate-x-1/2 -translate-y-1/2">
            <SkeletonBlock className="h-6 w-6 rounded-full" />
          </div>

          <div className="absolute inset-0 overflow-hidden rounded-xl">
            <div className="absolute inset-y-0 left-0 w-[58%] bg-white/4" />
          </div>

          <div className="relative z-2 flex h-full">
            <div className="flex w-1/2 flex-col items-start justify-between p-2">
              <div className="flex flex-col items-start gap-1">
                <SkeletonBlock className="h-7 w-16 rounded-md" />
              </div>
              <SkeletonBlock className="h-8 w-20 rounded-md" />
            </div>

            <div className="flex w-1/2 flex-col items-stretch justify-center gap-1 py-2.5 pl-8 pr-2">
              {Array.from({ length: 5 }).map((_, subIndex) => (
                <SkeletonBlock key={`echo-sub-skeleton-${panelIndex}-${subIndex}`} className="h-8 w-full rounded-sm" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className={SUMMARY_PILL_ROW_CLASS_NAME}>
      {Array.from({ length: 7 }).map((_, index) => (
        <SkeletonBlock key={`summary-pill-skeleton-${index}`} className="h-9 w-26 rounded-full" />
      ))}
    </div>

    <div className="flex justify-center">
      <SkeletonBlock className="h-9 w-28 rounded" />
    </div>
  </>
);

// Returns the paired variant: "ATK" <-> "ATK%", "HP" <-> "HP%", "DEF" <-> "DEF%", else null
function getBasePercentVariant(stat: string): string | null {
  if (BASE_STATS_SET.has(stat)) return `${stat}%`;
  if (stat.endsWith('%') && BASE_STATS_SET.has(stat.slice(0, -1))) return stat.slice(0, -1);
  return null;
}

interface BuildExpandedProps {
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
  activeBoardWeaponId?: string;
  activeTrackKey?: string;
  activeBoardDamage?: number;
  globalRank?: number;
}

function normalizeSubstatKey(type: string | null | undefined): string | null {
  if (!type) return null;
  const trimmed = type.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export const BuildExpanded: React.FC<BuildExpandedProps> = ({
  entry,
  detail,
  isExpanded,
  isDetailLoading,
  detailError,
  character,
  characterName,
  regionBadge,
  statIcons,
  getEcho,
  translateText,
  onRetryDetail,
  activeBoardWeaponId,
  activeTrackKey,
  activeBoardDamage,
  globalRank,
}) => {
  const router = useRouter();
  const { fettersByElement, getSubstatValues, getWeapon, getCharacter, statTranslations } = useGameData();
  const [selectedSubstats, setSelectedSubstats] = useState<Set<string>>(new Set());
  const [hasManuallyInteracted, setHasManuallyInteracted] = useState(false);

  const [standings, setStandings] = useState<LBStandingEntry[] | null>(null);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const standingsControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isExpanded || !detail) return;
    if (standings !== null) return;

    const characterId = detail.buildState.characterId;
    const buildId = detail.id;
    if (!characterId || !buildId) return;

    standingsControllerRef.current?.abort();
    const controller = new AbortController();
    standingsControllerRef.current = controller;

    setStandingsLoading(true);
    setStandingsError(null);

    getBuildStandings(characterId, buildId, controller.signal)
      .then((data) => {
        setStandings(data);
        setStandingsLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setStandingsError('Could not load leaderboard rankings.');
        setStandingsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [isExpanded, detail]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewBuild = () => {
    if (!detail) return;
    saveDraftBuild(detail.buildState);
    router.push('/edit');
  };

  const leaderboardLink = useResolvedLeaderboardLink({
    characterId: detail?.buildState.characterId ?? entry.character.id,
    weaponId: detail?.buildState.weaponId ?? entry.weapon.id,
    sequence: detail?.buildState.sequence ?? entry.sequence,
    getWeapon,
  });
  const hasLeaderboardBoardContext = Boolean(detail && activeBoardWeaponId && activeTrackKey);

  const handleViewLeaderboard = () => {
    if (!leaderboardLink) return;
    router.push(leaderboardLink.href);
  };

  // Derive character default substat selections without effect-driven state updates.
  const autoSelectedSubstats = useMemo(() => {
    if (!detail) return new Set<string>();

    const preferredStats = character?.preferredStats ?? DEFAULT_PREFERRED_STATS;

    // Find which of the preferred stats are actually present in this build.
    const availableStats = new Set<string>();
    for (const panel of detail.buildState.echoPanels) {
      for (const sub of panel.stats.subStats) {
        const normalizedType = normalizeSubstatKey(sub.type);
        if (normalizedType && sub.value !== null) {
          availableStats.add(normalizedType);
        }
      }
    }

    // Select preferred stats that are present, including their base/percent variant.
    const toSelect = new Set<string>();
    for (const stat of preferredStats) {
      if (availableStats.has(stat)) {
        toSelect.add(stat);
      }
      const variant = getBasePercentVariant(stat);
      if (variant && availableStats.has(variant)) {
        toSelect.add(variant);
      }
    }

    return toSelect;
  }, [detail, character]);

  const detailSubstatSummary = useMemo<SubstatSummaryEntry[]>(() => {
    if (!detail) return [];
    const summaryMap = new Map<string, SubstatSummaryEntry>();
    for (const panel of detail.buildState.echoPanels) {
      for (const sub of panel.stats.subStats) {
        const normalizedType = normalizeSubstatKey(sub.type);
        if (!normalizedType || sub.value === null) continue;
        const current = summaryMap.get(normalizedType);
        if (current) {
          current.count += 1;
          current.total += Number(sub.value);
          continue;
        }
        summaryMap.set(normalizedType, {
          type: normalizedType,
          total: Number(sub.value),
          count: 1,
          icon: statIcons?.[normalizedType] ?? statIcons?.[normalizedType.replace('%', '')] ?? '',
          isPercent: isPercentStat(normalizedType),
        });
      }
    }

    // Use natural order from statTranslations, with crits first and flat stats last
    const statOrder: string[] = [];
    if (statTranslations) {
      const seen = new Set<string>();
      for (const rawKey of Object.keys(statTranslations)) {
        if (seen.has(rawKey)) continue;
        if (summaryMap.has(rawKey)) {
          statOrder.push(rawKey);
          seen.add(rawKey);
        }
      }
    } else {
      statOrder.push(...summaryMap.keys()); // Else just use map order
    }

    // Crit first and flats last, rest is natural
    const crits: string[] = [];
    const flats: string[] = [];
    const rest: string[] = [];

    for (const key of statOrder) {
      if (key === 'Crit Rate' || key === 'Crit DMG') {
        crits.push(key);
      } else if (BASE_STATS_SET.has(key)) {
        flats.push(key);
      } else {
        rest.push(key);
      }
    }

    return [...crits, ...rest, ...flats].map((key) => summaryMap.get(key)!);
  }, [detail, statIcons, statTranslations]);

  const activeSelectedSubstats = hasManuallyInteracted ? selectedSubstats : autoSelectedSubstats;
  const hasSelectedSubstats = activeSelectedSubstats.size > 0;
  const useCompactSummaryRow = detailSubstatSummary.length >= 13;
  const summaryRowClassName = useCompactSummaryRow
    ? 'mx-auto flex w-max max-w-none flex-nowrap items-center justify-center gap-1.5'
    : SUMMARY_PILL_ROW_CLASS_NAME;
  const summaryPillClassName = useCompactSummaryRow
    ? 'inline-flex items-center gap-1 rounded-full border bg-black/45 px-2 py-0.75 text-[13px] font-semibold text-white/92 transition-all duration-200 cursor-pointer hover:border-amber-200/65'
    : 'inline-flex items-center gap-1.25 rounded-full border bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92 transition-all duration-200 cursor-pointer hover:border-amber-200/65';
  const summaryValueClassName = useCompactSummaryRow ? 'text-sm' : 'text-base';
  const summaryIconClassName = useCompactSummaryRow ? 'h-3.5 w-3.5 object-contain' : 'h-4 w-4 object-contain';
  const summaryIconFallbackClassName = useCompactSummaryRow ? 'h-3.5 w-3.5 rounded bg-white/18' : 'h-4 w-4 rounded bg-white/18';
  const summaryRvClassName = useCompactSummaryRow
    ? 'inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.75 text-[13px] font-semibold text-white/92 transition-all duration-200 select-none'
    : 'inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92 transition-all duration-200 select-none';

  const toggleSubstatSelection = (type: string) => {
    const normalizedType = normalizeSubstatKey(type);
    if (!normalizedType) return;
    setHasManuallyInteracted(true);
    setSelectedSubstats((prev) => {
      const base = hasManuallyInteracted ? prev : autoSelectedSubstats;
      const next = new Set(base);
      if (next.has(normalizedType)) {
        next.delete(normalizedType);
      } else {
        next.add(normalizedType);
      }
      return next;
    });
  };

  // Calculate total roll count for selected substats
  const totalSelectedRolls = useMemo(() => {
    return detailSubstatSummary
      .filter((summary) => activeSelectedSubstats.has(summary.type))
      .reduce((sum, summary) => sum + summary.count, 0);
  }, [activeSelectedSubstats, detailSubstatSummary]);

  // Calculate overall RV for selected substats.
  // Uses detailSubstatSummary (already has total + count per stat), no need to re-iterate panels.
  const overallRV = useMemo(() => {
    if (activeSelectedSubstats.size === 0 || detailSubstatSummary.length === 0) return 0;

    const selectedMap = new Map<string, { total: number; count: number }>();
    for (const entry of detailSubstatSummary) {
      if (activeSelectedSubstats.has(entry.type)) {
        selectedMap.set(entry.type, { total: entry.total, count: entry.count });
      }
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
          <div className="mx-auto w-full max-w-330 space-y-4 px-12 pt-3">
            {isDetailLoading && <BuildExpandedSkeleton />}

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
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Character icon + name + level */}
                  <div className="flex items-center gap-2">
                    {character?.head ? (
                      <img src={character.head} alt={characterName} className="h-9 w-9 object-cover" />
                    ) : (
                      <div className="h-9 w-9 rounded bg-border" />
                    )}
                    <div className="text-base font-medium text-text-primary">
                      {characterName} Lv.{detail.buildState.characterLevel}
                    </div>
                  </div>

                  {/* Center: Forte labels */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {FORTE_LABELS.map((label, forteIndex) => {
                      const entryForte = detail.buildState.forte?.[forteIndex];
                      const level = Number(entryForte?.[0] ?? 1);
                      return (
                        <span
                          key={`${detail.id}-forte-${label}`}
                          className="rounded border border-border bg-background-secondary px-2 py-1 text-[11px] font-semibold text-text-primary/85"
                        >
                          {label} {level}
                        </span>
                      );
                    })}
                  </div>

                  {/* Right: Owner info */}
                  <div className="flex items-center gap-1 text-sm text-text-primary/70">
                    <span>{detail.owner.username || 'Anonymous'}</span>
                    <span>-</span>
                    <span>{detail.owner.uid || '-'}</span>
                    {regionBadge && (
                      <>
                        <span>-</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-semibold tracking-wide ${regionBadge.className}`}>
                          {regionBadge.label}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 min-w-0">
                    {detail.buildState.echoPanels.map((panel, panelIndex) => {
                      const echo = panel.id ? getEcho(panel.id) : null;
                      const echoName = echo
                        ? translateText(echo.nameI18n as Record<string, string> | undefined, echo.name)
                        : 'Empty Slot';
                      const mainStatType = normalizeSubstatKey(panel.stats.mainStat.type);
                      const mainStatValue = panel.stats.mainStat.value;
                      const mainStatIcon = mainStatType
                        ? (statIcons?.[mainStatType] ?? statIcons?.[mainStatType.replace('%', '')] ?? '')
                        : '';
                      const isMainPercent = mainStatType ? isPercentStat(mainStatType) : false;

                      const panelSubstats = panel.stats.subStats.filter((sub) => {
                        const key = normalizeSubstatKey(sub.type);
                        return Boolean(key && sub.value !== null);
                      });

                      const elementType = echo ? (echo.elements.length === 1 ? echo.elements[0] : panel.selectedElement) : null;
                      const fetter = elementType ? fettersByElement[elementType] : null;
                      const fetterIcon = fetter?.icon ?? fetter?.fetterIcon ?? null;

                      const echoCV = calculateEchoSubstatCV(panel);
                      const cvTier = echoCV > 0 ? getEchoCVTierStyle(echoCV) : null;
                      const frameBorderColor = getEchoCVFrameColor(echoCV);

                      if (!echo) {
                        return (
                          <div
                            key={`${detail.id}-panel-empty-${panelIndex}`}
                            className="relative flex min-w-0 items-center justify-center aspect-6/5 rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)]"
                          >
                            <div className="h-7 w-7 rounded-full border-2 border-dashed border-white/20" />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${detail.id}-panel-${panel.id ?? 'empty'}-${panelIndex}`}
                          className="relative min-w-0 aspect-6/5 rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)] transition-all duration-200"
                          style={{ borderColor: `${frameBorderColor}b3` }}
                        >
                          {/* Fetter icon top center */}
                          {fetterIcon && (
                            <div className="absolute top-0 left-1/2 z-3 -translate-x-1/2 -translate-y-1/2">
                              <img
                                src={fetterIcon}
                                alt={elementType ?? ''}
                                className="h-6 w-6 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
                              />
                            </div>
                          )}

                          {/* Echo image rounded so it doesn't clip container */}
                          <img
                            src={getEchoPaths(echo, panel.phantom)}
                            alt={echoName}
                            className="absolute h-full object-cover transition-all duration-200 rounded-xl"
                            style={ECHO_IMAGE_FADE_STYLE}
                          />

                          {/* Two column layout */}
                          <div className="relative z-2 flex h-full">
                            {/* Left column: CV badge (top) + main stat (bottom) */}
                            <div className="flex w-1/2 flex-col items-start justify-between p-2">
                              {/* CV badge */}
                              <div className="flex flex-col items-start gap-1">
                                {cvTier && (
                                  <div
                                    className="flex items-center rounded-md border px-2 py-1"
                                    style={{
                                      borderColor: `${cvTier.color}66`,
                                      color: cvTier.color,
                                      backgroundColor: cvTier.bgColor ?? 'rgba(0,0,0,0.80)',
                                    }}
                                  >
                                    <span className="text-xs font-bold leading-tight">{echoCV.toFixed(1)} CV</span>
                                  </div>
                                )}
                              </div>

                              {/* Main stat */}
                              {mainStatType && mainStatValue != null && (
                                <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/75 px-2 py-1">
                                  {mainStatIcon ? (
                                    <img src={mainStatIcon} alt="" className="h-5 w-5 object-contain" />
                                  ) : (
                                    <span className="h-5 w-5 rounded bg-white/18" />
                                  )}
                                  <span className="text-base font-semibold">
                                    {isMainPercent
                                      ? `${Number(mainStatValue).toFixed(1)}%`
                                      : Math.round(Number(mainStatValue)).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Right column: substats */}
                            <div className="flex w-1/2 flex-col items-stretch justify-center gap-1 py-2.5 pl-8 pr-2">
                              {Array.from({ length: 5 }).map((_, subIndex) => {
                                const sub = panelSubstats[subIndex];
                                if (!sub?.type || sub.value === null) {
                                  return <div key={`${detail.id}-empty-sub-${panelIndex}-${subIndex}`} className="h-8 w-full" />;
                                }

                                const subType = normalizeSubstatKey(sub.type) ?? '';
                                const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')] ?? '';
                                const isSubPercent = isPercentStat(subType);
                                const tierColor = getSubstatTierColor(subType, Number(sub.value), getSubstatValues(subType));
                                const isMatchedSelection = hasSelectedSubstats && activeSelectedSubstats.has(subType);
                                const isDimmed = hasSelectedSubstats && !isMatchedSelection;

                                const tierStyle: React.CSSProperties | undefined = tierColor ? {
                                  color: tierColor,
                                } : undefined;

                                const selectedStyle: React.CSSProperties | undefined = isMatchedSelection ? {
                                  backgroundColor: 'rgba(255, 215, 0, 0.15)',
                                  boxShadow: '0 0 2px rgba(255, 215, 0, 0.30)',
                                } : undefined;

                                const combinedStyle: React.CSSProperties = {
                                  ...(tierStyle ?? {}),
                                  ...(selectedStyle ?? {}),
                                };

                                return (
                                  <div
                                    key={`${detail.id}-sub-${panelIndex}-${subIndex}`}
                                    className={`flex w-full items-center gap-1 rounded-sm bg-black/40 px-1.5 py-1.5 text-base font-semibold leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-opacity duration-200 ${
                                      isDimmed ? 'opacity-35' : 'opacity-100'
                                    }`}
                                    style={combinedStyle}
                                  >
                                    {subIcon ? (
                                      <img src={subIcon} alt="" className={`h-4.5 w-4.5 object-contain ${isMatchedSelection ? 'brightness-125' : ''}`} />
                                    ) : (
                                      <span className="h-4 w-4 rounded bg-white/18" />
                                    )}
                                    <span>
                                      {isSubPercent ? `${Number(sub.value).toFixed(1)}%` : Math.round(Number(sub.value))}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

              </>
            )}
          </div>

          {!isDetailLoading && !detailError && detail && (
            <div className="min-w-0 space-y-4 overflow-hidden px-4 pb-3 pt-4">
              {detailSubstatSummary.length > 0 && (
                <div className={summaryRowClassName}>
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
                        onClick={() => toggleSubstatSelection(summary.type)}
                        className={`${summaryPillClassName} ${
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
                          <img src={summary.icon} alt="" className={summaryIconClassName} />
                        ) : (
                          <span className={summaryIconFallbackClassName} />
                        )}
                        <span className={summaryValueClassName}>{totalText}</span>
                      </button>
                    );
                  })}

                  <div
                    className={`${summaryRvClassName} ${
                      hasSelectedSubstats
                        ? 'border border-amber-300/75 opacity-100'
                        : 'border border-amber-300/45 opacity-70'
                    }`}
                  >
                    <span className="text-amber-300">x{totalSelectedRolls}</span>
                    <span>•</span>
                    <span className="text-amber-300">RV</span>
                    <span className={summaryValueClassName}>{(totalSelectedRolls * overallRV).toFixed(1)}%</span>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={handleViewBuild}
                  className="rounded border border-border bg-background-secondary px-3 py-2 text-xs font-semibold text-text-primary/75 transition-colors hover:border-accent/60 hover:text-text-primary cursor-pointer"
                >
                  View in Editor
                </button>
                {leaderboardLink && !hasLeaderboardBoardContext && (
                  <button
                    type="button"
                    onClick={handleViewLeaderboard}
                    className="rounded border border-border bg-background-secondary px-3 py-2 text-xs font-semibold text-text-primary/75 transition-colors hover:border-accent/60 hover:text-text-primary cursor-pointer"
                  >
                    View Leaderboard
                  </button>
                )}
              </div>

              {detail && activeBoardWeaponId && activeTrackKey && (
                <BuildSimulationSection
                  buildId={detail.id}
                  activeWeaponId={activeBoardWeaponId}
                  activeTrackKey={activeTrackKey}
                  isExpanded={isExpanded}
                  baseDamage={activeBoardDamage}
                  globalRank={globalRank}
                />
              )}

              {/* Leaderboard Rankings section */}
              {standingsLoading && (
                <div className="space-y-2 pt-1">
                  <div className="h-3 w-36 animate-pulse rounded bg-white/8" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`standings-skel-${i}`} className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] gap-3">
                      <div className="h-8 animate-pulse rounded bg-white/8" />
                      <div className="h-8 animate-pulse rounded bg-white/8" />
                      <div className="h-8 animate-pulse rounded bg-white/8" />
                      <div className="h-8 animate-pulse rounded bg-white/8" />
                      <div className="h-8 animate-pulse rounded bg-white/8" />
                    </div>
                  ))}
                </div>
              )}

              {!standingsLoading && standingsError && (
                <p className="text-xs text-text-primary/40">{standingsError}</p>
              )}

              {!standingsLoading && !standingsError && standings && standings.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-text-primary/45">Leaderboard Rankings</p>
                  <div className="overflow-hidden rounded-lg border border-border/50 bg-black/20">
                    {standings.map((entry) => {
                      const weapon = getWeapon(entry.weaponId);
                      const weaponName = weapon?.name ?? entry.weaponId;
                      const weaponIcon = weapon ? getWeaponPaths(weapon) : null;
                      const isR1 = weapon?.rarity === '5-star';
                      const rankPct = entry.total > 0 ? (entry.rank / entry.total) * 100 : 0;
                      const topPctText = rankPct < 0.001 ? '< 0.001%' : `top ${rankPct.toFixed(3)}%`;

                      return (
                        <div
                          key={entry.key}
                          className="grid grid-cols-[1fr_1.5fr_1fr_1fr_1fr] items-center gap-3 border-b border-border/30 px-3 py-2 text-sm last:border-b-0 odd:bg-white/2 even:bg-transparent"
                        >
                          {/* Rank / Total + top% */}
                          <div className="flex flex-col leading-tight">
                            <span className="font-semibold text-text-primary">
                              {entry.rank.toLocaleString()}<span className="text-text-primary/40">/{entry.total.toLocaleString()}</span>
                            </span>
                            <span className="text-[11px] text-text-primary/45">{topPctText}</span>
                          </div>

                          {/* Weapon */}
                          <div className="flex min-w-0 items-center gap-1.5">
                            {weaponIcon ? (
                              <img src={weaponIcon} alt={weaponName} className="h-8 w-8 shrink-0 object-contain" />
                            ) : (
                              <div className="h-8 w-8 shrink-0 rounded bg-white/10" />
                            )}
                            <div className="flex min-w-0 flex-col leading-tight">
                              <span className="truncate text-xs font-medium text-text-primary/85">{weaponName}</span>
                              <span className="text-[11px] text-text-primary/40">{isR1 ? 'R1' : 'R5'}</span>
                            </div>
                          </div>

                          {/* Team */}
                          <div className="flex items-center gap-1">
                            {entry.teamCharacterIds.map((id) => {
                              const teamChar = getCharacter(id);
                              return teamChar?.head ? (
                                <img
                                  key={id}
                                  src={teamChar.head}
                                  alt={teamChar.name}
                                  title={teamChar.name}
                                  className="h-9 w-9 rounded-xl object-cover object-top"
                                />
                              ) : (
                                <div key={id} className="h-9 w-9 rounded-xl bg-border/25" />
                              );
                            })}
                          </div>

                          {/* Track label */}
                          <div className="text-xs text-text-primary/65">{entry.trackLabel}</div>

                          {/* Damage */}
                          <div className="text-right font-semibold tabular-nums text-text-primary">
                            {Math.round(entry.damage).toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
