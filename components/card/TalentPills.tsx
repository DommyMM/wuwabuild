'use client';

import React from 'react';
import { ForteState } from '@/lib/build';
import { Character, I18nString } from '@/lib/character';
import {
  HoverCard,
  HoverCardIcon,
  HoverCardSection,
  HoverCardDescription,
  HoverCardChipModel,
} from '@/components/ui/HoverCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { resolveGameTemplateFromValues, stripGameMarkup } from '@/lib/text/gameText';

interface TalentPillsProps {
  character: Character;
  forte: ForteState;
  /** Max level for the "max" highlight; defaults to 10. */
  maxLevel?: number;
}

// Canonical column order: Normal · Skill · Circuit · Liberation · Intro.
// Maps to character.skillIcons keys.
const SKILL_KEYS: readonly ['normal-attack', 'skill', 'circuit', 'liberation', 'intro'] = [
  'normal-attack',
  'skill',
  'circuit',
  'liberation',
  'intro',
];

const SKILL_LABEL_FALLBACK: Readonly<Record<string, string>> = {
  'normal-attack': 'NA',
  skill: 'SK',
  circuit: 'FC',
  liberation: 'LB',
  intro: 'IN',
};

const BRANCH_MOVE_TYPE: Record<string, number> = {
  'normal-attack': 1,
  skill: 2,
  liberation: 3,
  intro: 5,
  circuit: 6,
};

const SKILL_LABEL: Record<string, string> = {
  'normal-attack': 'Normal Attack',
  skill: 'Resonance Skill',
  circuit: 'Forte Circuit',
  liberation: 'Resonance Liberation',
  intro: 'Intro Skill',
};

export const TalentPills: React.FC<TalentPillsProps> = ({ character, forte, maxLevel = 10 }) => {
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
    <div className="flex items-center gap-1.5">
      {SKILL_KEYS.map((key, idx) => {
        const level = forte[idx]?.[0] ?? 1;
        const isMax = level >= maxLevel;
        const icon = character.skillIcons?.[key] ?? character.elementIcon ?? '';

        const pill = (
          <div
            className={`inline-flex h-6.5 items-center gap-1 rounded-md border bg-black/35 pr-1.5 pl-0.5 ${
              isMax ? 'border-amber-300/55' : 'border-white/12'
            }`}
          >
            {icon ? (
              <img
                src={icon}
                alt={SKILL_LABEL_FALLBACK[key]}
                className={`h-5 w-5 object-contain ${isMax ? '' : 'opacity-80'}`}
              />
            ) : (
              <span className="grid h-4 w-4 place-items-center text-[9px] text-text-primary/40">
                {SKILL_LABEL_FALLBACK[key]}
              </span>
            )}
            <span
              className={`font-gowun text-[13px] leading-none tabular-nums ${
                isMax ? 'text-amber-200' : 'text-text-primary'
              }`}
            >
              {level}
            </span>
          </div>
        );

        const moveType = BRANCH_MOVE_TYPE[key];
        const move = character.moves?.find((m) => m.type === moveType);

        if (!move) {
          return <React.Fragment key={key}>{pill}</React.Fragment>;
        }

        const selectedLevel = Math.max(1, Math.min(10, level));
        const moveName = stripGameMarkup(resolveLocalizedText(move.name));
        const moveDescription = resolveLocalizedText(move.description);
        const plainMoveDescription = stripGameMarkup(moveDescription);
        const selectedMoveValues = (move.values ?? [])
          .map((valueEntry) => ({
            id: valueEntry.id,
            name: stripGameMarkup(resolveLocalizedText(valueEntry.name)),
            value: getLevelValue(valueEntry.values, selectedLevel),
          }))
          .filter((entry) => entry.name || entry.value);
        const descriptionParams = (move.descriptionParams ?? []).map((value) => String(value));
        const fallbackParams = selectedMoveValues.map((entry) => entry.value);

        const cardIcon = icon ? (
          <HoverCardIcon
            src={icon}
            alt={SKILL_LABEL[key] || key}
            borderClass="border-white/24"
            bgClass="bg-black/45"
          />
        ) : undefined;

        const chips: HoverCardChipModel[] = [{ label: SKILL_LABEL[key] || key }];
        chips.push({ label: `Lv.${selectedLevel}` });

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
                    eyebrow={entry.name || (SKILL_LABEL[key] || key)}
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
            key={key}
            placement="right"
            icon={cardIcon}
            eyebrow={characterName}
            title={moveName || (SKILL_LABEL[key] || key)}
            chips={chips}
            body={body}
          >
            {pill}
          </HoverCard>
        );
      })}
    </div>
  );
};

