'use client';

import React from 'react';
import { getEchoCVTierStyle, QUALITY_TIERS } from '@/lib/calculations/rollValues';
import { getSubstatTierInfo } from '@/lib/calculations/substatTiers';

export function formatStatRoll(value: number, isPercent: boolean): string {
  return isPercent ? `${Number(value).toFixed(1)}%` : String(Math.round(Number(value)));
}

// A label/value pair used inside hover tooltip bodies on the echo panels.
export const StatHoverRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-baseline justify-between gap-4">
    <span className="text-xs font-semibold uppercase tracking-wide text-white/55">{label}</span>
    <span className="text-sm font-semibold text-white/90">{children}</span>
  </div>
);

// Discrete bar of every possible roll for a substat, tinted by quality tier
export const SubstatRollBar: React.FC<{
  rollValues: number[];
  currentValue: number;
  isPercent: boolean;
  showValueLabel?: boolean;
}> = ({ rollValues, currentValue, isPercent, showValueLabel = true }) => {
  const sorted = rollValues.filter((value) => Number.isFinite(value)).slice().sort((a, b) => a - b);
  if (sorted.length < 2) {
    return <span className="text-sm font-semibold text-white/90">{formatStatRoll(currentValue, isPercent)}</span>;
  }

  let currentIndex = 0;
  let bestDelta = Infinity;
  sorted.forEach((value, index) => {
    const delta = Math.abs(value - currentValue);
    if (delta < bestDelta) {
      bestDelta = delta;
      currentIndex = index;
    }
  });

  const tierColors = sorted.map((value) => getSubstatTierInfo(value, sorted)?.color ?? '#888888');
  const currentColor = tierColors[currentIndex];

  return (
    <div>
      {showValueLabel && (
        <div className="flex items-end gap-0.5">
          {sorted.map((value, index) => (
            <span
              key={index}
              className="min-w-0 flex-1 text-center text-xs font-bold leading-none tabular-nums"
              style={{ color: index === currentIndex ? currentColor : 'transparent' }}
            >
              {formatStatRoll(value, isPercent)}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1 flex items-end gap-0.5">
        {sorted.map((value, index) => {
          const isCurrent = index === currentIndex;
          return (
            <div
              key={index}
              className="min-w-0 flex-1 rounded-xs"
              style={{
                backgroundColor: tierColors[index],
                height: isCurrent ? 18 : 7,
                opacity: isCurrent ? 1 : 0.55,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Segment strip of the shared quality-tier ladder
export const TierLadder: React.FC<{ currentLabel: string }> = ({ currentLabel }) => {
  const tiers = QUALITY_TIERS.slice().reverse(); // low -> high
  const currentIndex = tiers.findIndex((tier) => tier.label === currentLabel);

  return (
    <div className="flex items-end gap-0.5">
      {tiers.map((tier, index) => {
        const isCurrent = index === currentIndex;
        return (
          <div
            key={tier.label}
            className="min-w-0 flex-1 rounded-xs"
            style={{
              backgroundColor: tier.color,
              height: isCurrent ? 18 : 7,
              opacity: isCurrent ? 1 : 0.55,
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          />
        );
      })}
    </div>
  );
};

// A value plotted on the ladder with the value text floated over the landed tier
export const QualityTierBar: React.FC<{ currentLabel: string; valueText: string }> = ({ currentLabel, valueText }) => {
  const tiers = QUALITY_TIERS.slice().reverse(); // low -> high
  const currentIndex = tiers.findIndex((tier) => tier.label === currentLabel);
  const current = currentIndex >= 0 ? tiers[currentIndex] : null;
  // Center of the landed segment, as a fraction of the strip width
  const centerPct = currentIndex >= 0 ? ((currentIndex + 0.5) / tiers.length) * 100 : 50;

  return (
    <div>
      <div className="relative h-3.5">
        {current && (
          <span
            className="absolute top-0 -translate-x-1/2 text-xs font-bold leading-none whitespace-nowrap tabular-nums"
            style={{
              color: current.color,
              left: `clamp(1.25rem, ${centerPct}%, calc(100% - 1.25rem))`,
            }}
          >
            {valueText}
          </span>
        )}
      </div>
      <div className="mt-0.5">
        <TierLadder currentLabel={currentLabel} />
      </div>
    </div>
  );
};

// Echo CV plotted on its quality-tier ladder; the build's tier is enlarged.
export const EchoCVBar: React.FC<{ cv: number }> = ({ cv }) => (
  <QualityTierBar currentLabel={getEchoCVTierStyle(cv).label} valueText={cv.toFixed(1)} />
);
