'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getBoardOptimality, LBBoardOptimality, LBOptimalityReference } from '@/lib/lb';

const STAT_LABELS: Record<string, string> = {
  crit_rate: 'CR',
  crit_dmg: 'CD',
  atk_pct: 'ATK%',
  hp_pct: 'HP%',
  def_pct: 'DEF%',
  atk: 'ATK',
  hp: 'HP',
  def: 'DEF',
  energy_regen: 'ER',
  healing_bonus: 'Heal',
  aero_dmg: 'Aero',
  glacio_dmg: 'Glacio',
  fusion_dmg: 'Fusion',
  electro_dmg: 'Electro',
  havoc_dmg: 'Havoc',
  spectro_dmg: 'Spectro',
  basic_attack_dmg: 'BA',
  heavy_attack_dmg: 'HA',
  resonance_skill_dmg: 'RS',
  resonance_liberation_dmg: 'RL',
};

function fmtStat(key: string): string {
  return STAT_LABELS[key] ?? key;
}

function fmtLayout(layout: string): string {
  return layout.split('').join('-');
}

function fmtDmg(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

function extractSequence(trackKey: string): string {
  const m = /s(\d+)/.exec(trackKey);
  return m ? `s${m[1]}` : trackKey;
}

interface TierRowProps {
  label: string;
  ref_: LBOptimalityReference;
  ceilingDamage: number;
  currentDamage?: number;
  ratio?: number;
}

const TIER_STYLES: Record<string, { bar: string; text: string }> = {
  ceiling:      { bar: 'bg-amber-400/75', text: 'text-amber-300/90' },
  standardized: { bar: 'bg-text-primary/40', text: 'text-text-primary/65' },
  low_roll:     { bar: 'bg-white/15', text: 'text-text-primary/35' },
};

const TierRow: React.FC<TierRowProps> = ({ label, ref_, ceilingDamage, currentDamage, ratio }) => {
  const style = TIER_STYLES[ref_.tier] ?? TIER_STYLES.standardized;
  const barPct = ceilingDamage > 0 ? Math.min(100, (ref_.damage / ceilingDamage) * 100) : 0;
  const curPct = currentDamage && ceilingDamage > 0
    ? Math.min(100, (currentDamage / ceilingDamage) * 100)
    : null;

  const ratioColor =
    ratio === undefined ? ''
    : ratio >= 1     ? 'text-emerald-400'
    : ratio >= 0.95  ? 'text-accent'
    : ratio >= 0.90  ? 'text-amber-200/70'
    :                  'text-text-primary/50';

  return (
    <div className="flex items-center gap-3">
      <span className={`w-18 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider ${style.text}`}>
        {label}
      </span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/6">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${style.bar}`}
          style={{ width: `${barPct}%` }}
        />
        {curPct !== null && (
          <div
            className="absolute -inset-y-px w-[1.5px] rounded-full bg-accent/90 shadow-[0_0_4px_rgba(166,150,98,0.6)] transition-[left] duration-500"
            style={{ left: `${curPct}%` }}
          />
        )}
      </div>
      <span className={`w-16 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums ${style.text}`}>
        {fmtDmg(ref_.damage)}
      </span>
      <span className={`w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums ${ratioColor}`}>
        {ratio !== undefined ? `${(ratio * 100).toFixed(1)}%` : ''}
      </span>
    </div>
  );
};

interface BuildOptimalityPanelProps {
  characterId: string;
  weaponId: string;
  trackKey: string;
  buildId?: string;
  baseDamage?: number;
}

export const BuildOptimalityPanel: React.FC<BuildOptimalityPanelProps> = ({
  characterId,
  weaponId,
  trackKey,
  buildId,
  baseDamage,
}) => {
  const { fetters } = useGameData();
  const { t } = useLanguage();
  const controllerRef = useRef<AbortController | null>(null);

  const [data, setData] = useState<LBBoardOptimality | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const sequence = extractSequence(trackKey);

  const load = useCallback((controller: AbortController) => {
    setLoading(true);
    setError(null);
    void getBoardOptimality(characterId, weaponId, sequence, buildId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load board reference.');
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (controllerRef.current === controller) controllerRef.current = null;
      });
  }, [characterId, weaponId, sequence, buildId]);

  useEffect(() => {
    if (loaded) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      load(controller);
    });
    return () => { controller.abort(); };
  }, [load, loaded]);

  useEffect(() => () => { controllerRef.current?.abort(); }, []);

  const getFetterName = useCallback((setId: string): string => {
    const id = parseInt(setId, 10);
    const fetter = fetters.find((f) => f.id === id);
    if (!fetter) return `Set ${setId}`;
    return t(fetter.name);
  }, [fetters, t]);

  if (loading) {
    return (
      <div className="space-y-2 rounded-lg border border-border/40 bg-background-secondary/20 p-3">
        <div className="h-3 w-24 animate-pulse rounded bg-white/8" />
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

  // Prefer live baseDamage prop; fall back to server-computed currentDamage
  const currentDamage = (baseDamage && baseDamage > 0) ? baseDamage : data.currentDamage;
  const hasCurrent = currentDamage !== undefined && currentDamage > 0;

  const vsCeiling = hasCurrent && data.ceilingDamage > 0
    ? currentDamage / data.ceilingDamage
    : data.currentVsCeiling;
  const vsStd = hasCurrent && data.standardizedDamage > 0
    ? currentDamage / data.standardizedDamage
    : data.currentVsStandardized;

  // Use standardized reference for layout details display
  const ref = data.standardized;
  const setLabel = ref.setPattern.map(getFetterName).join(' + ');
  const pieceLabel = ref.setPattern.length === 1
    ? '5pc'
    : ref.setPattern.map((_, i) => (i === 0 ? '3pc' : '2pc')).join('+');

  return (
    <div className="space-y-2.5 rounded-lg border border-border/40 bg-background-secondary/20 px-3 py-2.5">
      {/* Column header */}
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-text-primary/25">
        <span className="w-18 shrink-0">Tier</span>
        <span className="flex-1" />
        <span className="w-16 shrink-0 text-right">Damage</span>
        {hasCurrent && <span className="w-12 shrink-0 text-right">Yours</span>}
        {!hasCurrent && <span className="w-12 shrink-0" />}
      </div>

      {/* Tier rows */}
      <div className="space-y-2">
        <TierRow
          label="Ceiling"
          ref_={data.ceiling}
          ceilingDamage={data.ceilingDamage}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsCeiling}
        />
        <TierRow
          label="Standard"
          ref_={data.standardized}
          ceilingDamage={data.ceilingDamage}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsStd}
        />
        <TierRow
          label="Low Roll"
          ref_={data.lowRoll}
          ceilingDamage={data.ceilingDamage}
          currentDamage={hasCurrent ? currentDamage : undefined}
        />
      </div>

      {/* Divider + layout info */}
      {(setLabel || ref.mainStats.length > 0) && (
        <>
          <div className="h-px bg-border/35" />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px]">
              <span className="font-semibold text-text-primary/60">{setLabel}</span>
              {pieceLabel && <span className="text-text-primary/30">{pieceLabel}</span>}
              {ref.layout && (
                <>
                  <span className="text-text-primary/20">·</span>
                  <span className="font-mono text-[10px] text-text-primary/30">{fmtLayout(ref.layout)}</span>
                </>
              )}
            </div>
            {ref.mainStats.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ref.mainStats.map((stat, i) => (
                  <span
                    key={i}
                    className="rounded border border-border/50 bg-white/3 px-1.5 py-0.5 font-mono text-[9.5px] text-text-primary/45"
                  >
                    {fmtStat(stat)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
