'use client';

import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { calculateEchoSubstatCV, getEchoCVTierStyle } from '@/lib/calculations/cv';
import { getSubstatTierColor } from '@/lib/calculations/substatTiers';
import { isPercentStat } from '@/lib/constants/statMappings';
import { Echo } from '@/lib/echo';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { getEchoPaths } from '@/lib/paths';
import { ECHO_IMAGE_FADE_STYLE } from '@/components/card/EchoSection';
import { RegionBadge } from './buildConstants';
import { formatFlatStat, formatPercentStat } from './buildFormatters';

const FORTE_SHORT_LABELS = ['N', 'S', 'C', 'L', 'I'] as const;

type SubstatSummaryEntry = {
  type: string;
  total: number;
  count: number;
  icon: string;
  isPercent: boolean;
};

interface BuildExpandedProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry | undefined;
  isExpanded: boolean;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  characterName: string;
  regionBadge: RegionBadge | null;
  statIcons: Record<string, string> | null;
  getEcho: (id: string | null) => Echo | null;
  translateText: (i18n: Record<string, string> | undefined, fallback: string) => string;
  onRetryDetail: (buildId: string) => void;
}

function formatSubstatTotal(type: string, value: number): string {
  if (isPercentStat(type)) return formatPercentStat(value);
  return formatFlatStat(value);
}

function substatPriority(type: string): number {
  if (type === 'Crit Rate') return 0;
  if (type === 'Crit DMG') return 1;
  if (type === 'ATK%') return 2;
  if (type === 'ATK') return 3;
  if (type === 'Energy Regen') return 4;
  if (type === 'Resonance Skill DMG Bonus') return 5;
  if (type === 'Resonance Liberation DMG Bonus') return 6;
  return 99;
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
  characterName,
  regionBadge,
  statIcons,
  getEcho,
  translateText,
  onRetryDetail,
}) => {
  const { fettersByElement, getSubstatValues } = useGameData();
  const [selectedSubstats, setSelectedSubstats] = useState<Set<string>>(new Set());

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
    return [...summaryMap.values()].sort((a, b) => {
      const priority = substatPriority(a.type) - substatPriority(b.type);
      if (priority !== 0) return priority;
      return b.total - a.total;
    });
  }, [detail, statIcons]);

  const hasSelectedSubstats = selectedSubstats.size > 0;

  const toggleSubstatSelection = (type: string) => {
    const normalizedType = normalizeSubstatKey(type);
    if (!normalizedType) return;
    setSelectedSubstats((prev) => {
      const next = new Set(prev);
      if (next.has(normalizedType)) {
        next.delete(normalizedType);
      } else {
        next.add(normalizedType);
      }
      return next;
    });
  };

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="overflow-hidden border-t border-border/50 bg-black/15 tracking-wide"
        >
          <div className="space-y-4 py-3 px-12">
            {isDetailLoading && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm text-text-primary/80">
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
                <div className="flex items-center gap-3">
                  <div className="text-sm text-text-primary/70">
                    {characterName} Lv.{detail.buildState.characterLevel}
                  </div>
                  <div className="text-xs text-text-primary/60">
                    {detail.owner.username || 'Anonymous'} - UID {detail.owner.uid || '-'} {regionBadge ? `- ${regionBadge.label}` : ''}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {FORTE_SHORT_LABELS.map((label, forteIndex) => {
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
                </div>

                <div className="flex gap-4 px-4">
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

                      if (!echo) {
                        return (
                          <div
                            key={`${detail.id}-panel-empty-${panelIndex}`}
                            className="relative flex flex-1 items-center justify-center aspect-6/5 rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)]"
                          >
                            <div className="h-7 w-7 rounded-full border-2 border-dashed border-white/20" />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={`${detail.id}-panel-${panel.id ?? 'empty'}-${panelIndex}`}
                          className="relative flex-1 aspect-6/5 rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)] transition-all duration-200"
                        >
                          {/* Fetter icon top center */}
                          {fetterIcon && (
                            <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2">
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
                          <div className="relative z-10 flex h-full">
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
                            <div className="flex w-1/2 flex-col items-start justify-between py-3 pl-8">
                              {Array.from({ length: 5 }).map((_, subIndex) => {
                                const sub = panelSubstats[subIndex];
                                if (!sub?.type || sub.value === null) {
                                  return <div key={`${detail.id}-empty-sub-${panelIndex}-${subIndex}`} className="h-5" />;
                                }

                                const subType = normalizeSubstatKey(sub.type) ?? '';
                                const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')] ?? '';
                                const isSubPercent = isPercentStat(subType);
                                const tierColor = getSubstatTierColor(subType, Number(sub.value), getSubstatValues(subType));
                                const isMatchedSelection = hasSelectedSubstats && selectedSubstats.has(subType);
                                const isDimmed = hasSelectedSubstats && !isMatchedSelection;

                                const tierStyle: React.CSSProperties | undefined = tierColor ? {
                                  backgroundColor: `${tierColor}18`,
                                  borderBottom: `1px solid ${tierColor}80`,
                                } : undefined;

                                return (
                                  <div
                                    key={`${detail.id}-sub-${panelIndex}-${subIndex}`}
                                    className={`flex items-center gap-1 rounded-sm px-1.5 py-1 transition-all duration-200 ${
                                      isMatchedSelection
                                        ? 'ring-1 ring-amber-300/70 bg-amber-300/20 text-white'
                                        : (isDimmed ? 'opacity-35' : 'text-white/90')
                                    }`}
                                    style={!isMatchedSelection ? tierStyle : undefined}
                                  >
                                    {subIcon ? (
                                      <img src={subIcon} alt="" className="h-4.5 w-4.5 object-contain" />
                                    ) : (
                                      <span className="h-4 w-4 rounded bg-white/18" />
                                    )}
                                    <span className="text-base font-semibold leading-none">
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

                {detailSubstatSummary.length > 0 && (
                  <div className="flex justify-center gap-2">
                    {detailSubstatSummary.map((summary) => {
                      const isSelected = selectedSubstats.has(summary.type);
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
                          className={`inline-flex items-center gap-1.25 rounded-full border px-2.5 py-1 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-amber-300/75 bg-amber-300/22 text-amber-100 shadow-[0_0_12px_rgba(250,204,21,0.24)]'
                              : (isDimmed
                                ? 'border-white/15 bg-black/45 text-white/70 opacity-40'
                                : 'border-amber-300/45 bg-black/45 text-white/92 hover:border-amber-200/65')
                          }`}
                          title={summary.type}
                        >
                          <span className="text-amber-300">x{summary.count}</span>
                          {summary.icon ? (
                            <img src={summary.icon} alt="" className="h-4 w-4 object-contain" />
                          ) : (
                            <span className="h-4 w-4 rounded bg-white/18" />
                          )}
                          <span className="text-base">{totalText}</span>
                        </button>
                      );
                    })}

                    {/* RV block */}
                    <div
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-semibold transition-all duration-200 select-none ${
                        hasSelectedSubstats
                          ? 'border-amber-300/75 bg-amber-300/22 text-amber-100'
                          : 'border-amber-300/45 bg-black/45 text-white/92'
                      }`}
                    >
                      <span className="text-amber-300">x{selectedSubstats.size}</span>
                      <span>• </span>
                      <span className="text-amber-300"> RV</span>
                      <span className="text-base">{selectedSubstats.size}%</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
