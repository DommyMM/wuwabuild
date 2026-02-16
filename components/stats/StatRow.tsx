'use client';

import React, { useState, useCallback } from 'react';
import { STAT_CDN_NAMES, getStatIconName, STAT_ABBREV } from '@/lib/constants/statMappings';
import { StatName } from '@/types/stats';

interface StatRowProps {
  statName: StatName;
  value: number;
  update: number;
  baseValue: number;
  isPercent?: boolean;
  onExpand?: () => void;
  showBreakdown?: boolean;
  className?: string;
}

// Get CDN URL for stat icon
const getStatIconUrl = (statName: string): string => {
  const iconName = getStatIconName(statName);
  const cdnName = STAT_CDN_NAMES[iconName] || 'redattack';
  return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconAttribute/${cdnName}.png`;
};

// Format stat value for display
const formatStatValue = (value: number, isPercent: boolean): string => {
  if (isPercent) {
    return `${value.toFixed(1)}%`;
  }
  return Math.round(value).toLocaleString();
};

// Format update value for display
const formatUpdateValue = (update: number, isPercent: boolean): string => {
  if (update === 0) return '';
  const prefix = update > 0 ? '+' : '';
  if (isPercent) {
    return `${prefix}${update.toFixed(1)}%`;
  }
  return `${prefix}${Math.round(update).toLocaleString()}`;
};

export const StatRow: React.FC<StatRowProps> = ({
  statName,
  value,
  update,
  baseValue,
  isPercent = false,
  onExpand,
  showBreakdown = false,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleClick = useCallback(() => {
    if (onExpand) {
      onExpand();
    }
  }, [onExpand]);

  // Get display abbreviation
  const displayName = STAT_ABBREV[statName] || statName;
  const hasUpdate = update !== 0;
  const isClickable = !!onExpand;

  return (
    <div
      className={`relative flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
        isClickable ? 'cursor-pointer hover:bg-background' : ''
      } ${className}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Left side: Icon + Name */}
      <div className="flex items-center gap-2">
        <img
          src={getStatIconUrl(statName)}
          alt={statName}
          className="h-5 w-5"
        />
        <span className="text-sm text-text-primary/80">{displayName}</span>
      </div>

      {/* Right side: Value + Update */}
      <div className="flex items-center gap-2">
        <span className="font-medium text-text-primary">
          {formatStatValue(value, isPercent)}
        </span>
        {hasUpdate && (
          <span className={`text-sm ${update > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatUpdateValue(update, isPercent)}
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && hasUpdate && (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-lg border border-border bg-background-secondary px-3 py-2 shadow-lg">
          <div className="whitespace-nowrap text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-text-primary/60">Base:</span>
              <span className="text-text-primary">
                {formatStatValue(baseValue, isPercent)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-text-primary/60">Bonus:</span>
              <span className={update > 0 ? 'text-green-400' : 'text-red-400'}>
                {formatUpdateValue(update, isPercent)}
              </span>
            </div>
            <div className="mt-1 border-t border-border pt-1 flex justify-between gap-4">
              <span className="text-text-primary/60">Total:</span>
              <span className="font-medium text-text-primary">
                {formatStatValue(value, isPercent)}
              </span>
            </div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-background-secondary" />
        </div>
      )}

      {/* Expand indicator */}
      {showBreakdown && isClickable && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-text-primary/30">
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.5 2L8.5 6L4.5 10"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default StatRow;
