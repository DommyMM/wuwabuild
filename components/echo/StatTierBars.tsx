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

// Discrete bar of every possible roll for a substat, tinted by quality tier.
// The roll this build landed is enlarged, brightened and labelled. Pass
// showValueLabel={false} where the value already renders next to the bar.
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
              className="min-w-0 flex-1 rounded-[2px]"
              style={{
                backgroundColor: tierColors[index],
                height: isCurrent ? 18 : 7,
                opacity: isCurrent ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// A value plotted on the shared quality-tier ladder; the landed tier is enlarged.
// CV and RV both grade on QUALITY_TIERS, so the ladder only needs the tier label.
export const QualityTierBar: React.FC<{ currentLabel: string; valueText: string }> = ({ currentLabel, valueText }) => {
  const tiers = QUALITY_TIERS.slice().reverse(); // low -> high
  const currentIndex = tiers.findIndex((tier) => tier.label === currentLabel);

  return (
    <div>
      <div className="flex items-end gap-0.5">
        {tiers.map((tier, index) => (
          <span
            key={tier.label}
            className="min-w-0 flex-1 text-center text-xs font-bold leading-none tabular-nums"
            style={{ color: index === currentIndex ? tier.color : 'transparent' }}
          >
            {valueText}
          </span>
        ))}
      </div>
      <div className="mt-1 flex items-end gap-0.5">
        {tiers.map((tier, index) => {
          const isCurrent = index === currentIndex;
          return (
            <div
              key={tier.label}
              className="min-w-0 flex-1 rounded-[2px]"
              style={{
                backgroundColor: tier.color,
                height: isCurrent ? 18 : 7,
                opacity: isCurrent ? 1 : 0.4,
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

// Echo CV plotted on its quality-tier ladder; the build's tier is enlarged.
export const EchoCVBar: React.FC<{ cv: number }> = ({ cv }) => (
  <QualityTierBar currentLabel={getEchoCVTierStyle(cv).label} valueText={cv.toFixed(1)} />
);
