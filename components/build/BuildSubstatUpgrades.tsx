'use client';

import React from 'react';

export interface BuildUpgradeColumn {
  key: string;
  label: string;
  icon: string;
  rollValue: number;
  gain: number;
  result: number;
  percentGain: number;
  isPercent: boolean;
}

interface TierOption {
  key: string;
  label: string;
}

interface BuildSubstatUpgradesProps {
  isLoading: boolean;
  error: string | null;
  hasUpgradeData: boolean;
  hasBaseDamage: boolean;
  baseDamage?: number;
  tierOptions: readonly TierOption[];
  selectedTier: string;
  onSelectTier: (tier: string) => void;
  orderedUpgradeColumns: BuildUpgradeColumn[];
}

function formatDamage(value: number): string {
  return Math.round(value).toLocaleString();
}

function formatSignedPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `+${value.toFixed(value >= 10 ? 1 : 2)}%`;
}

function formatUpgradeValue(value: number, isPercent: boolean): string {
  if (isPercent) return `${Number(value).toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}

function formatSignedUpgradeValue(value: number, isPercent: boolean): string {
  const formatted = formatUpgradeValue(value, isPercent);
  return value > 0 ? `+${formatted}` : formatted;
}

function getGainColor(percentGain: number, maxPercentGain: number): string {
  if (!Number.isFinite(percentGain) || percentGain <= 0) return 'rgba(224,224,224,0.6)';
  const ratio = maxPercentGain > 0 ? Math.min(1, percentGain / maxPercentGain) : 0;
  const lightness = 61 + (ratio * 14);
  return `hsl(129 73% ${lightness}%)`;
}

export const BuildSubstatUpgrades: React.FC<BuildSubstatUpgradesProps> = ({
  isLoading,
  error,
  hasUpgradeData,
  hasBaseDamage,
  baseDamage,
  tierOptions,
  selectedTier,
  onSelectTier,
  orderedUpgradeColumns,
}) => {
  const strongestPercentGain = orderedUpgradeColumns.reduce(
    (max, column) => Math.max(max, column.percentGain),
    0,
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="inline-flex items-center rounded-md border border-border/60 bg-background-secondary/75 p-0.5">
          {tierOptions.map((option) => {
            const isActive = option.key === selectedTier;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelectTier(option.key)}
                className={`rounded px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors ${
                  isActive
                    ? 'bg-accent text-black'
                    : 'text-text-primary/62 hover:text-text-primary'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={`upgrade-skeleton-${index}`} className="grid grid-cols-[minmax(0,1.25fr)_0.8fr_0.8fr_0.8fr] gap-3 animate-pulse border-b border-border/45 py-2.5 last:border-b-0">
              <div className="h-4 rounded bg-white/10" />
              <div className="h-4 rounded bg-white/8" />
              <div className="h-4 rounded bg-white/8" />
              <div className="h-4 rounded bg-white/8" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-lg border border-red-500/45 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!isLoading && !error && !hasUpgradeData && (
        <div className="py-1 text-sm text-text-primary/60">
          No substat upgrade data available for this board.
        </div>
      )}

      {!isLoading && !error && hasUpgradeData && !hasBaseDamage && (
        <div className="py-1 text-sm text-text-primary/60">
          Missing current board context for projected result rendering.
        </div>
      )}

      {!isLoading && !error && hasUpgradeData && hasBaseDamage && orderedUpgradeColumns.length > 0 && (
        <table className="mx-auto border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/55 text-xs font-semibold uppercase tracking-[0.18em] text-text-primary/48">
              <th className="min-w-30 bg-background-secondary/48 py-2 pr-4 pl-3 text-left">Substat</th>
              <th className="min-w-30 py-2 px-3 text-center text-accent">Original</th>
              {orderedUpgradeColumns.map((column) => (
                <th key={`upgrade-column-${column.key}`} className="min-w-30 py-2 px-3 text-center">
                  <div className="flex items-end justify-center gap-1">
                    {column.icon ? (
                      <img src={column.icon} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0 rounded bg-white/12" />
                    )}
                    <span className="leading-none">{column.label}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/45">
            <tr>
              <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">Projected damage</th>
              <td className="px-3 py-2.5 text-center font-semibold text-white/92">
                {formatDamage(baseDamage ?? 0)}
              </td>
              {orderedUpgradeColumns.map((column) => (
                <td key={`upgrade-result-${column.key}`} className="px-3 py-2.5 text-center">
                  <div className="font-semibold text-white/92">{formatDamage(column.result)}</div>
                </td>
              ))}
            </tr>

            <tr>
              <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">Gain over base</th>
              <td className="px-3 py-2.5 text-center text-text-primary/35">—</td>
              {orderedUpgradeColumns.map((column) => (
                <td key={`upgrade-gain-${column.key}`} className="px-3 py-2.5 text-center font-semibold" style={{ color: getGainColor(column.percentGain, strongestPercentGain) }}>
                  +{formatDamage(column.gain)}
                </td>
              ))}
            </tr>

            <tr>
              <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">% gain over base</th>
              <td className="px-3 py-2.5 text-center text-text-primary/35">—</td>
              {orderedUpgradeColumns.map((column) => (
                <td key={`upgrade-percent-${column.key}`} className="px-3 py-2.5 text-center font-semibold" style={{ color: getGainColor(column.percentGain, strongestPercentGain) }}>
                  {formatSignedPercent(column.percentGain)}
                </td>
              ))}
            </tr>

            <tr>
              <th className="bg-background-secondary/32 py-2.5 pr-4 pl-3 text-left font-semibold text-text-primary/82">Added roll</th>
              <td className="px-3 py-2.5 text-center text-text-primary/35">—</td>
              {orderedUpgradeColumns.map((column) => (
                <td key={`upgrade-roll-${column.key}`} className="px-3 py-2.5 text-center text-text-primary/78">
                  {formatSignedUpgradeValue(column.rollValue, column.isPercent)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      )}
    </section>
  );
};
