'use client';

import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Character, Element } from '@/lib/character';
import { EchoPanelState, FETTER_MAP } from '@/lib/echo';
import { LBBuildDetailEntry, LBBoardOptimality, LBOptimalityReference } from '@/lib/lb';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { formatFlatStat, formatPercentStat } from './formatters';
import { RegionBadge } from './constants';
import { BuildExpandedEchoPanels } from './BuildExpandedEchoPanels';

function fmtDmg(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function getLayoutCost(layout: string, idx: number): number | null {
  const raw = layout[idx];
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTierRollValue(values: number[] | null, tier: string): number | null {
  if (!values || values.length === 0) return null;
  if (tier === 'ceiling') return values[values.length - 1] ?? null;
  if (tier === 'low_roll') return values[0] ?? null;
  return values[Math.max(0, Math.floor((values.length - 1) / 2))] ?? null;
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
  ceiling: { track: 'bg-amber-400/30', fill: 'bg-amber-200/90', text: 'text-amber-300/90' },
  standardized: { track: 'bg-cyan-400/20', fill: 'bg-cyan-200/80', text: 'text-cyan-100/75' },
  low_roll: { track: 'bg-zinc-400/20', fill: 'bg-zinc-200/75', text: 'text-zinc-200/55' },
};

const TIER_TOOLTIPS: Record<string, string> = {
  ceiling: 'Best build possible with max substat rolls',
  standardized: 'Best build possible with median substat rolls',
  low_roll: 'Best build possible with minimum substat rolls',
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

const ELEMENTAL_STAT_KEYS = new Set([
  'fusion_dmg',
  'glacio_dmg',
  'electro_dmg',
  'aero_dmg',
  'havoc_dmg',
  'spectro_dmg',
]);

const ELEMENT_TO_STAT_KEY: Partial<Record<Element, string>> = {
  [Element.Fusion]: 'fusion_dmg',
  [Element.Glacio]: 'glacio_dmg',
  [Element.Electro]: 'electro_dmg',
  [Element.Aero]: 'aero_dmg',
  [Element.Havoc]: 'havoc_dmg',
  [Element.Spectro]: 'spectro_dmg',
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
    <HoverTooltip content={tooltip} placement="top" triggerClassName="w-full">
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full cursor-pointer items-center gap-2 rounded-md border px-1.5 py-1 text-left transition-colors ${
          isActive ? 'border-white/18 bg-white/4' : 'border-transparent hover:border-white/10 hover:bg-white/2'
        }`}
      >
        <span className={`w-18 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider underline decoration-dotted decoration-current/40 underline-offset-2 ${style.text}`}>
          {label}
        </span>
        <div className={`relative h-1 w-full overflow-hidden rounded-full ${style.track}`}>
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${style.fill}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className={`w-16 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums ${style.text}`}>
          {fmtDmg(ref_.damage)}
        </span>
        <span className={`w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums ${ratioColor}`}>
          {ratio !== undefined ? `${(ratio * 100).toFixed(1)}%` : '—'}
        </span>
      </button>
    </HoverTooltip>
  );
};

interface BuildOptimalityPanelProps {
  data: LBBoardOptimality | null;
  loading: boolean;
  error: string | null;
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
  baseDamage,
  buildDetail,
  character,
  characterName,
  regionBadge,
}) => {
  const { t } = useLanguage();
  const { fetters, getEcho, getMainStatsByCost, getSubstatValues, statIcons } = useGameData();
  const [selectedTier, setSelectedTier] = useState<'ceiling' | 'standardized' | 'low_roll'>('standardized');

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
      element: FETTER_MAP[setId],
      fetter: fetters.find((entry) => entry.id === setId) ?? null,
    }))
  ), [fetters, selectedSetIds]);

  const syntheticPanels = useMemo<EchoPanelState[]>(() => (
    selectedRef.echoIds.map((echoId, idx) => {
      const rollValueByStat = new Map<string, number>();
      selectedRef.substats.forEach((stat) => {
        if (!rollValueByStat.has(stat)) {
          rollValueByStat.set(stat, getTierRollValue(getSubstatValues(stat), selectedRef.tier) ?? 0);
        }
      });

      const cost = getLayoutCost(selectedRef.layout, idx);
      const mainStatType = selectedRef.mainStats[idx] ?? null;
      const mainStatTable = getMainStatsByCost(cost);
      const mainStatRange = mainStatType ? mainStatTable[mainStatType] : null;
      const mainStatValue = mainStatRange?.[1] ?? null;
      const echo = echoId ? getEcho(echoId) : null;
      const matchedSet = selectedSetEntries.length === 1
        ? selectedSetEntries[0]
        : echo
          ? selectedSetEntries.find((entry) => entry.element && echo.elements.includes(entry.element))
          : null;

      return {
        id: echoId ?? null,
        level: 25,
        selectedElement: matchedSet?.element ?? null,
        phantom: false,
        stats: {
          mainStat: {
            type: mainStatType,
            value: mainStatValue,
          },
          subStats: selectedRef.substats.map((stat) => ({
            type: stat,
            value: rollValueByStat.get(stat) ?? 0,
          })),
        },
      };
    })
  ), [getEcho, getMainStatsByCost, getSubstatValues, selectedRef, selectedSetEntries]);

  const topLevelStats = useMemo(() => {
    const allowedElementStatKey = character?.element && character.element !== Element.Rover
      ? ELEMENT_TO_STAT_KEY[character.element]
      : null;

    return TOP_LEVEL_STAT_META
      .map((meta) => ({ ...meta, value: selectedRef.topLevelStats[meta.key] ?? 0 }))
      .filter((entry) => entry.value > 0)
      .filter((entry) => {
        if (!ELEMENTAL_STAT_KEYS.has(entry.key)) return true;
        if (!allowedElementStatKey) return true;
        return entry.key === allowedElementStatKey;
      });
  }, [character, selectedRef.topLevelStats]);

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
      echoPanels: syntheticPanels,
    },
  }), [buildDetail, data, selectedTier, syntheticPanels]);

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

      <div className="space-y-1">
        <TierRow
          label="Ceiling"
          ref_={data.ceiling}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsCeiling}
          isActive={selectedTier === 'ceiling'}
          onClick={() => setSelectedTier('ceiling')}
        />
        <TierRow
          label="Standard"
          ref_={data.standardized}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsStd}
          isActive={selectedTier === 'standardized'}
          onClick={() => setSelectedTier('standardized')}
        />
        <TierRow
          label="Low Roll"
          ref_={data.lowRoll}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsLowRoll}
          isActive={selectedTier === 'low_roll'}
          onClick={() => setSelectedTier('low_roll')}
        />
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          <div className="rounded-full border border-amber-300/35 bg-amber-300/8 px-2.5 py-0.75 text-[10.5px] text-amber-100/75">
            <span className="uppercase tracking-wider text-amber-200/55">Reference DMG</span>
            <span className="ml-1.5 font-mono font-semibold text-amber-100">{fmtDmg(selectedRef.damage)}</span>
          </div>

          {topLevelStats.map((entry) => (
            <div
              key={`${selectedTier}-tls-${entry.key}`}
              className="rounded-full border border-border/45 bg-white/3 px-2.5 py-0.75 text-[10.5px] text-text-primary/60"
            >
              <span className="uppercase tracking-wider text-text-primary/30">{entry.label}</span>
              <span className="ml-1.5 font-semibold text-text-primary/82">
                {entry.kind === 'percent' ? formatPercentStat(entry.value) : formatFlatStat(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="font-ropa tracking-wide">
        <div className="mx-auto w-full max-w-330 space-y-4 px-12 pt-1">
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
      </div>
    </div>
  );
};
