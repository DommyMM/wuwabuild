'use client';

import React, { useId, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Character, Element } from '@/lib/character';
import { LBBuildDetailEntry, LBBoardOptimality, LBOptimalityReference } from '@/lib/lb';
import { formatFlatStat, formatPercentStat } from './formatters';
import { RegionBadge, PERCENT_STAT_KEYS, SORT_OPTIONS } from './constants';
import { resolveCharacterBaseScaling } from './statColumns';
import { BuildExpandedEchoPanels } from './BuildExpandedEchoPanels';

// Status pair mirrors BuildMoveBreakdown
const POSITIVE_COLOR = '#5cc7c2';
const NEGATIVE_COLOR = '#f87171';

const SCORE_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

function fmtDmg(value: number): string {
  return SCORE_FORMATTER.format(value);
}

const SECTION_HEADING = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-text-primary/55';

type OptimalityTier = 'ceiling' | 'standardized' | 'low_roll';

// Tiers are differentiated by label and order (best → floor), not by hue.
// Selection is the only accent, matching the Min/Mid/Max precedent in
// BuildSubstatUpgrades where the active tier alone carries the gold accent.
const TIER_META: Record<OptimalityTier, { label: string; rollLabel: string }> = {
  ceiling: { label: 'Ceiling', rollLabel: 'Maximum rolls' },
  standardized: { label: 'Median', rollLabel: 'Median rolls' },
  low_roll: { label: 'Minimum', rollLabel: 'Minimum rolls' },
};

interface TierRowProps {
  ref_: LBOptimalityReference;
  currentDamage?: number;
  ratio?: number;
  isActive: boolean;
  onClick: () => void;
}

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

function ratioColor(ratio: number | undefined): string {
  if (ratio === undefined) return 'rgba(224,224,224,0.35)';
  if (ratio >= 1) return POSITIVE_COLOR;
  if (ratio >= 0.95) return 'var(--color-accent)';
  return 'rgba(224,224,224,0.5)';
}

