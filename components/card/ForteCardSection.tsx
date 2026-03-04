'use client';

import React from 'react';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { Character, I18nString } from '@/lib/character';
import { ForteState } from '@/lib/build';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { SKILL_BRANCHES } from '@/lib/constants/skillBranches';
import { resolveTemplateFromValues, stripGameMarkup } from '@/lib/text/gameText';

const BRANCH_MOVE_TYPE: Record<string, number> = {
  'normal-attack': 1,
  skill: 2,
  liberation: 3,
  intro: 5,
  circuit: 6,
};

interface ForteCardSectionProps {
  character: Character;
  forte: ForteState;
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
}

interface NodeBadgeProps {
  icon: string;
  active: boolean;
  isCircuit: boolean;
  alt: string;
  hoverKey: StatHoverKey | null;
  activeHoverStat: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
}

const NodeBadge: React.FC<NodeBadgeProps> = ({
  icon,
  active,
  isCircuit,
  alt,
  hoverKey,
  activeHoverStat,
  onHoverStatChange,
}) => {
  if (!icon) return <div className="h-6 w-6 shrink-0" />;
  const hasActiveHover = Boolean(activeHoverStat);
  const isMatch = Boolean(activeHoverStat && hoverKey && activeHoverStat === hoverKey);
  const interactionClass = !hasActiveHover
    ? ''
    : isMatch
      ? 'opacity-100 ring-1 ring-white/34 shadow-[0_0_10px_rgba(255,255,255,0.22)]'
      : 'opacity-45 brightness-90';

  return (
    <div
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center border bg-background-secondary transition-all duration-200 ${isCircuit ? '' : 'rounded-full'} ${active ? 'border-black/60 bg-white shadow-[0_0_8px_rgba(255,255,255,0.45)]' : 'border-white/30'} ${interactionClass} ${hoverKey ? 'cursor-pointer' : ''}`}
      onMouseEnter={hoverKey ? () => onHoverStatChange?.(hoverKey) : undefined}
      onMouseLeave={hoverKey ? () => onHoverStatChange?.(null) : undefined}
    >
      {isCircuit && (
        <div className={`pointer-events-none absolute h-[70%] w-[70%] rotate-45 border ${active ? 'border-black/60 bg-white' : 'border-white/35 bg-background-secondary'}`} />
      )}
      <img
        src={icon}
        alt={alt}
        className={`z-10 h-4 w-4 object-contain brightness-0 ${active ? '' : 'opacity-45'}`}
      />
    </div>
  );
};

export const ForteCardSection: React.FC<ForteCardSectionProps> = ({
  character,
  forte,
  activeHoverStat = null,
  onHoverStatChange,
}) => {
  const { t } = useLanguage();
  const characterName = t(character.nameI18n ?? { en: character.name });
  const resolveLocalizedText = (value: I18nString | string | undefined): string => {
    if (!value) return '';
    return typeof value === 'string' ? value : t(value);
  };
  const getLevelValue = (values: string[] | undefined, level: number): string | null => {
    if (!Array.isArray(values) || values.length === 0) return null;
    const index = Math.max(0, Math.min(9, level - 1));
    return values[index] ?? values[values.length - 1] ?? null;
  };

  return (
    <div className="flex justify-center gap-8 ">
      {SKILL_BRANCHES.map((branch, i) => {
        const [level, topActive, midActive] = forte[i];
        const isMaxLevel = level >= 10;
        const skillIcon = character.skillIcons?.[branch.skillKey] ?? character.elementIcon ?? '';
        const isCircuit = branch.treeKey === 'tree3';
        const topNodeIcon = isCircuit
          ? (character.skillIcons?.['inherent-1'] ?? character.forteNodes?.['tree3.top']?.icon ?? '')
          : (character.forteNodes?.[`${branch.treeKey}.top`]?.icon ?? '');
        const midNodeIcon = isCircuit
          ? (character.skillIcons?.['inherent-2'] ?? character.forteNodes?.['tree3.middle']?.icon ?? '')
          : (character.forteNodes?.[`${branch.treeKey}.middle`]?.icon ?? '');
        const topNodeName = character.forteNodes?.[`${branch.treeKey}.top`]?.name ?? '';
        const midNodeName = character.forteNodes?.[`${branch.treeKey}.middle`]?.name ?? '';
        const topNodeHoverKey = normalizeStatHoverKey(topNodeName);
        const midNodeHoverKey = normalizeStatHoverKey(midNodeName);
        const bottomInteractionClass = !activeHoverStat
          ? ''
          : 'opacity-45 brightness-90';
        const branchMoveType = BRANCH_MOVE_TYPE[branch.skillKey];
        const move = character.moves?.find((entry) => entry.type === branchMoveType);
        const selectedLevel = Math.max(1, Math.min(10, level));
        const moveName = stripGameMarkup(resolveLocalizedText(move?.name));
        const moveDescription = stripGameMarkup(resolveLocalizedText(move?.description));
        const selectedMoveValues = (move?.values ?? [])
          .map((valueEntry) => ({
            id: valueEntry.id,
            name: stripGameMarkup(resolveLocalizedText(valueEntry.name)),
            value: getLevelValue(valueEntry.values, selectedLevel),
          }))
          .filter((entry) => entry.name || entry.value);
        const descriptionParams = (move?.descriptionParams ?? []).map((value) => String(value));
        const fallbackParams = selectedMoveValues.map((entry) => entry.value);
        const tooltipContent = move ? (
          <div className="font-plus-jakarta text-white/90">
            {skillIcon ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{characterName}</p>
                  <p className="mt-1 text-base font-semibold text-white/96">{moveName || branch.skillName}</p>
                </div>
                <div className="row-span-2 flex min-h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-white/18 bg-black/35 shadow-[0_8px_18px_rgba(0,0,0,0.25)]">
                  <img src={skillIcon} alt={branch.skillName} className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <span className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-white/88">{branch.skillName}</span>
                  <span className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-white/88">Lv.{selectedLevel}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{characterName}</p>
                  <p className="mt-1 text-base font-semibold text-white/96">{moveName || branch.skillName}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <span className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-white/88">{branch.skillName}</span>
                  <span className="rounded-md border border-white/15 bg-black/35 px-2 py-1 text-white/88">Lv.{selectedLevel}</span>
                </div>
              </div>
            )}
            {moveDescription && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/86">
                {resolveTemplateFromValues({
                  template: moveDescription,
                  values: descriptionParams.length > 0 ? descriptionParams : fallbackParams,
                  keepUnknownPlaceholders: true,
                  highlightClassName: 'text-cyan-200 font-semibold',
                })}
              </p>
            )}
            {selectedMoveValues.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {selectedMoveValues.map((entry) => (
                  <div key={`${move.id}-${entry.id}`} className="rounded-md border border-white/12 bg-black/25 px-2 py-1.5">
                    <p className="text-xs font-semibold text-amber-100/90">{entry.name || branch.skillName}</p>
                    {entry.value && (
                      <p className="mt-0.5 text-sm font-semibold text-cyan-200">{entry.value}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null;

        return (
          <div key={branch.skillKey} className="flex shrink-0 flex-col items-center justify-end gap-0.5">
            <NodeBadge
              icon={topNodeIcon}
              active={topActive}
              isCircuit={isCircuit}
              alt={`${branch.skillName} top node`}
              hoverKey={topNodeHoverKey}
              activeHoverStat={activeHoverStat}
              onHoverStatChange={onHoverStatChange}
            />

            <div className="-my-0.5 h-1.5 w-px shrink-0 bg-white/28" />

            <NodeBadge
              icon={midNodeIcon}
              active={midActive}
              isCircuit={isCircuit}
              alt={`${branch.skillName} middle node`}
              hoverKey={midNodeHoverKey}
              activeHoverStat={activeHoverStat}
              onHoverStatChange={onHoverStatChange}
            />

            <div className="-my-0.5 h-2.5 w-px shrink-0 bg-white/28" />

            {/* Skill icon frame + level bubble below */}
            <HoverTooltip
              content={tooltipContent}
              disabled={!move}
              placement="right"
              maxWidthClassName="max-w-96"
              pinViewportBottom
            >
              <div className={`flex flex-col items-center rounded-sm transition-all duration-200 ${bottomInteractionClass}`}>
                <div className="flex h-8 w-8 rotate-45 items-center justify-center rounded-sm border border-black/60 bg-white shadow-[0_0_10px_rgba(255,255,255,0.55)] transition-all duration-200">
                  {skillIcon && (
                    <img src={skillIcon} alt={branch.skillName} className="h-5 w-5 -rotate-45 object-contain brightness-0" />
                  )}
                </div>
                <span
                  className={`flex h-5 w-8 items-center justify-center rounded-full border text-xs font-bold leading-none tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.45)] z-2 transition-all duration-200 ${
                    isMaxLevel
                      ? 'border-amber-300/55 bg-amber-300/92 text-[#4a3400]'
                      : 'border-black/35 bg-black/55 text-white/92'
                  }`}
                >
                  {level}
                </span>
              </div>
            </HoverTooltip>
          </div>
        );
      })}
    </div>
  );
};
