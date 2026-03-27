'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBBoardOptimality, LBOptimalityReference } from '@/lib/lb';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { EchoPanelState } from '@/lib/echo';
import { isPercentStat } from '@/lib/constants/statMappings';
import { calculateEchoSubstatCV, calculateOverallRV, getEchoCVFrameColor, getEchoCVTierStyle } from '@/lib/calculations/rollValues';
import { getSubstatTierColor } from '@/lib/calculations/substatTiers';
import { getEchoPaths } from '@/lib/paths';
import { ECHO_IMAGE_FADE_STYLE } from '@/components/card/EchoSection';
import { formatFlatStat, formatPercentStat } from './formatters';

function fmtLayout(layout: string): string {
  return layout.split('').join('-');
}

function fmtDmg(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

interface TierRowProps {
  label: string;
  ref_: LBOptimalityReference;
  currentDamage?: number;
  ratio?: number;
  isActive: boolean;
  onClick: () => void;
}

const TIER_STYLES: Record<string, { track: string; fill: string; text: string }> = {
  ceiling: { track: 'bg-amber-400/30', fill: 'bg-white/60', text: 'text-amber-300/90' },
  standardized: { track: 'bg-white/18', fill: 'bg-white/55', text: 'text-text-primary/65' },
  low_roll: { track: 'bg-white/8', fill: 'bg-white/40', text: 'text-text-primary/35' },
};

const TIER_TOOLTIPS: Record<string, string> = {
  ceiling: 'Theoretical best-case build: max substat rolls across all echoes.',
  standardized: 'Best echo set and main stats with median substat rolls — a realistic top-end build.',
  low_roll: 'Same optimal setup but with minimum rolls on the selected five substats for every echo. Still an optimized board, not a random worst-case build.',
};

const TOP_LEVEL_STAT_META: Array<{ key: string; label: string; kind: 'flat' | 'percent' }> = [
  { key: 'atk', label: 'ATK', kind: 'flat' },
  { key: 'hp', label: 'HP', kind: 'flat' },
  { key: 'def', label: 'DEF', kind: 'flat' },
  { key: 'crit_rate', label: 'Crit Rate', kind: 'percent' },
  { key: 'crit_dmg', label: 'Crit DMG', kind: 'percent' },
  { key: 'energy_regen', label: 'Energy Regen', kind: 'percent' },
  { key: 'healing_bonus', label: 'Healing Bonus', kind: 'percent' },
  { key: 'fusion_dmg', label: 'Fusion DMG', kind: 'percent' },
  { key: 'glacio_dmg', label: 'Glacio DMG', kind: 'percent' },
  { key: 'electro_dmg', label: 'Electro DMG', kind: 'percent' },
  { key: 'aero_dmg', label: 'Aero DMG', kind: 'percent' },
  { key: 'havoc_dmg', label: 'Havoc DMG', kind: 'percent' },
  { key: 'spectro_dmg', label: 'Spectro DMG', kind: 'percent' },
  { key: 'basic_attack_dmg', label: 'Basic Attack DMG Bonus', kind: 'percent' },
  { key: 'heavy_attack_dmg', label: 'Heavy Attack DMG Bonus', kind: 'percent' },
  { key: 'resonance_skill_dmg', label: 'Resonance Skill DMG Bonus', kind: 'percent' },
  { key: 'resonance_liberation_dmg', label: 'Resonance Liberation DMG Bonus', kind: 'percent' },
];

const TIER_LABELS: Record<'ceiling' | 'standardized' | 'low_roll', string> = {
  ceiling: 'Ceiling',
  standardized: 'Standard',
  low_roll: 'Low Roll',
};

const EMPTY_REFERENCE: LBOptimalityReference = {
  tier: '',
  damage: 0,
  layout: '',
  setPattern: [],
  mainStats: [],
  substats: [],
  echoIds: [],
  topLevelStats: {},
};

function getTierRollValue(values: number[] | null, tier: string): number | null {
  if (!values || values.length === 0) return null;
  if (tier === 'ceiling') return values[values.length - 1] ?? null;
  if (tier === 'low_roll') return values[0] ?? null;
  return values[Math.max(0, Math.floor((values.length - 1) / 2))] ?? null;
}

const TierRow: React.FC<TierRowProps> = ({ label, ref_, currentDamage, ratio, isActive, onClick }) => {
  const style = TIER_STYLES[ref_.tier] ?? TIER_STYLES.standardized;
  const tooltip = TIER_TOOLTIPS[ref_.tier] ?? '';
  const fillPct = currentDamage && ref_.damage > 0
    ? Math.min(100, (currentDamage / ref_.damage) * 100)
    : 0;

  const ratioColor =
    ratio === undefined ? 'text-text-primary/30'
      : ratio >= 1 ? 'text-emerald-400'
        : ratio >= 0.95 ? 'text-accent'
          : ratio >= 0.90 ? 'text-amber-200/70'
            : 'text-text-primary/50';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-md border px-1.5 py-1 text-left transition-colors ${
        isActive ? 'border-white/18 bg-white/[0.04]' : 'border-transparent hover:border-white/10 hover:bg-white/[0.02]'
      }`}
    >
      <HoverTooltip content={tooltip} placement="top">
        <span className={`w-18 shrink-0 cursor-default text-[10.5px] font-semibold uppercase tracking-wider underline decoration-dotted decoration-current/40 underline-offset-2 ${style.text}`}>
          {label}
        </span>
      </HoverTooltip>
      <HoverTooltip content={tooltip} placement="top" triggerClassName="flex-1">
        <div className={`relative h-1 w-full overflow-hidden rounded-full ${style.track}`}>
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${style.fill}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </HoverTooltip>
      <span className={`w-16 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums ${style.text}`}>
        {fmtDmg(ref_.damage)}
      </span>
      <span className={`w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums ${ratioColor}`}>
        {ratio !== undefined ? `${(ratio * 100).toFixed(1)}%` : '—'}
      </span>
    </button>
  );
};

interface BuildOptimalityPanelProps {
  data: LBBoardOptimality | null;
  loading: boolean;
  error: string | null;
  baseDamage?: number;
}

export const BuildOptimalityPanel: React.FC<BuildOptimalityPanelProps> = ({
  data,
  loading,
  error,
  baseDamage,
}) => {
  const { fetters, fettersByElement, getEcho, getSubstatValues, statIcons, statTranslations } = useGameData();
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'ceiling' | 'standardized' | 'low_roll'>('standardized');

  const getFetterName = useCallback((setId: string): string => {
    const id = parseInt(setId, 10);
    const fetter = fetters.find((f) => f.id === id);
    if (!fetter) return `Set ${setId}`;
    return t(fetter.name);
  }, [fetters, t]);

  const selectedRef = useMemo<LBOptimalityReference>(() => {
    if (!data) return EMPTY_REFERENCE;
    if (selectedTier === 'ceiling') return data.ceiling;
    if (selectedTier === 'low_roll') return data.lowRoll;
    return data.standardized;
  }, [data, selectedTier]);

  const setLabel = useMemo(
    () => selectedRef.setPattern.map(getFetterName).join(' + '),
    [getFetterName, selectedRef.setPattern],
  );

  const pieceLabel = useMemo(() => (
    selectedRef.setPattern.length === 1
      ? '5pc'
      : selectedRef.setPattern.map((_, i) => (i === 0 ? '3pc' : '2pc')).join('+')
  ), [selectedRef.setPattern]);

  const leadEcho = useMemo(
    () => (selectedRef.echoIds[0] ? getEcho(selectedRef.echoIds[0]) : null),
    [getEcho, selectedRef.echoIds],
  );

  const tierLabel = TIER_LABELS[selectedTier];

  const syntheticPanels = useMemo<EchoPanelState[]>(() => (
    selectedRef.echoIds.map((echoId, idx) => {
      const rollValueByStat = new Map<string, number>();
      selectedRef.substats.forEach((stat) => {
        if (!rollValueByStat.has(stat)) {
          rollValueByStat.set(stat, getTierRollValue(getSubstatValues(stat), selectedRef.tier) ?? 0);
        }
      });
      return {
        id: echoId ?? null,
        level: 25,
        selectedElement: null,
        phantom: false,
        stats: {
          mainStat: {
            type: selectedRef.mainStats[idx] ?? null,
            value: null,
          },
          subStats: selectedRef.substats.map((stat) => ({
            type: stat,
            value: rollValueByStat.get(stat) ?? 0,
          })),
        },
      };
    })
  ), [getSubstatValues, selectedRef]);

  const detailSubstatSummary = useMemo(() => {
    const summaryMap = new Map<string, { total: number; count: number; icon: string; isPercent: boolean }>();
    syntheticPanels.forEach((panel) => {
      panel.stats.subStats.forEach((sub) => {
        if (!sub.type || sub.value == null) return;
        const existing = summaryMap.get(sub.type);
        if (existing) {
          existing.total += Number(sub.value);
          existing.count += 1;
          return;
        }
        summaryMap.set(sub.type, {
          total: Number(sub.value),
          count: 1,
          icon: statIcons?.[sub.type] ?? statIcons?.[sub.type.replace('%', '')] ?? '',
          isPercent: isPercentStat(sub.type),
        });
      });
    });

    const naturalOrder: string[] = [];
    if (statTranslations) {
      const seen = new Set<string>();
      for (const key of Object.keys(statTranslations)) {
        if (summaryMap.has(key) && !seen.has(key)) {
          naturalOrder.push(key);
          seen.add(key);
        }
      }
    } else {
      naturalOrder.push(...summaryMap.keys());
    }

    return naturalOrder.map((type) => ({ type, ...summaryMap.get(type)! }));
  }, [statIcons, statTranslations, syntheticPanels]);

  const overallRV = useMemo(() => {
    const selectedSubstats = new Map<string, { total: number; count: number }>();
    detailSubstatSummary.forEach((entry) => {
      selectedSubstats.set(entry.type, { total: entry.total, count: entry.count });
    });
    return calculateOverallRV(selectedSubstats, getSubstatValues);
  }, [detailSubstatSummary, getSubstatValues]);

  const topLevelStats = useMemo(() => (
    TOP_LEVEL_STAT_META
      .map((meta) => ({ ...meta, value: selectedRef.topLevelStats[meta.key] ?? 0 }))
      .filter((entry) => entry.value > 0)
      .slice(0, 6)
  ), [selectedRef.topLevelStats]);

  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border border-border/40 bg-background-secondary/20 p-3">
        <div className="h-3 w-32 animate-pulse rounded bg-white/8" />
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-2.5 w-18 animate-pulse rounded bg-white/8" />
              <div className="h-1 flex-1 animate-pulse rounded-full bg-white/8" />
              <div className="h-2.5 w-16 animate-pulse rounded bg-white/8" />
              <div className="h-2.5 w-12 animate-pulse rounded bg-white/8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-border/40 bg-background-secondary/20 px-3 py-2 text-[11px] text-text-primary/40">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const currentDamage = (baseDamage && baseDamage > 0) ? baseDamage : data.currentDamage;
  const hasCurrent = currentDamage !== undefined && currentDamage > 0;

  const vsCeiling = hasCurrent && data.ceilingDamage > 0
    ? currentDamage / data.ceilingDamage
    : data.currentVsCeiling;
  const vsStd = hasCurrent && data.standardizedDamage > 0
    ? currentDamage / data.standardizedDamage
    : data.currentVsStandardized;
  const vsLowRoll = hasCurrent && data.lowRoll.damage > 0
    ? currentDamage / data.lowRoll.damage
    : undefined;

  return (
    <div className="space-y-2.5 rounded-lg border border-border/40 bg-background-secondary/20 px-3 py-2.5">
      <div className="space-y-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-text-primary/45">
          Reference Benchmark
        </div>
        <div className="text-[11px] leading-relaxed text-text-primary/45">
          Best theoretical board result for this weapon and playstyle. Each bar shows how far this build fills toward that benchmark.
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-text-primary/25">
        <span className="w-18 shrink-0">Tier</span>
        <span className="flex-1" />
        <span className="w-16 shrink-0 text-right">Damage</span>
        {hasCurrent && <span className="w-12 shrink-0 text-right">Yours</span>}
        {!hasCurrent && <span className="w-12 shrink-0" />}
      </div>

      <div className="space-y-2">
        <TierRow
          label="Ceiling"
          ref_={data.ceiling}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsCeiling}
          isActive={selectedTier === 'ceiling'}
          onClick={() => {
            setSelectedTier('ceiling');
            setIsExpanded(true);
          }}
        />
        <TierRow
          label="Standard"
          ref_={data.standardized}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsStd}
          isActive={selectedTier === 'standardized'}
          onClick={() => {
            setSelectedTier('standardized');
            setIsExpanded(true);
          }}
        />
        <TierRow
          label="Low Roll"
          ref_={data.lowRoll}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsLowRoll}
          isActive={selectedTier === 'low_roll'}
          onClick={() => {
            setSelectedTier('low_roll');
            setIsExpanded(true);
          }}
        />
      </div>

      {(setLabel || selectedRef.mainStats.length > 0 || detailSubstatSummary.length > 0 || topLevelStats.length > 0) && (
        <>
          <div className="h-px bg-border/35" />
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-text-primary/28">
                  <span>{tierLabel} Reference</span>
                  {pieceLabel && (
                    <span className="rounded-full border border-border/45 bg-white/[0.03] px-2 py-0.5 text-[9.5px] text-text-primary/42">
                      {pieceLabel}
                    </span>
                  )}
                </div>
                {setLabel && (
                  <div className="truncate text-[12px] font-semibold text-text-primary/72">
                    {setLabel}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-text-primary/42">
                  <span className="uppercase tracking-widest text-text-primary/25">Layout</span>
                  <span>{fmtLayout(selectedRef.layout)}</span>
                  {leadEcho && (
                    <>
                      <span className="text-text-primary/18">•</span>
                      <span className="uppercase tracking-widest text-text-primary/25">Lead Echo</span>
                      <span>{t(leadEcho.nameI18n ?? { en: leadEcho.name })}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 rounded-md border border-border/45 bg-white/[0.03] px-2.5 py-1 text-right">
                <div className="text-[9.5px] uppercase tracking-[0.18em] text-text-primary/28">Reference DMG</div>
                <div className="font-mono text-[13px] font-semibold text-text-primary/78">{fmtDmg(selectedRef.damage)}</div>
              </div>
            </div>

            {selectedRef.mainStats.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-primary/25">Echo Main Stats</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRef.mainStats.map((stat, idx) => (
                    <span
                      key={`${selectedTier}-main-${stat}-${idx}`}
                      className="rounded-full border border-border/45 bg-white/[0.04] px-2 py-0.75 text-[10.5px] font-medium text-text-primary/58"
                    >
                      <span className="mr-1 text-text-primary/25">{selectedRef.layout[idx] ?? idx + 1}c</span>
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailSubstatSummary.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-primary/25">Selected Substats</div>
                <div className="flex flex-wrap gap-1.5">
                  {detailSubstatSummary.map((summary) => (
                    <div
                      key={`${selectedTier}-summary-pill-${summary.type}`}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-black/25 px-2.25 py-0.75 text-[10.5px] font-semibold text-white/88"
                      title={summary.type}
                    >
                      <span className="text-amber-300">x{summary.count}</span>
                      {summary.icon ? (
                        <img src={summary.icon} alt="" className="h-3.5 w-3.5 object-contain" />
                      ) : (
                        <span className="h-3.5 w-3.5 rounded bg-white/18" />
                      )}
                      <span>
                        {summary.isPercent ? formatPercentStat(summary.total) : formatFlatStat(summary.total)}
                      </span>
                    </div>
                  ))}
                  <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/35 bg-black/25 px-2.25 py-0.75 text-[10.5px] font-semibold text-white/88">
                    <span className="text-amber-300">RV</span>
                    <span>{overallRV.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {topLevelStats.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] uppercase tracking-[0.18em] text-text-primary/25">Derived Stats</div>
                <div className="flex flex-wrap gap-1.5">
                  {topLevelStats.map((entry) => (
                    <div
                      key={`${selectedTier}-tls-preview-${entry.key}`}
                      className="rounded-full border border-border/45 bg-white/[0.03] px-2.5 py-0.75 text-[10.5px] text-text-primary/60"
                    >
                      <span className="uppercase tracking-wider text-text-primary/30">{entry.label}</span>
                      <span className="ml-1.5 font-semibold text-text-primary/82">
                        {entry.kind === 'percent' ? formatPercentStat(entry.value) : formatFlatStat(entry.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="h-px bg-border/35" />
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md border border-border/45 bg-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-primary/50 transition-colors hover:border-border/70 hover:text-text-primary/70"
      >
        <span>{isExpanded ? 'Hide Reference Board' : 'Show Reference Board'}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="space-y-3 rounded-lg border border-border/35 bg-black/10 p-3">
          <div className="flex flex-wrap gap-1.5">
            {([
              ['ceiling', 'Ceiling'],
              ['standardized', 'Standard'],
              ['low_roll', 'Low Roll'],
            ] as const).map(([tierKey, label]) => (
              <button
                key={tierKey}
                type="button"
                onClick={() => setSelectedTier(tierKey)}
                className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider transition-colors ${
                  selectedTier === tierKey
                    ? 'border-white/25 bg-white/10 text-text-primary/85'
                    : 'border-border/45 bg-white/[0.03] text-text-primary/45 hover:border-border/70 hover:text-text-primary/70'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-3 min-w-0">
            {syntheticPanels.map((panel, panelIndex) => {
              const echo = panel.id ? getEcho(panel.id) : null;
              const echoName = echo
                ? t(echo.nameI18n ?? { en: echo.name })
                : 'Empty Slot';
              const mainStatType = panel.stats.mainStat.type;
              const mainStatIcon = mainStatType
                ? (statIcons?.[mainStatType] ?? statIcons?.[mainStatType.replace('%', '')] ?? '')
                : '';
              const substats = panel.stats.subStats.filter((sub) => Boolean(sub.type) && sub.value != null);
              const primaryElement = echo?.elements.length === 1 ? echo.elements[0] : null;
              const fetter = primaryElement ? fettersByElement[primaryElement] : null;
              const fetterIcon = fetter?.icon ?? fetter?.fetterIcon ?? null;
              const echoCV = calculateEchoSubstatCV(panel);
              const cvTier = echoCV > 0 ? getEchoCVTierStyle(echoCV) : null;
              const frameBorderColor = getEchoCVFrameColor(echoCV);

              if (!echo) {
                return <div key={`synthetic-empty-${panelIndex}`} className="aspect-6/5 rounded-xl border border-white/10 bg-white/[0.04]" />;
              }

              return (
                <div
                  key={`${selectedTier}-${echo.id}-${panelIndex}`}
                  className="relative min-w-0 aspect-6/5 rounded-xl border border-amber-300/45 bg-[linear-gradient(170deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_28%,rgba(0,0,0,0.44)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.38)]"
                  style={{ borderColor: `${frameBorderColor}b3` }}
                >
                  {fetterIcon && (
                    <div className="absolute top-0 left-1/2 z-3 -translate-x-1/2 -translate-y-1/2">
                      <img src={fetterIcon} alt="" className="h-6 w-6 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]" />
                    </div>
                  )}

                  <img
                    src={getEchoPaths(echo, false)}
                    alt={echoName}
                    className="absolute h-full object-cover rounded-xl"
                    style={ECHO_IMAGE_FADE_STYLE}
                  />

                  <div className="relative z-2 flex h-full">
                    <div className="flex w-1/2 flex-col items-start justify-between p-2">
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

                      {mainStatType && (
                        <div className="flex items-center gap-1 rounded-md border border-white/10 bg-black/75 px-2 py-1">
                          {mainStatIcon ? (
                            <img src={mainStatIcon} alt="" className="h-5 w-5 object-contain" />
                          ) : (
                            <span className="h-5 w-5 rounded bg-white/18" />
                          )}
                          <span className="text-[11px] font-semibold text-white/90">{mainStatType}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex w-1/2 flex-col items-stretch justify-center gap-1 py-2.5 pl-8 pr-2">
                      {Array.from({ length: 5 }).map((_, subIndex) => {
                        const sub = substats[subIndex];
                        if (!sub?.type || sub.value == null) {
                          return <div key={`empty-sub-${panelIndex}-${subIndex}`} className="h-8 w-full" />;
                        }

                        const subType = sub.type;
                        const subIcon = statIcons?.[subType] ?? statIcons?.[subType.replace('%', '')] ?? '';
                        const tierColor = getSubstatTierColor(subType, Number(sub.value), getSubstatValues(subType));

                        return (
                          <div
                            key={`${selectedTier}-${panelIndex}-${subIndex}-${subType}`}
                            className="flex w-full items-center gap-1 rounded-sm bg-black/40 px-1.5 py-1.5 text-base font-semibold leading-none shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                            style={tierColor ? { color: tierColor } : undefined}
                            title={`${subType}: ${isPercentStat(subType) ? formatPercentStat(Number(sub.value)) : formatFlatStat(Number(sub.value))}`}
                          >
                            {subIcon ? (
                              <img src={subIcon} alt="" className="h-4.5 w-4.5 object-contain" />
                            ) : (
                              <span className="h-4 w-4 rounded bg-white/18" />
                            )}
                            <span>
                              {isPercentStat(subType)
                                ? formatPercentStat(Number(sub.value))
                                : formatFlatStat(Number(sub.value))}
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
            <div className="mx-auto flex w-max max-w-none flex-nowrap items-center justify-center gap-2">
              {detailSubstatSummary.map((summary) => (
                <div
                  key={`${selectedTier}-summary-${summary.type}`}
                  className="inline-flex items-center gap-1.25 rounded-full border border-amber-300/45 bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92"
                  title={summary.type}
                >
                  <span className="text-amber-300">x{summary.count}</span>
                  {summary.icon ? (
                    <img src={summary.icon} alt="" className="h-4 w-4 object-contain" />
                  ) : (
                    <span className="h-4 w-4 rounded bg-white/18" />
                  )}
                  <span>
                    {summary.isPercent ? formatPercentStat(summary.total) : formatFlatStat(summary.total)}
                  </span>
                </div>
              ))}
              <div className="inline-flex items-center gap-1 rounded-full border border-amber-300/45 bg-black/45 px-2.5 py-1 text-sm font-semibold text-white/92">
                <span className="text-amber-300">RV</span>
                <span>{overallRV.toFixed(1)}%</span>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
