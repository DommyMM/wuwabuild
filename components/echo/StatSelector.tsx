'use client';

import React, { useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown } from 'lucide-react';
import { isPercentStat } from '@/lib/constants/statMappings';

interface StatOption {
  name: string;
  displayName: string;
  values?: number[];
  minMax?: [number, number];
}

interface MainStatSelectorProps {
  cost: number | null;
  level: number;
  selectedStat: string | null;
  selectedValue: number | null;
  onChange: (type: string | null, value: number | null) => void;
  disabled?: boolean;
}

export const MainStatSelector: React.FC<MainStatSelectorProps> = ({
  cost,
  level,
  selectedStat,
  selectedValue,
  onChange,
  disabled = false
}) => {
  const { getMainStatsByCost, calculateMainStatValue, statTranslations } = useGameData();
  const { t } = useLanguage();

  // Get available main stats for this cost
  const mainStats = useMemo(() => {
    if (!cost) return {};
    return getMainStatsByCost(cost);
  }, [cost, getMainStatsByCost]);

  // Build options with calculated values
  const options = useMemo((): StatOption[] => {
    return Object.entries(mainStats).map(([statName, [min, max]]) => ({
      name: statName,
      displayName: statTranslations?.[statName] ? t(statTranslations[statName]) : statName,
      minMax: [min, max] as [number, number]
    }));
  }, [mainStats, statTranslations, t]);

  // Calculate value based on level
  const getValueForStat = useCallback((statName: string): number | null => {
    const minMax = mainStats[statName];
    if (!minMax) return null;
    const [min, max] = minMax;
    return calculateMainStatValue(min, max, level);
  }, [mainStats, level, calculateMainStatValue]);

  // Handle stat selection
  const handleStatChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const statName = e.target.value || null;
    if (statName) {
      const value = getValueForStat(statName);
      onChange(statName, value);
    } else {
      onChange(null, null);
    }
  }, [getValueForStat, onChange]);

  // Format display value
  const formatValue = (value: number | null, statName: string | null): string => {
    if (value === null || statName === null) return '0';
    const isPercent = isPercentStat(statName);
    return isPercent ? `${value.toFixed(1)}%` : Math.floor(value).toString();
  };

  const isDisabled = disabled || !cost;

  return (
    <div className="flex items-center gap-2 mt-4">
      {/* Stat Type Dropdown */}
      <div className="relative w-3/4">
        <select
          value={selectedStat || ''}
          onChange={handleStatChange}
          disabled={isDisabled}
          className="w-full appearance-none rounded border border-border bg-background px-3 py-1.5 pr-8 text-sm text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
        >
          <option value="" disabled>Main Stat</option>
          {options.map((option) => (
            <option key={option.name} value={option.name}>
              {option.displayName}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-primary/50 pointer-events-none" />
      </div>

      {/* Value Badge */}
      <span className="w-1/4 rounded border border-accent/50 bg-accent/10 px-2 py-1.5 text-center text-sm font-medium text-accent">
        {formatValue(selectedValue, selectedStat)}
      </span>
    </div>
  );
};

interface SubstatSelectorProps {
  index: number;
  selectedStat: string | null;
  selectedValue: number | null;
  usedStats: Set<string>;
  onChange: (type: string | null, value: number | null) => void;
  disabled?: boolean;
}

export const SubstatSelector: React.FC<SubstatSelectorProps> = ({
  index,
  selectedStat,
  selectedValue,
  usedStats,
  onChange,
  disabled = false
}) => {
  const { substats, getSubstatValues, statTranslations } = useGameData();
  const { t } = useLanguage();

  // Get available substats
  const availableStats = useMemo((): StatOption[] => {
    if (!substats) return [];

    return Object.keys(substats)
      .filter(stat => !usedStats.has(stat) || stat === selectedStat)
      .map(statName => ({
        name: statName,
        displayName: statTranslations?.[statName] ? t(statTranslations[statName]) : statName,
        values: getSubstatValues(statName) || []
      }));
  }, [substats, usedStats, selectedStat, getSubstatValues, statTranslations, t]);

  // Get values for selected stat
  const statValues = useMemo(() => {
    if (!selectedStat) return [];
    return getSubstatValues(selectedStat) || [];
  }, [selectedStat, getSubstatValues]);

  // Handle stat type change
  const handleStatChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const statName = e.target.value || null;
    if (statName) {
      // Auto-select the lowest value when stat changes
      const values = getSubstatValues(statName);
      const defaultValue = values?.[0] ?? null;
      onChange(statName, defaultValue);
    } else {
      onChange(null, null);
    }
  }, [getSubstatValues, onChange]);

  // Handle value change
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null;
    onChange(selectedStat, value);
  }, [selectedStat, onChange]);

  // Format display value
  const formatValue = (value: number, statName: string): string => {
    const isPercent = isPercentStat(statName);
    return isPercent ? `${value.toFixed(1)}%` : Math.floor(value).toString();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Stat Type Dropdown */}
      <div className="relative flex-1">
        <select
          value={selectedStat || ''}
          onChange={handleStatChange}
          disabled={disabled}
          className="w-full appearance-none rounded border border-border bg-background p-2 pr-6 text-xs text-text-primary focus:border-accent focus:outline-none disabled:opacity-50"
        >
          <option value="" disabled>Substat {index + 1}</option>
          {availableStats.map((option) => (
            <option key={option.name} value={option.name}>
              {option.displayName}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-text-primary/50 pointer-events-none" />
      </div>

      {/* Value Dropdown */}
      {selectedStat && statValues.length > 0 && (
        <div className="relative w-20">
          <select
            value={selectedValue?.toString() || ''}
            onChange={handleValueChange}
            disabled={disabled}
            className="w-full appearance-none rounded border border-border bg-background p-2 pr-6 text-xs text-accent font-medium focus:border-accent focus:outline-none disabled:opacity-50"
          >
            {statValues.map((value) => (
              <option key={value} value={value}>
                {formatValue(value, selectedStat)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-text-primary/50 pointer-events-none" />
        </div>
      )}
    </div>
  );
};

interface SubstatsListProps {
  stats: Array<{ type: string | null; value: number | null }>;
  panelId: string;
  onChange: (index: number, type: string | null, value: number | null) => void;
  disabled?: boolean;
}

export const SubstatsList: React.FC<SubstatsListProps> = ({
  stats,
  panelId,
  onChange,
  disabled = false
}) => {
  // Create a used set that excludes the current stat for each substat selector.
  // Only substats should be unique; main stat should not constrain this pool.
  const getUsedStatsForIndex = useCallback((index: number): Set<string> => {
    const used = new Set<string>();
    stats.forEach((stat, i) => {
      if (stat.type && i !== index) {
        used.add(stat.type);
      }
    });
    return used;
  }, [stats]);

  return (
    <div className="flex flex-col gap-2.5 mt-2.5">
      {stats.map((stat, index) => (
        <SubstatSelector
          key={`${panelId}-substat-${index}`}
          index={index}
          selectedStat={stat.type}
          selectedValue={stat.value}
          usedStats={getUsedStatsForIndex(index)}
          onChange={(type, value) => onChange(index, type, value)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};
