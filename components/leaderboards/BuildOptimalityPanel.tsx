'use client';

import React, { useCallback } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBBoardOptimality, LBOptimalityReference } from '@/lib/lb';

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
}

const TIER_STYLES: Record<string, { bar: string; text: string }> = {
  ceiling: { bar: 'bg-amber-400/75', text: 'text-amber-300/90' },
  standardized: { bar: 'bg-text-primary/40', text: 'text-text-primary/65' },
  low_roll: { bar: 'bg-white/15', text: 'text-text-primary/35' },
};

const TierRow: React.FC<TierRowProps> = ({ label, ref_, currentDamage, ratio }) => {
  const style = TIER_STYLES[ref_.tier] ?? TIER_STYLES.standardized;
  const fillPct = currentDamage && ref_.damage > 0
    ? Math.min(100, (currentDamage / ref_.damage) * 100)
    : 0;

  const ratioColor =
    ratio === undefined ? ''
      : ratio >= 1 ? 'text-emerald-400'
        : ratio >= 0.95 ? 'text-accent'
          : ratio >= 0.90 ? 'text-amber-200/70'
            : 'text-text-primary/50';

  return (
    <div className="flex items-center gap-3">
      <span className={`w-18 shrink-0 text-[10.5px] font-semibold uppercase tracking-wider ${style.text}`}>
        {label}
      </span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/6">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ${style.bar}`}
          style={{ width: `${fillPct}%` }}
        />
        <div className="absolute -inset-y-px right-0 w-[1.5px] rounded-full bg-white/20" />
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
  const { fetters, getEcho } = useGameData();
  const { t } = useLanguage();

  const getFetterName = useCallback((setId: string): string => {
    const id = parseInt(setId, 10);
    const fetter = fetters.find((f) => f.id === id);
    if (!fetter) return `Set ${setId}`;
    return t(fetter.name);
  }, [fetters, t]);

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

  const ref = data.standardized;
  const setLabel = ref.setPattern.map(getFetterName).join(' + ');
  const pieceLabel = ref.setPattern.length === 1
    ? '5pc'
    : ref.setPattern.map((_, i) => (i === 0 ? '3pc' : '2pc')).join('+');
  const leadEcho = ref.echoIds[0] ? getEcho(ref.echoIds[0]) : null;

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
        />
        <TierRow
          label="Standard"
          ref_={data.standardized}
          currentDamage={hasCurrent ? currentDamage : undefined}
          ratio={vsStd}
        />
        <TierRow
          label="Low Roll"
          ref_={data.lowRoll}
          currentDamage={hasCurrent ? currentDamage : undefined}
        />
      </div>

      {(setLabel || ref.mainStats.length > 0) && (
        <>
          <div className="h-px bg-border/35" />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px]">
              <span className="font-semibold text-text-primary/60">{setLabel}</span>
              {pieceLabel && <span className="text-text-primary/30">{pieceLabel}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] text-text-primary/40">
              <span className="uppercase tracking-widest text-text-primary/25">Layout</span>
              <span>{fmtLayout(ref.layout)}</span>
            </div>
            {leadEcho && (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] text-text-primary/40">
                <span className="uppercase tracking-widest text-text-primary/25">Lead Echo</span>
                <span>{t(leadEcho.nameI18n ?? { en: leadEcho.name })}</span>
              </div>
            )}
            {ref.mainStats.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {ref.mainStats.map((stat, idx) => (
                  <span
                    key={`${stat}-${idx}`}
                    className="rounded-full border border-border/45 bg-white/4 px-2 py-0.5 text-[10.5px] text-text-primary/55"
                  >
                    {stat}
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
