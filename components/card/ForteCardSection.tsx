'use client';

import React, { ReactNode } from 'react';
import { HoverCard, HoverCardIcon, HoverCardSection, HoverCardDescription, HoverCardChipModel } from '@/components/ui/HoverCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Character, I18nString } from '@/lib/character';
import { ForteState } from '@/lib/build';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { SKILL_BRANCHES } from '@/lib/constants/skillBranches';
import { resolveGameTemplateFromValues, stripGameMarkup } from '@/lib/text/gameText';

const BRANCH_MOVE_TYPE: Record<string, number> = {
  'normal-attack': 1,
  skill: 2,
  liberation: 3,
  intro: 5,
  circuit: 6,
};
type MoveEntry = NonNullable<Character['moves']>[number];

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

  if (isCircuit) {
    return (
      <div
        className={`relative flex h-7 w-7 shrink-0 items-center justify-center transition-all duration-200 ${interactionClass} ${hoverKey ? 'cursor-pointer' : ''}`}
        onMouseEnter={hoverKey ? () => onHoverStatChange?.(hoverKey) : undefined}
        onMouseLeave={hoverKey ? () => onHoverStatChange?.(null) : undefined}
      >
        <div
          className={`flex h-6 w-6 rotate-45 items-center justify-center rounded-sm border transition-all duration-200 ${
            active
              ? 'border-black/60 bg-white shadow-[0_0_8px_rgba(255,255,255,0.45)]'
              : 'border-white/30 bg-background-secondary'
          }`}
        >
          <img
            src={icon}
            alt={alt}
            className={`h-4.5 w-4.5 -rotate-45 object-contain brightness-0 ${active ? '' : 'opacity-45'}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background-secondary transition-all duration-200 ${active ? 'border-black/60 bg-white shadow-[0_0_8px_rgba(255,255,255,0.45)]' : 'border-white/30'} ${interactionClass} ${hoverKey ? 'cursor-pointer' : ''}`}
      onMouseEnter={hoverKey ? () => onHoverStatChange?.(hoverKey) : undefined}
      onMouseLeave={hoverKey ? () => onHoverStatChange?.(null) : undefined}
    >
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
  const inherentMoves = React.useMemo(
    () => ([...(character.moves ?? [])]
      .filter((entry) => entry.type === 4)
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))),
    [character.moves]
  );
  const resolveLocalizedText = (value: I18nString | string | undefined): string => {
    if (!value) return '';
    return typeof value === 'string' ? value : t(value);
  };
  const getLevelValue = (values: string[] | undefined, level: number): string | null => {
    if (!Array.isArray(values) || values.length === 0) return null;
    const index = Math.max(0, Math.min(9, level - 1));
    return values[index] ?? values[values.length - 1] ?? null;
  };
  type SkillCardOptions = {
    icon: string;
    label: string;
    level: number;
    fallbackTitle: string;
    showLevelChip?: boolean;
  };

  const buildMoveCard = (
    move: MoveEntry | undefined,
    options: SkillCardOptions,
    trigger: ReactNode,
    placement: 'right' | 'left' | 'top' | 'bottom' = 'right'
  ): ReactNode => {
    if (!move) return trigger;

    const level = Math.max(1, Math.min(10, options.level));
    const moveName = stripGameMarkup(resolveLocalizedText(move.name));
    const moveDescription = resolveLocalizedText(move.description);
    const plainMoveDescription = stripGameMarkup(moveDescription);
    const selectedMoveValues = (move.values ?? [])
      .map((valueEntry) => ({
        id: valueEntry.id,
        name: stripGameMarkup(resolveLocalizedText(valueEntry.name)),
        value: getLevelValue(valueEntry.values, level),
      }))
      .filter((entry) => entry.name || entry.value);
    const descriptionParams = (move.descriptionParams ?? []).map((value) => String(value));
    const fallbackParams = selectedMoveValues.map((entry) => entry.value);

    const cardIcon = options.icon ? (
      <HoverCardIcon
        src={options.icon}
        alt={options.label}
        borderClass="border-white/24"
        bgClass="bg-black/45"
      />
    ) : undefined;

    const chips: HoverCardChipModel[] = [{ label: options.label }];
    if (options.showLevelChip !== false) {
      chips.push({ label: `Lv.${level}` });
    }

    const body = (
      <>
        {plainMoveDescription && (
          <HoverCardDescription>
            {resolveGameTemplateFromValues({
              template: moveDescription,
              values: descriptionParams.length > 0 ? descriptionParams : fallbackParams,
              keepUnknownPlaceholders: true,
              highlightClassName: 'text-cyan-200 font-semibold',
            })}
          </HoverCardDescription>
        )}
        {selectedMoveValues.length > 0 && (
          <div className="space-y-1.5">
            {selectedMoveValues.map((entry) => (
              <HoverCardSection
                key={`${move.id}-${entry.id}`}
                variant="inset"
                eyebrow={entry.name || options.fallbackTitle}
              >
                {entry.value && (
                  <p className="text-sm font-semibold text-cyan-200">{entry.value}</p>
                )}
              </HoverCardSection>
            ))}
          </div>
        )}
      </>
    );

    return (
      <HoverCard
        placement={placement}
        icon={cardIcon}
        eyebrow={characterName}
        title={moveName || options.fallbackTitle}
        chips={chips}
        body={body}
      >
        {trigger}
      </HoverCard>
    );
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
        const topInherentMove = isCircuit ? inherentMoves[0] : undefined;
        const midInherentMove = isCircuit ? inherentMoves[1] : undefined;

        const topNode = (
          <NodeBadge
            icon={topNodeIcon}
            active={topActive}
            isCircuit={isCircuit}
            alt={`${branch.skillName} top node`}
            hoverKey={topNodeHoverKey}
            activeHoverStat={activeHoverStat}
            onHoverStatChange={onHoverStatChange}
          />
        );
        const midNode = (
          <NodeBadge
            icon={midNodeIcon}
            active={midActive}
            isCircuit={isCircuit}
            alt={`${branch.skillName} middle node`}
            hoverKey={midNodeHoverKey}
            activeHoverStat={activeHoverStat}
            onHoverStatChange={onHoverStatChange}
          />
        );
        const skillButton = (
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
        );

        return (
          <div key={branch.skillKey} className="flex shrink-0 flex-col items-center justify-end gap-0.5">
            {isCircuit && topInherentMove
              ? buildMoveCard(topInherentMove, {
                  icon: topNodeIcon,
                  label: 'Inherent Skill',
                  level: 1,
                  fallbackTitle: topNodeName || 'Inherent Skill',
                  showLevelChip: false,
                }, topNode)
              : topNode}

            <div className="-my-0.5 h-1.5 w-px shrink-0 bg-white/28" />

            {isCircuit && midInherentMove
              ? buildMoveCard(midInherentMove, {
                  icon: midNodeIcon,
                  label: 'Inherent Skill',
                  level: 1,
                  fallbackTitle: midNodeName || 'Inherent Skill',
                  showLevelChip: false,
                }, midNode)
              : midNode}

            <div className="-my-0.5 h-2.5 w-px shrink-0 bg-white/28" />

            {buildMoveCard(move, {
              icon: skillIcon,
              label: branch.skillName,
              level: selectedLevel,
              fallbackTitle: branch.skillName,
            }, skillButton)}
          </div>
        );
      })}
    </div>
  );
};
