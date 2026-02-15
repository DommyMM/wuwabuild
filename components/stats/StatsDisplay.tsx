'use client';

import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useStats } from '@/contexts/StatsContext';
import { StatRow } from './StatRow';
import { StatBreakdown } from './StatBreakdown';
import { CVDisplay } from './CVDisplay';
import { StatName, BaseStatName } from '@/types/stats';

interface StatsDisplayProps {
  className?: string;
  defaultExpanded?: boolean;
  showCV?: boolean;
}

// Stat groupings
const STAT_GROUPS = {
  base: {
    label: 'Base Stats',
    stats: ['HP', 'ATK', 'DEF'] as StatName[],
    isPercent: false
  },
  crit: {
    label: 'Crit Stats',
    stats: ['Crit Rate', 'Crit DMG'] as StatName[],
    isPercent: true
  },
  element: {
    label: 'Element DMG',
    stats: [
      'Aero DMG',
      'Glacio DMG',
      'Fusion DMG',
      'Electro DMG',
      'Havoc DMG',
      'Spectro DMG'
    ] as StatName[],
    isPercent: true
  },
  skill: {
    label: 'Skill DMG',
    stats: [
      'Basic Attack DMG Bonus',
      'Heavy Attack DMG Bonus',
      'Resonance Skill DMG Bonus',
      'Resonance Liberation DMG Bonus'
    ] as StatName[],
    isPercent: true
  },
  other: {
    label: 'Other Stats',
    stats: ['Energy Regen', 'Healing Bonus'] as StatName[],
    isPercent: true
  }
};

// Base stats that have detailed breakdowns
const BASE_STATS: BaseStatName[] = ['HP', 'ATK', 'DEF'];

interface StatGroupProps {
  label: string;
  stats: StatName[];
  isPercent: boolean;
  expandedStat: StatName | null;
  onExpandStat: (stat: StatName | null) => void;
}

const StatGroup: React.FC<StatGroupProps> = ({
  label,
  stats,
  isPercent,
  expandedStat,
  onExpandStat
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { getStatValue, getStatUpdate, getStatBaseValue, getStatBreakdown } = useStats();

  // Filter to only show stats with non-zero values (for element/skill DMG)
  const visibleStats = stats.filter(stat => {
    // Always show base and crit stats
    if (['HP', 'ATK', 'DEF', 'Crit Rate', 'Crit DMG', 'Energy Regen'].includes(stat)) {
      return true;
    }
    // For other stats, show if there's any bonus
    return getStatUpdate(stat) > 0;
  });

  if (visibleStats.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-background-secondary">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-left transition-colors hover:bg-background"
      >
        <span className="text-sm font-medium text-text-primary/70">{label}</span>
        {isExpanded ? (
          <ChevronDown size={16} className="text-text-primary/40" />
        ) : (
          <ChevronRight size={16} className="text-text-primary/40" />
        )}
      </button>

      {/* Group Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {visibleStats.map(stat => {
            const value = getStatValue(stat);
            const update = getStatUpdate(stat);
            const baseValue = getStatBaseValue(stat);
            const isBaseStat = BASE_STATS.includes(stat as BaseStatName);
            const isStatExpanded = expandedStat === stat;

            return (
              <div key={stat}>
                <StatRow
                  statName={stat}
                  value={value}
                  update={update}
                  baseValue={baseValue}
                  isPercent={isPercent}
                  onExpand={isBaseStat ? () => onExpandStat(isStatExpanded ? null : stat) : undefined}
                  showBreakdown={isBaseStat}
                />
                {/* Show breakdown for base stats when expanded */}
                {isStatExpanded && isBaseStat && (
                  <div className="px-2 pb-2">
                    {(() => {
                      const breakdown = getStatBreakdown(stat as BaseStatName);
                      if (!breakdown) return null;
                      return (
                        <StatBreakdown
                          statName={stat as BaseStatName}
                          baseValue={baseValue}
                          flat={breakdown.flat}
                          percent={breakdown.percent}
                          echoDefault={breakdown.echoDefault}
                          totalValue={value}
                          onClose={() => onExpandStat(null)}
                        />
                      );
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  className = '',
  defaultExpanded = true,
  showCV = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedStat, setExpandedStat] = useState<StatName | null>(null);
  const { stats, loading } = useStats();

  const handleExpandStat = useCallback((stat: StatName | null) => {
    setExpandedStat(stat);
  }, []);

  if (loading) {
    return (
      <div className={`rounded-lg border border-border bg-background-secondary p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <span className="text-text-primary/60">Loading stats...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-border bg-background-secondary ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-background"
      >
        <span className="font-semibold text-text-primary">Stats</span>
        {isExpanded ? (
          <ChevronDown size={20} className="text-text-primary/60" />
        ) : (
          <ChevronRight size={20} className="text-text-primary/60" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          {/* CV Display */}
          {showCV && <CVDisplay />}

          {/* Active Set Bonuses */}
          {stats.activeSets.length > 0 && (
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 text-sm font-medium text-text-primary/70">Active Set Bonuses</div>
              <div className="flex flex-wrap gap-2">
                {stats.activeSets.map(({ element, count, setName }) => (
                  <div
                    key={element}
                    className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent"
                  >
                    {setName} ({count}pc)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stat Groups */}
          <div className="space-y-3">
            {Object.entries(STAT_GROUPS).map(([key, group]) => (
              <StatGroup
                key={key}
                label={group.label}
                stats={group.stats}
                isPercent={group.isPercent}
                expandedStat={expandedStat}
                onExpandStat={handleExpandStat}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsDisplay;
