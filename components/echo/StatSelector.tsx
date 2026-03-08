'use client';

import React, { useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown } from 'lucide-react';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';

interface StatOption {
  name: string;
  displayName: string;
  fullDisplayName?: string;
  values?: number[];
  minMax?: [number, number];
}

const ECHO_STAT_ROW_CLASS = 'grid grid-cols-[minmax(0,1fr)_4.75rem] items-center gap-2';
const ECHO_STAT_SELECT_CLASS = 'w-full min-w-0 appearance-none rounded border border-border bg-background focus:border-accent focus:outline-none disabled:opacity-50';

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
    return Object.entries(mainStats).map(([statName, [min, max]]) => {
      const fullDisplayName = statTranslations?.[statName] ? t(statTranslations[statName]) : statName;
      return {
        name: statName,
        displayName: fullDisplayName,
        fullDisplayName,
        minMax: [min, max] as [number, number]
      };
    });
  }, [mainStats, statTranslations, t]);

  const selectedStatTitle = useMemo(() => {
    if (!selectedStat) return 'Main Stat';
    return options.find(option => option.name === selectedStat)?.fullDisplayName ?? selectedStat;
  }, [options, selectedStat]);

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
    <div className={`mt-4 ${ECHO_STAT_ROW_CLASS}`}>
      {/* Stat Type Dropdown */}
      <div className="relative min-w-0">
        <select
          value={selectedStat || ''}
          onChange={handleStatChange}
          disabled={isDisabled}
          title={selectedStatTitle}
          className={`${ECHO_STAT_SELECT_CLASS} px-3 py-1.5 pr-8 text-sm text-text-primary`}
        >
          <option value="" disabled>Main Stat</option>
          {options.map((option) => (
            <option key={option.name} value={option.name} title={option.fullDisplayName}>
              {option.displayName}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-primary/50 pointer-events-none" />
      </div>

      {/* Value Badge */}
      <span className="w-full min-w-0 rounded border border-accent/50 bg-accent/10 px-2 py-1.5 text-center text-sm font-medium text-accent">
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
      .map(statName => {
        const fullDisplayName = statTranslations?.[statName] ? t(statTranslations[statName]) : statName;
        return {
          name: statName,
          displayName: getEchoSubstatShortLabel(fullDisplayName),
          fullDisplayName,
          values: getSubstatValues(statName) || []
        };
      });
  }, [substats, usedStats, selectedStat, getSubstatValues, statTranslations, t]);

  // Get values for selected stat
  const statValues = useMemo(() => {
    if (!selectedStat) return [];
    return getSubstatValues(selectedStat) || [];
  }, [selectedStat, getSubstatValues]);

  const selectedStatTitle = useMemo(() => {
    if (!selectedStat) return `Substat ${index + 1}`;
    return availableStats.find(option => option.name === selectedStat)?.fullDisplayName ?? selectedStat;
  }, [availableStats, index, selectedStat]);

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
    <div className={ECHO_STAT_ROW_CLASS}>
      {/* Stat Type Dropdown */}
      <div className="relative min-w-0">
        <select
          value={selectedStat || ''}
          onChange={handleStatChange}
          disabled={disabled}
          title={selectedStatTitle}
          className={`${ECHO_STAT_SELECT_CLASS} p-2 pr-6 text-xs text-text-primary`}
        >
          <option value="" disabled>Substat {index + 1}</option>
          {availableStats.map((option) => (
            <option key={option.name} value={option.name} title={option.fullDisplayName}>
              {option.displayName}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-text-primary/50 pointer-events-none" />
      </div>

      {/* Value Dropdown */}
      {selectedStat && statValues.length > 0 && (
        <div className="relative min-w-0">
          <select
            value={selectedValue?.toString() || ''}
            onChange={handleValueChange}
            disabled={disabled}
            className={`${ECHO_STAT_SELECT_CLASS} p-2 pr-6 text-xs font-medium text-accent`}
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
