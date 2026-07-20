'use client';

import React, { useId, useMemo, useState } from 'react';
import { Check, Gauge, Layers3, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Character, Element } from '@/lib/character';
import { LBBuildDetailEntry, LBBoardOptimality, LBOptimalityReference } from '@/lib/lb';
import { formatFlatStat, formatPercentStat } from './formatters';
import { RegionBadge, ELEMENT_STAT_KEYS, PERCENT_STAT_KEYS, SORT_OPTIONS } from './constants';
import { BuildExpandedEchoPanels } from './BuildExpandedEchoPanels';

const SCORE_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

function fmtDmg(value: number): string {
  return SCORE_FORMATTER.format(value);
}


interface TierRowProps {
  ref_: LBOptimalityReference;
  currentDamage?: number;
  ratio?: number;
  isActive: boolean;
  onClick: () => void;
}

type OptimalityTier = 'ceiling' | 'standardized' | 'low_roll';

const TIER_STYLES: Record<OptimalityTier, {
  label: string;
  rollLabel: string;
  accent: string;
  border: string;
  surface: string;
  track: string;
  fill: string;
}> = {
  ceiling: {
    label: 'Ceiling',
    rollLabel: 'Maximum rolls',
    accent: 'text-amber-200',
    border: 'border-amber-300/45',
    surface: 'bg-amber-300/7',
    track: 'bg-amber-400/20',
    fill: 'bg-amber-200/90',
  },
  standardized: {
    label: 'Median',
    rollLabel: 'Median rolls',
    accent: 'text-cyan-100',
    border: 'border-cyan-300/45',
    surface: 'bg-cyan-300/7',
    track: 'bg-cyan-400/16',
    fill: 'bg-cyan-200/85',
  },
  low_roll: {
    label: 'Minimum',
    rollLabel: 'Minimum rolls',
    accent: 'text-zinc-200',
    border: 'border-zinc-300/35',
    surface: 'bg-white/4',
    track: 'bg-zinc-400/16',
    fill: 'bg-zinc-200/75',
  },
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
  echoPanels: [],
  scoreModifiers: [],
};

function TierRow({ ref_, currentDamage, ratio, isActive, onClick }: TierRowProps) {
  const tier = (ref_.tier in TIER_STYLES ? ref_.tier : 'standardized') as OptimalityTier;
  const style = TIER_STYLES[tier];
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
      aria-pressed={isActive}
      onClick={onClick}
      className={`group min-w-0 cursor-pointer rounded-lg border p-2.5 text-left touch-manipulation transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-white/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        isActive ? `${style.border} ${style.surface}` : 'border-white/9 bg-black/14'
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className={`block whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] ${style.accent}`}>
            {style.label}
          </span>
          <span className="mt-0.5 block whitespace-nowrap text-[10px] text-text-primary/45">
            {style.rollLabel}
          </span>
        </span>
        {isActive && <Check aria-hidden="true" className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.accent}`} />}
      </span>
      <span className="mt-2.5 flex items-end justify-between gap-2">
        <span className={`text-base font-semibold tabular-nums ${style.accent}`}>
          {fmtDmg(ref_.damage)}
        </span>
        <span className={`text-xs font-semibold tabular-nums ${ratioColor}`}>
          {ratio !== undefined ? `${(ratio * 100).toFixed(1)}% yours` : 'Reference'}
        </span>
      </span>
      <span className={`relative mt-2 block h-1 overflow-hidden rounded-full ${style.track}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 motion-reduce:transition-none ${style.fill}`}
          style={{ width: `${fillPct}%` }}
        />
      </span>
    </button>
  );
}

interface BuildOptimalityPanelProps {
  data: LBBoardOptimality | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  baseDamage?: number;
  buildDetail: LBBuildDetailEntry;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
}

