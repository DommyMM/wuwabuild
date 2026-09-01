'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateSelectedStatsRV, DEFAULT_PREFERRED_STATS } from '@/lib/calculations/rollValues';
import { BASE_STATS } from '@/lib/constants/statMappings';
import { Echo } from '@/lib/echo';
import { Character } from '@/lib/character';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { loadDraftBuild, saveDraftBuild } from '@/lib/storage';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { HoverCard, HoverCardDescription } from '@/components/ui/HoverCard';
import { LB_EXPANDED_SHELL, LB_SUMMARY_ICON, LB_SUMMARY_ICON_EMPTY, LB_SUMMARY_PILL, LB_SUMMARY_ROW, LB_SUMMARY_RV, LB_SUMMARY_VAL, RegionBadge, ScoringMode } from './constants';
import { formatFlatStat, formatPercentStat, normalizeSubstatKey } from './formatters';
import { BuildSimulationSection } from './BuildSimulationSection';
import { BuildExpandedEchoPanels } from './BuildExpandedEchoPanels';
import { buildSubstatSummary, SubstatSummaryEntry } from './substatSummary';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import posthog from 'posthog-js';

const BASE_STATS_SET = new Set<string>(BASE_STATS);

const SkeletonBlock: React.FC<{ className: string }> = ({ className }) => (
  <div className={`animate-pulse rounded bg-white/8 ${className}`} />
);

const BuildExpandedSkeleton: React.FC<{ showForte?: boolean }> = ({ showForte = true }) => (
  <>
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-9 w-9 shrink-0 rounded-sm" />
        <SkeletonBlock className="h-6 w-36" />
      </div>

      {showForte && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonBlock key={`forte-skeleton-${index}`} className="h-6 w-16 rounded" />
          ))}
        </div>
      )}

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

    <div className={LB_SUMMARY_ROW}>
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
  currentScoring?: ScoringMode;
  surface?: 'builds' | 'leaderboard_character';
  animateInitialExpand?: boolean;
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
  currentScoring = 'adjusted',
  surface = 'builds',
  animateInitialExpand = false,
}) => {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const { getSubstatValues, statTranslations } = useGameData();
  const [selectedSubstats, setSelectedSubstats] = useState<Set<string>>(new Set());
  const [hasManuallyInteracted, setHasManuallyInteracted] = useState(false);
  const [isReplaceDraftOpen, setIsReplaceDraftOpen] = useState(false);

  const openBuildInEditor = () => {
    if (!detail) return;
    posthog.capture('discovery_open_in_editor_click', {
      surface,
      character_id: detail.buildState.characterId ?? null,
      track_key: activeTrackKey ?? null,
      weapon_id: activeBoardWeaponId ?? null,
    });
    saveDraftBuild(detail.buildState);
    router.push('/edit');
  };

  const handleViewBuild = () => {
    if (!detail) return;
    const currentDraft = loadDraftBuild();
    const wouldReplaceDraft = Boolean(
      currentDraft?.characterId
      && JSON.stringify(currentDraft) !== JSON.stringify(detail.buildState),
    );
    if (wouldReplaceDraft) {
      setIsReplaceDraftOpen(true);
      return;
    }
    openBuildInEditor();
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

  const detailSubstatSummary = useMemo<SubstatSummaryEntry[]>(() => (
    detail ? buildSubstatSummary(detail.buildState.echoPanels, statIcons, statTranslations) : []
  ), [detail, statIcons, statTranslations]);

  const activeSelectedSubstats = hasManuallyInteracted ? selectedSubstats : autoSelectedSubstats;
  const hasSelectedSubstats = activeSelectedSubstats.size > 0;
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

    return calculateSelectedStatsRV(selectedMap, getSubstatValues);
  }, [activeSelectedSubstats, detailSubstatSummary, getSubstatValues]);

  return (
    <>
      <AnimatePresence initial={animateInitialExpand}>
        {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          // Entering panel: ease-out so the first frame moves immediately.
          // Under reduced motion the height step is instant and only the
          // opacity crossfade remains.
          transition={prefersReducedMotion
            ? { duration: 0.12, ease: 'linear' }
            : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          // `overflow-clip`, not `hidden`: clip does not create a scroll box,
          // so the sticky pin below tracks the table's horizontal scroller.
          // Hover cards portal out to the body, so nothing needs to escape.
          className="overflow-clip border-t border-border/50 bg-black/15 tracking-wide"
        >
          {/* w-full like any row: a definite width would re-add the shell's 2px
              borders to the w-max wrapper and force 2px of scroll. The
              expansion is a fixed design-space layout (a 5-column echo grid),
              so it is never capped to the visible scrollport at any width —
              that crushes the panels into each other. It keeps the desktop
              layout and is reached by the table's own horizontal scroll, and
              only the controls in BuildSimulationSection follow the scroller. */}
          <div className="w-full">
          <div className={`${LB_EXPANDED_SHELL} min-w-0 space-y-4 py-4`}>
            {isDetailLoading && <BuildExpandedSkeleton showForte={surface !== 'leaderboard_character'} />}

            {!isDetailLoading && detailError && (
              <ErrorBanner onRetry={() => onRetryDetail(entry.id)}>{detailError}</ErrorBanner>
            )}

            {!isDetailLoading && !detailError && detail && (
              <>
                <BuildExpandedEchoPanels
                  detail={detail}
                  character={character}
                  characterName={characterName}
                  regionBadge={regionBadge}
                  statIcons={statIcons}
                  getEcho={getEcho}
                  translateText={translateText}
                  activeSelectedSubstats={activeSelectedSubstats}
                  hasSelectedSubstats={hasSelectedSubstats}
                  showForte={surface !== 'leaderboard_character'}
                />

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
                          onClick={() => toggleSubstatSelection(summary.type)}
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

                    <HoverCard
                      placement="top"
                      width="md"
                      title="Roll Value"
                      subtitle={`${totalSelectedRolls} roll${totalSelectedRolls === 1 ? '' : 's'} selected`}
                      body={(
                        <HoverCardDescription>
                          Roll Value grades how well your substats rolled. Each roll is scored
                          against the highest value that stat can roll, and a perfect roll is 100%.
                          The figure shown sums every selected roll. Use the stat pills to choose
                          which substats count.
                        </HoverCardDescription>
                      )}
                    >
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
                    </HoverCard>
                  </div>
                )}

                <BuildSimulationSection
                  buildId={detail.id}
                  buildDetail={detail}
                  character={character}
                  characterId={detail.buildState.characterId ?? ''}
                  characterName={characterName}
                  regionBadge={regionBadge}
                  activeWeaponId={activeBoardWeaponId ?? ''}
                  activeTrackKey={activeTrackKey ?? ''}
                  isExpanded={isExpanded}
                  baseDamage={activeBoardDamage}
                  globalRank={globalRank}
                  currentScoring={currentScoring}
                  onViewInEditor={handleViewBuild}
                />
              </>
            )}
          </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        isOpen={isReplaceDraftOpen}
        onClose={() => setIsReplaceDraftOpen(false)}
        onConfirm={() => {
          setIsReplaceDraftOpen(false);
          openBuildInEditor();
        }}
        title="Replace editor draft?"
        description="Opening this build will replace the build currently loaded in the editor."
        cancelLabel="Keep Draft"
        confirmLabel="Replace & Open"
        confirmTone="destructive"
      />
    </>
  );
};