function TierRow({ ref_, currentDamage, ratio, isActive, onClick }: TierRowProps) {
  const tier = (ref_.tier in TIER_META ? ref_.tier : 'standardized') as OptimalityTier;
  const meta = TIER_META[tier];
  const fillPct = currentDamage && ref_.damage > 0
    ? Math.min(100, (currentDamage / ref_.damage) * 100)
    : 0;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`min-w-0 cursor-pointer rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
        isActive
          ? 'border-accent/70 bg-accent/9'
          : 'border-border/45 bg-black/15 hover:border-accent/40 hover:bg-background-secondary/40'
      }`}
    >
      <span className="block min-w-0">
        <span className={`block whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.16em] ${isActive ? 'text-accent-hover' : 'text-text-primary/60'}`}>
          {meta.label}
        </span>
        <span className="mt-0.5 block whitespace-nowrap text-[10px] text-text-primary/40">
          {meta.rollLabel}
        </span>
      </span>
      <span className="mt-2.5 flex items-end justify-between gap-2">
        <span className={`text-base font-semibold tabular-nums ${isActive ? 'text-accent-hover' : 'text-text-primary/75'}`}>
          {fmtDmg(ref_.damage)}
        </span>
        <span className="text-xs font-semibold tabular-nums" style={{ color: ratioColor(ratio) }}>
          {ratio !== undefined ? `${(ratio * 100).toFixed(1)}% of ${meta.label.toLowerCase()}` : 'Reference'}
        </span>
      </span>
      <span className="relative mt-2 block h-1 overflow-hidden rounded-full bg-white/8">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 motion-reduce:transition-none ${isActive ? 'bg-accent/75' : 'bg-white/25'}`}
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
    const stats = selectedRef.topLevelStats;

    // Scaling stat drives which flat stat is worth showing: ATK/DEF are noise on
    // an HP scaler like Cartethyia, so only the character's own scaling flat is
    // kept (the other two flats are never in the order list below, so they drop).
    const scaling = resolveCharacterBaseScaling(character);
    const scalingKey = scaling === 'HP' ? 'hp' : scaling === 'DEF' ? 'def' : 'atk';
    const elementKey = character?.element && character.element !== Element.Rover
      ? `${character.element.toLowerCase()}_dmg`
      : null;

    // Same priority the build-row stat columns use (statColumns.ts), adapted for a
    // full sheet: crits lead (the row folds them into CV), then scaling stat,
    // element, offensive move-type bonuses, ER, healing. Off-element DMG and the
    // non-scaling flats are intentionally absent.
    const order: string[] = [
      'crit_rate', 'crit_dmg',
      scalingKey,
      ...(elementKey ? [elementKey] : []),
      'basic_attack_dmg', 'heavy_attack_dmg', 'resonance_skill_dmg', 'resonance_liberation_dmg',
      'energy_regen', 'healing_bonus',
    ];

    const seen = new Set<string>();
    return order.flatMap((key) => {
      if (seen.has(key)) return [];
      seen.add(key);
      const value = stats[key];
      if (!(value > 0)) return [];
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
      <div className="space-y-2 rounded-lg border border-border/45 bg-background-secondary/20 p-3">
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
  const energyRegen = selectedRef.topLevelStats.energy_regen ?? 0;
  const meetsErTarget = data.erTarget <= 0 || energyRegen >= data.erTarget;
  const layoutLabel = selectedRef.layout;

  return (
    <div className="overflow-hidden rounded-lg border border-border/45 bg-background-secondary/20">
      <div className="border-b border-border/45 px-3 py-3 sm:px-4">
        <h3 className={SECTION_HEADING}>Reference Benchmark</h3>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-text-primary/45">
          Best legal loadout found for each roll quality. Select a tier to inspect its independently optimized stats and Echo blueprint.
        </p>

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
        <section aria-labelledby={`${panelId}-summary`} className="rounded-lg border border-border/45 bg-black/15 p-3">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0">
              <h4 id={`${panelId}-summary`} className={SECTION_HEADING}>
                {TIER_META[selectedTier].label}{layoutLabel ? ` · ${layoutLabel} layout` : ''}
              </h4>
              <div className="mt-1.5 flex items-baseline gap-2.5">
                <span className="text-2xl font-bold tabular-nums text-accent-hover">{fmtDmg(selectedRef.damage)}</span>
                <span className="text-[11px] text-text-primary/45">
                  {selectedRatio !== undefined ? `${(selectedRatio * 100).toFixed(1)}% of ${TIER_META[selectedTier].label.toLowerCase()}` : 'Reference score'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedSetEntries.map(({ id, fetter }) => (
                <div key={id} className="flex items-center gap-2 rounded-md border border-border/45 bg-background-secondary/40 px-2 py-1.5">
                  {fetter?.icon ? (
                    <img src={fetter.icon} alt="" width={20} height={20} className="h-5 w-5 shrink-0 object-contain" loading="lazy" />
                  ) : (
                    <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded bg-white/8" />
                  )}
                  <span className="whitespace-nowrap text-xs font-semibold text-text-primary/75">
                    {fetter ? t(fetter.name) : `Set ${id}`}
                  </span>
                </div>
              ))}
              {selectedSetEntries.length === 0 && (
                <span className="self-center text-xs text-text-primary/40">No active set bonus</span>
              )}
            </div>
          </div>

          {/* The score is always the full scored rotation, so stating that adds
              nothing. What actually varies is the ER target the tier is built to
              and any team-facing score modifiers (Danjin's Moonlit/Heron, healers,
              Cantarella) — show only those, and drop the row entirely when neither
              applies. */}
          {(data.erTarget > 0 || selectedRef.scoreModifiers.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/45 pt-3 text-xs">
              {data.erTarget > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-text-primary/50">Energy target</span>
                  <span className="font-semibold tabular-nums" style={{ color: meetsErTarget ? POSITIVE_COLOR : NEGATIVE_COLOR }}>
                    {formatPercentStat(energyRegen)} / {formatPercentStat(data.erTarget)}
                  </span>
                </div>
              )}
              {selectedRef.scoreModifiers.map((modifier) => (
                <div key={modifier.key || modifier.name} className="flex items-center gap-1.5">
                  <span className="text-text-primary/50">{modifier.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums" style={{ color: modifier.delta >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR }}>
                    {modifier.delta >= 0 ? '+' : '−'}{fmtDmg(Math.abs(modifier.delta))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby={`${panelId}-stats`}>
          <h4 id={`${panelId}-stats`} className={SECTION_HEADING}>Final Build Stats</h4>
          {/* flex-auto lets each badge start at its own content width and then grow
              to share the row: short stats (Crit Rate, ATK) stay compact while a long
              one (Resonance Liberation DMG Bonus) keeps its label on one line via
              whitespace-nowrap, instead of every badge being forced to a single width
              and wrapping the long label. At realistic stat counts the whole sheet
              fits one row (~1264px inner); it wraps only when it genuinely can't. */}
          <dl className="mt-2 flex flex-wrap gap-1.5">
            {topLevelStats.map((entry) => (
              <div
                key={`${selectedTier}-tls-${entry.key}`}
                className="flex flex-auto flex-col rounded-md border border-border/45 bg-black/15 px-2.5 py-2"
              >
                {/* Value + icon lead so the number line is the aligned anchor across a
                    row; the label rides below as a single-line caption. */}
                <dd className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-white/85">
                  {entry.icon && <img src={entry.icon} alt="" width={16} height={16} className="h-4 w-4 shrink-0 object-contain opacity-80" loading="lazy" />}
                  {entry.kind === 'percent' ? formatPercentStat(entry.value) : formatFlatStat(entry.value)}
                </dd>
                <dt className="mt-1 whitespace-nowrap text-[10px] uppercase tracking-widest text-text-primary/45">
                  {entry.label}
                </dt>
              </div>
            ))}
            {topLevelStats.length === 0 && (
              <div className="w-full rounded-md border border-border/45 bg-black/15 px-3 py-2 text-xs text-text-primary/40">
                <dt className="sr-only">Status</dt>
                <dd>Final stats are unavailable for this reference.</dd>
              </div>
            )}
          </dl>
        </section>

        <section aria-labelledby={`${panelId}-echoes`}>
          <h4 id={`${panelId}-echoes`} className={SECTION_HEADING}>Echo Blueprint</h4>
          <div className="mx-auto mt-2 w-full max-w-330 space-y-4 font-ropa tracking-wide sm:px-4 xl:px-8">
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