export const BuildOptimalityPanel: React.FC<BuildOptimalityPanelProps> = ({
  data,
  loading,
  error,
  onRetry,
  baseDamage,
  buildDetail,
  character,
  characterName,
  regionBadge,
}) => {
  const { t } = useLanguage();
  const { fetters, getEcho, statIcons } = useGameData();
  const panelId = useId();
  const [selectedTier, setSelectedTier] = useState<OptimalityTier>('standardized');

  const selectedRef = useMemo<LBOptimalityReference>(() => {
    if (!data) return EMPTY_REFERENCE;
    if (selectedTier === 'ceiling') return data.ceiling;
    if (selectedTier === 'low_roll') return data.lowRoll;
    return data.standardized;
  }, [data, selectedTier]);

  const selectedSetIds = useMemo(
    () => selectedRef.setPattern.map((value) => Number.parseInt(value, 10)).filter((value) => Number.isFinite(value)),
    [selectedRef.setPattern],
  );
  const selectedSetEntries = useMemo(() => (
    selectedSetIds.map((setId) => ({
      id: setId,
      fetter: fetters.find((entry) => entry.id === setId) ?? null,
    }))
  ), [fetters, selectedSetIds]);

  const topLevelStats = useMemo(() => {
    const allowedElementKey = character?.element && character.element !== Element.Rover
      ? `${character.element.toLowerCase()}_dmg`
      : null;

    return Object.entries(selectedRef.topLevelStats)
      .filter(([, v]) => v > 0)
      .filter(([key]) => {
        if (!(ELEMENT_STAT_KEYS as readonly string[]).includes(key)) return true;
        if (!allowedElementKey) return true;
        return key === allowedElementKey;
      })
      .flatMap(([key, value]) => {
        const option = SORT_OPTIONS.find((o) => o.key === key);
        if (!option) return [];
        const icon = statIcons?.[option.label] ?? statIcons?.[option.label.replace('%', '')] ?? '';
        return [{ key, label: option.label, value, icon, kind: (PERCENT_STAT_KEYS as ReadonlySet<string>).has(key) ? 'percent' as const : 'flat' as const }];
      });
  }, [character, selectedRef.topLevelStats, statIcons]);

  const highlightedSubstats = useMemo(
    () => new Set(selectedRef.substats.filter((value): value is string => Boolean(value))),
    [selectedRef.substats],
  );
  const syntheticDetail = useMemo<LBBuildDetailEntry>(() => ({
    ...buildDetail,
    id: `${buildDetail.id}-optimality-${selectedTier}`,
    buildState: {
      ...buildDetail.buildState,
      characterId: data?.characterId ?? buildDetail.buildState.characterId,
      weaponId: data?.weaponId ?? buildDetail.buildState.weaponId,
      characterLevel: data?.characterLevel ?? buildDetail.buildState.characterLevel,
      weaponLevel: data?.weaponLevel ?? buildDetail.buildState.weaponLevel,
      forte: data?.forte ?? buildDetail.buildState.forte,
      echoPanels: selectedRef.echoPanels,
    },
  }), [buildDetail, data, selectedTier, selectedRef.echoPanels]);

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
      <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        <span>{error}</span>
        <button type="button" onClick={onRetry} className="rounded border border-red-300/50 px-2 py-1 text-xs font-semibold text-red-100 transition-colors hover:bg-red-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/60">
          Retry
        </button>
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

  const selectedRatio = selectedTier === 'ceiling'
    ? vsCeiling
    : selectedTier === 'low_roll'
      ? vsLowRoll
      : vsStd;
  const selectedStyle = TIER_STYLES[selectedTier];
  const energyRegen = selectedRef.topLevelStats.energy_regen ?? 0;
  const meetsErTarget = data.erTarget <= 0 || energyRegen >= data.erTarget;
  const layoutLabel = selectedRef.layout;

  return (
    <div className="overflow-hidden rounded-xl border border-border/45 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.055),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.08))]">
      <div className="border-b border-white/7 px-3 py-3 sm:px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Gauge aria-hidden="true" className="h-4 w-4 text-cyan-200/75" />
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/65">
              Reference Benchmark
            </h3>
          </div>
          <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-text-primary/45">
            Best legal loadout found for each roll quality. Select a tier to inspect its independently optimized stats and Echo blueprint.
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <TierRow
            ref_={data.ceiling}
            currentDamage={hasCurrent ? currentDamage : undefined}
            ratio={vsCeiling}
            isActive={selectedTier === 'ceiling'}
            onClick={() => setSelectedTier('ceiling')}
          />
          <TierRow
            ref_={data.standardized}
            currentDamage={hasCurrent ? currentDamage : undefined}
            ratio={vsStd}
            isActive={selectedTier === 'standardized'}
            onClick={() => setSelectedTier('standardized')}
          />
          <TierRow
            ref_={data.lowRoll}
            currentDamage={hasCurrent ? currentDamage : undefined}
            ratio={vsLowRoll}
            isActive={selectedTier === 'low_roll'}
            onClick={() => setSelectedTier('low_roll')}
          />
        </div>
      </div>

      <div className="space-y-4 px-3 py-3 sm:px-4">
        <section aria-labelledby={`${panelId}-loadout`} className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)]">
          <div className="min-w-0 rounded-lg border border-white/8 bg-black/18 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Layers3 aria-hidden="true" className="h-4 w-4 text-text-primary/55" />
                  <h4 id={`${panelId}-loadout`} className="text-xs font-semibold uppercase tracking-[0.14em] text-text-primary/65">
                    {selectedStyle.label} Loadout
                  </h4>
                </div>
                <p className="mt-1 text-xs text-text-primary/45">
                  {layoutLabel || 'Echo'} layout · {selectedRef.mainStats.join(' / ') || 'No main stats available'}
                </p>
              </div>
              <div className="text-right">
                <div className={`text-xl font-semibold tabular-nums ${selectedStyle.accent}`}>
                  {fmtDmg(selectedRef.damage)}
                </div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-primary/40">
                  {selectedRatio !== undefined ? `${(selectedRatio * 100).toFixed(1)}% of reference` : 'Reference score'}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSetEntries.map(({ id, fetter }) => (
                <div key={id} className="flex min-w-0 items-center gap-2 rounded-md border border-white/9 bg-white/3 px-2 py-1.5">
                  {fetter?.icon ? (
                    <img src={fetter.icon} alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                  ) : (
                    <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded bg-white/8" />
                  )}
                  <span className="truncate text-xs font-semibold text-text-primary/75">
                    {fetter ? t(fetter.name) : `Set ${id}`}
                  </span>
                </div>
              ))}
              {selectedSetEntries.length === 0 && (
                <span className="text-xs text-text-primary/40">No active set bonus</span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/8 bg-black/18 p-3">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-amber-200/70" />
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-primary/65">
                Score Model
              </h4>
            </div>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-3 text-text-primary/60">
                <span>Rotation score</span>
                <span className="font-semibold text-text-primary/75">Included</span>
              </div>
              {data.erTarget > 0 && (
                <div className="flex items-center justify-between gap-3 text-text-primary/60">
                  <span>Energy target</span>
                  <span className={`font-semibold tabular-nums ${meetsErTarget ? 'text-emerald-300' : 'text-red-300'}`}>
                    {formatPercentStat(energyRegen)} / {formatPercentStat(data.erTarget)}
                  </span>
                </div>
              )}
              {selectedRef.scoreModifiers.map((modifier) => (
                <div key={modifier.key || modifier.name} className="flex items-start justify-between gap-3 border-t border-white/7 pt-1.5 text-text-primary/60">
                  <span className="min-w-0 wrap-break-word">{modifier.name}</span>
                  <span className={`shrink-0 font-semibold tabular-nums ${modifier.delta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {modifier.delta >= 0 ? '+' : '−'}{fmtDmg(Math.abs(modifier.delta))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby={`${panelId}-stats`}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-text-primary/55" />
            <h4 id={`${panelId}-stats`} className="text-xs font-semibold uppercase tracking-[0.14em] text-text-primary/65">
              Final Build Stats
            </h4>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-8">
            {topLevelStats.map((entry) => (
              <div
                key={`${selectedTier}-tls-${entry.key}`}
                className="min-w-0 rounded-md border border-white/8 bg-black/18 px-2.5 py-2"
              >
                <dt className="flex min-w-0 items-center gap-1.5 text-[9.5px] uppercase tracking-[0.12em] text-text-primary/45">
                  {entry.icon && <img src={entry.icon} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain opacity-70" loading="lazy" />}
                  <span className="truncate">{entry.label}</span>
                </dt>
                <dd className="mt-1 text-sm font-semibold tabular-nums text-white/82">
                  {entry.kind === 'percent' ? formatPercentStat(entry.value) : formatFlatStat(entry.value)}
                </dd>
              </div>
            ))}
            {topLevelStats.length === 0 && (
              <div className="col-span-full rounded-md border border-white/8 bg-black/18 px-3 py-2 text-xs text-text-primary/40">
                <dt className="sr-only">Status</dt>
                <dd>Final stats are unavailable for this reference.</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby={`${panelId}-echoes`} className="font-ropa tracking-wide">
          <h4 id={`${panelId}-echoes`} className="sr-only">Echo Blueprint</h4>
          <div className="mx-auto w-full max-w-330 space-y-4 pt-1 sm:px-4 xl:px-8">
            <BuildExpandedEchoPanels
              detail={syntheticDetail}
              character={character}
              characterName={characterName}
              regionBadge={regionBadge}
              statIcons={statIcons}
              getEcho={getEcho}
              translateText={(i18n, fallback) => t(i18n ?? { en: fallback })}
              activeSelectedSubstats={highlightedSubstats}
              hasSelectedSubstats={highlightedSubstats.size > 0}
              showHeader={false}
            />
          </div>
        </section>
      </div>
    </div>
  );
};
