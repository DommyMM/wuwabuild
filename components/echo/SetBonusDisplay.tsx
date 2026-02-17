'use client';

import React, { useMemo } from 'react';
import { ElementType, ELEMENT_SETS, THREE_PIECE_SETS } from '@/types/echo';
import { ELEMENT_TO_SET, SET_TO_STAT, getSetBonus } from '@/lib/constants/setBonuses';
import { STAT_ABBREV } from '@/lib/constants/statMappings';

interface SetInfo {
  element: string;
  count: number;
}

interface SetBonusDisplayProps {
  sets: SetInfo[];
  className?: string;
}

// Element to color mapping
const ELEMENT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Aero': { bg: 'bg-aero/20', border: 'border-aero/50', text: 'text-aero' },
  'Glacio': { bg: 'bg-blue-400/20', border: 'border-blue-400/50', text: 'text-blue-400' },
  'Electro': { bg: 'bg-purple-400/20', border: 'border-purple-400/50', text: 'text-purple-400' },
  'Fusion': { bg: 'bg-orange-400/20', border: 'border-orange-400/50', text: 'text-orange-400' },
  'Havoc': { bg: 'bg-pink-400/20', border: 'border-pink-400/50', text: 'text-pink-400' },
  'Spectro': { bg: 'bg-spectro/20', border: 'border-spectro/50', text: 'text-spectro' },
  'ER': { bg: 'bg-green-400/20', border: 'border-green-400/50', text: 'text-green-400' },
  'Attack': { bg: 'bg-red-400/20', border: 'border-red-400/50', text: 'text-red-400' },
  'Healing': { bg: 'bg-emerald-400/20', border: 'border-emerald-400/50', text: 'text-emerald-400' },
  'Empyrean': { bg: 'bg-cyan-400/20', border: 'border-cyan-400/50', text: 'text-cyan-400' },
  'Frosty': { bg: 'bg-sky-400/20', border: 'border-sky-400/50', text: 'text-sky-400' },
  'Midnight': { bg: 'bg-indigo-400/20', border: 'border-indigo-400/50', text: 'text-indigo-400' },
  'Radiance': { bg: 'bg-yellow-300/20', border: 'border-yellow-300/50', text: 'text-yellow-300' },
  'Tidebreaking': { bg: 'bg-teal-400/20', border: 'border-teal-400/50', text: 'text-teal-400' },
  'Gust': { bg: 'bg-lime-400/20', border: 'border-lime-400/50', text: 'text-lime-400' },
  'Windward': { bg: 'bg-emerald-300/20', border: 'border-emerald-300/50', text: 'text-emerald-300' },
  'Flaming': { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-500' },
  'Dream': { bg: 'bg-violet-400/20', border: 'border-violet-400/50', text: 'text-violet-400' },
  'Crown': { bg: 'bg-amber-400/20', border: 'border-amber-400/50', text: 'text-amber-400' },
  'Law': { bg: 'bg-slate-400/20', border: 'border-slate-400/50', text: 'text-slate-400' },
  'Flamewing': { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-500' },
  'Thread': { bg: 'bg-gray-500/20', border: 'border-gray-500/50', text: 'text-gray-400' },
  'Pact': { bg: 'bg-yellow-400/20', border: 'border-yellow-400/50', text: 'text-yellow-400' },
  'Halo': { bg: 'bg-cyan-300/20', border: 'border-cyan-300/50', text: 'text-cyan-300' },
  'Rite': { bg: 'bg-amber-300/20', border: 'border-amber-300/50', text: 'text-amber-300' },
  'Trailblazing': { bg: 'bg-red-500/20', border: 'border-red-500/50', text: 'text-red-500' },
  'Chromatic': { bg: 'bg-pink-300/20', border: 'border-pink-300/50', text: 'text-pink-300' },
  'Sound': { bg: 'bg-teal-300/20', border: 'border-teal-300/50', text: 'text-teal-300' }
};

// Default colors for unknown elements
const DEFAULT_COLORS = { bg: 'bg-gray-400/20', border: 'border-gray-400/50', text: 'text-gray-400' };

/**
 * Get the active bonuses for a set based on piece count
 */
const getActiveBonuses = (element: string, count: number): string[] => {
  const setName = ELEMENT_TO_SET[element as ElementType];
  if (!setName) return [];

  const isThreePieceSet = THREE_PIECE_SETS.includes(element as ElementType);
  const bonuses: string[] = [];

  if (isThreePieceSet) {
    // 3-piece sets only have a 3-piece bonus
    if (count >= 3) {
      bonuses.push('3-Piece Bonus Active');
    }
  } else {
    // Standard sets have 2-piece and 5-piece bonuses
    if (count >= 2) {
      const bonus = getSetBonus(setName, 2);
      if (bonus) {
        const statAbbrev = STAT_ABBREV[bonus.stat] || bonus.stat;
        bonuses.push(`2pc: +${bonus.value}% ${statAbbrev}`);
      }
    }
    if (count >= 5) {
      bonuses.push('5-Piece Bonus Active');
    }
  }

  return bonuses;
};

export const SetBonusDisplay: React.FC<SetBonusDisplayProps> = ({
  sets,
  className = ''
}) => {
  // Calculate display info for each set
  const setDisplays = useMemo(() => {
    return sets.map(({ element, count }) => {
      const setName = ELEMENT_SETS[element as ElementType] || element;
      const colors = ELEMENT_COLORS[element] || DEFAULT_COLORS;
      const bonuses = getActiveBonuses(element, count);
      const isThreePieceSet = THREE_PIECE_SETS.includes(element as ElementType);

      // Calculate progress towards next bonus
      let nextThreshold: number | null = null;
      if (isThreePieceSet) {
        if (count < 3) nextThreshold = 3;
      } else {
        if (count < 2) nextThreshold = 2;
        else if (count < 5) nextThreshold = 5;
      }

      return {
        element,
        setName,
        count,
        colors,
        bonuses,
        nextThreshold,
        isComplete: isThreePieceSet ? count >= 3 : count >= 5
      };
    });
  }, [sets]);

  if (sets.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {setDisplays.map(({ element, setName, count, colors, bonuses, nextThreshold, isComplete }) => (
        <div
          key={element}
          className={`flex flex-col gap-1 rounded-lg border px-3 py-2 ${colors.bg} ${colors.border}`}
        >
          {/* Set Name and Count */}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${colors.text}`}>
              {setName}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
              {count}pc
            </span>
            {isComplete && (
              <span className="text-xs text-green-400">(Max)</span>
            )}
          </div>

          {/* Active Bonuses */}
          {bonuses.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {bonuses.map((bonus, idx) => (
                <span key={idx} className="text-xs text-text-primary/80">
                  {bonus}
                </span>
              ))}
            </div>
          )}

          {/* Progress to next bonus */}
          {nextThreshold && (
            <span className="text-xs text-text-primary/50">
              {nextThreshold - count} more for {nextThreshold}pc bonus
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

export default SetBonusDisplay;
