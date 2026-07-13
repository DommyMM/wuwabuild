'use client';

import React from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getSubstatTierInfo } from '@/lib/calculations/substatTiers';
import { isPercentStat } from '@/lib/constants/statMappings';
import { HoverCard } from '@/components/ui/HoverCard';
import { SubstatRollBar } from './StatTierBars';

/**
 * Two emphasis systems land on the same chips, so they get two different colors:
 *
 * - **gold** is the *selection* (persistent): the substats this build is judged on,
 *   seeded from the character's preferred stats and toggled on the summary row.
 * - **white** is the *cross-link* (transient): the stat row you are hovering in the
 *   card's stat table, which lights up every chip feeding it.
 *
 * Hover wins while it is active, then the selection state resumes.
 */
export type EchoChipState =
  | 'plain'     // nothing selected, nothing hovered
  | 'selected'  // in the selection
  | 'muted'     // a selection exists and this is not in it
  | 'hovered'   // feeds the stat currently being hovered
  | 'shaded';   // something is hovered and this is not it

export function resolveEchoChipState(
  { hasHover, isHoverMatch, hasSelection, isSelected }: {
    hasHover: boolean;
    isHoverMatch: boolean;
    hasSelection: boolean;
    isSelected: boolean;
  }
): EchoChipState {
  if (hasHover) return isHoverMatch ? 'hovered' : 'shaded';
  if (hasSelection) return isSelected ? 'selected' : 'muted';
  return 'plain';
}

interface ChipVisuals {
  className: string;
  style: React.CSSProperties;
  iconClassName: string;
  showsTierColor: boolean;
}

const PLAIN_PLATE = 'bg-black/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]';

export function getEchoChipVisuals(state: EchoChipState): ChipVisuals {
  switch (state) {
    case 'selected':
      return {
        className: 'opacity-100',
        style: {
          backgroundColor: 'rgba(255, 215, 0, 0.2)',
          boxShadow: '0 0 2px rgba(255, 215, 0, 0.30)',
        },
        iconClassName: 'brightness-125',
        showsTierColor: true,
      };
    case 'muted':
      return {
        className: `${PLAIN_PLATE} opacity-70`,
        style: {},
        iconClassName: '',
        showsTierColor: true,
      };
    case 'hovered':
      return {
        className: 'opacity-100',
        style: {
          backgroundColor: 'rgba(20, 20, 20, 0.74)',
          boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 0 10px rgba(255, 255, 255, 0.22)',
        },
        iconClassName: 'brightness-125',
        showsTierColor: true,
      };
    case 'shaded':
      return {
        className: `${PLAIN_PLATE} opacity-30`,
        style: {},
        iconClassName: '',
        showsTierColor: true,
      };
    default:
      return {
        className: `${PLAIN_PLATE} opacity-100`,
        style: {},
        iconClassName: '',
        showsTierColor: true,
      };
  }
}

const SIZE_CLASS = {
  sm: { row: 'gap-1 px-1.5 py-1 text-[13px]', icon: 'h-3. w-3.5' },
  md: { row: 'gap-1 px-1.5 py-1.5 text-base', icon: 'h-4.5 w-4.5' },
} as const;

interface EchoSubstatChipProps {
  statType: string;
  value: number;
  state?: EchoChipState;
  /** When false the roll-quality tier color is dropped and the value reads plain white. */
  showRollQuality?: boolean;
  size?: keyof typeof SIZE_CLASS;
  onHoverChange?: (isHovering: boolean) => void;
}

/**
 * One substat row on an echo panel. Tier quality is carried by the *text* color over a
 * neutral plate, so five stacked read as a column of numbers rather than a stack of
 * colored bars. Icon and value stay together as one semantic unit; row positions vary
 * between echoes, so distant right-alignment would not create a useful comparison
 * column. The hover card plots the roll against every value the substat could land on.
 */
export const EchoSubstatChip: React.FC<EchoSubstatChipProps> = ({
  statType,
  value,
  state = 'plain',
  showRollQuality = true,
  size = 'sm',
  onHoverChange,
}) => {
  const { statIcons, statTranslations, getSubstatValues } = useGameData();
  const { t } = useLanguage();

  const icon = statIcons?.[statType] ?? statIcons?.[statType.replace('%', '')] ?? '';
  const isPercent = isPercentStat(statType);
  const rollValues = getSubstatValues(statType);
  const label = statTranslations?.[statType] ? t(statTranslations[statType]) : statType;

  const visuals = getEchoChipVisuals(state);
  const tierInfo = showRollQuality && visuals.showsTierColor
    ? getSubstatTierInfo(value, rollValues)
    : null;
  const sizeClass = SIZE_CLASS[size];

  return (
    <HoverCard
      placement="right"
      width="md"
      triggerClassName="pointer-events-auto block w-full cursor-help"
      title={label}
      subtitle="Substat"
      body={(
        <SubstatRollBar
          rollValues={rollValues ?? []}
          currentValue={value}
          isPercent={isPercent}
        />
      )}
    >
      <div
        className={`flex w-full items-center rounded-sm font-semibold leading-none transition-all duration-200 ${sizeClass.row} ${visuals.className}`}
        style={{ ...(tierInfo ? { color: tierInfo.color } : {}), ...visuals.style }}
        onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
        onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
      >
        {icon ? (
          <img
            src={icon}
            alt=""
            className={`${sizeClass.icon} shrink-0 object-contain ${visuals.iconClassName}`}
          />
        ) : (
          <span className={`${sizeClass.icon} shrink-0 rounded bg-white/18`} />
        )}
        <span className="inline-flex h-3.5 items-center leading-none tabular-nums text-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
          {isPercent ? `${value.toFixed(1)}%` : Math.round(value)}
        </span>
      </div>
    </HoverCard>
  );
};
