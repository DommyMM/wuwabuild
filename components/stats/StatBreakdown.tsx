'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { BaseStatName } from '@/types/stats';

interface StatBreakdownProps {
  statName: BaseStatName;
  baseValue: number;
  flat: number;
  percent: number;
  echoDefault: number;
  totalValue: number;
  onClose?: () => void;
  className?: string;
}

// Source labels for breakdown
const SOURCE_LABELS: Record<string, { label: string; description: string }> = {
  base: { label: 'Base', description: 'Character + Weapon base stat' },
  percent: { label: '% Bonus', description: 'Percentage bonuses from echoes, weapons, sets, and fortes' },
  flat: { label: 'Flat', description: 'Flat stat bonuses from echo substats' },
  echoDefault: { label: 'Echo Default', description: 'Default stats from equipped echoes' }
};

interface BreakdownRowProps {
  label: string;
  description: string;
  value: number;
  isPercent?: boolean;
  highlight?: boolean;
}

const BreakdownRow: React.FC<BreakdownRowProps> = ({
  label,
  description,
  value,
  isPercent = false,
  highlight = false
}) => {
  const formattedValue = isPercent
    ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
    : value > 0
    ? `+${Math.round(value).toLocaleString()}`
    : Math.round(value).toLocaleString();

  return (
    <div
      className={`flex items-center justify-between py-2 ${
        highlight ? 'border-t border-border pt-3' : ''
      }`}
      title={description}
    >
      <span className={`text-sm ${highlight ? 'font-medium text-text-primary' : 'text-text-primary/70'}`}>
        {label}
      </span>
      <span
        className={`font-mono text-sm ${
          highlight
            ? 'font-bold text-text-primary'
            : value > 0
            ? 'text-green-400'
            : value < 0
            ? 'text-red-400'
            : 'text-text-primary/60'
        }`}
      >
        {formattedValue}
      </span>
    </div>
  );
};

export const StatBreakdown: React.FC<StatBreakdownProps> = ({
  statName,
  baseValue,
  flat,
  percent,
  echoDefault,
  totalValue,
  onClose,
  className = ''
}) => {
  const { statIcons } = useGameData();
  // Calculate the percent contribution
  const percentContribution = Math.round(baseValue * (percent / 100));

  return (
    <div className={`rounded-lg border border-border bg-background-secondary p-4 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={statIcons?.[statName] ?? ''}
            alt={statName}
            className="h-6 w-6"
          />
          <span className="font-semibold text-text-primary">{statName} Breakdown</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 text-text-primary/60 transition-colors hover:bg-background hover:text-text-primary"
            aria-label="Close breakdown"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Breakdown Rows */}
      <div className="space-y-1">
        {/* Base Value */}
        <BreakdownRow
          label={SOURCE_LABELS.base.label}
          description={SOURCE_LABELS.base.description}
          value={baseValue}
        />

        {/* Percent Bonus - show as percentage */}
        <BreakdownRow
          label={SOURCE_LABELS.percent.label}
          description={SOURCE_LABELS.percent.description}
          value={percent}
          isPercent
        />

        {/* Show calculated percent contribution */}
        {percent > 0 && (
          <div className="flex items-center justify-between py-1 pl-4 text-xs text-text-primary/50">
            <span>= {baseValue.toLocaleString()} x {percent.toFixed(1)}%</span>
            <span>+{percentContribution.toLocaleString()}</span>
          </div>
        )}

        {/* Flat Bonus */}
        <BreakdownRow
          label={SOURCE_LABELS.flat.label}
          description={SOURCE_LABELS.flat.description}
          value={flat}
        />

        {/* Echo Default */}
        <BreakdownRow
          label={SOURCE_LABELS.echoDefault.label}
          description={SOURCE_LABELS.echoDefault.description}
          value={echoDefault}
        />

        {/* Total */}
        <BreakdownRow
          label="Total"
          description="Final calculated stat value"
          value={totalValue}
          highlight
        />
      </div>

      {/* Formula explanation */}
      <div className="mt-4 rounded-lg bg-background p-3 text-xs text-text-primary/50">
        <div className="font-medium text-text-primary/70 mb-1">Formula:</div>
        <div className="font-mono">
          Base x (1 + %Bonus/100) + Flat + Echo Default
        </div>
        <div className="mt-1 font-mono">
          = {baseValue.toLocaleString()} x (1 + {percent.toFixed(1)}/100) + {flat} + {echoDefault}
        </div>
        <div className="mt-1 font-mono text-text-primary/70">
          = {totalValue.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default StatBreakdown;
