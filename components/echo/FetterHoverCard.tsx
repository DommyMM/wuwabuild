'use client';

import type { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { CDNFetter } from '@/lib/echo';
import { getSetBonusesFromPieceEffect } from '@/lib/constants/setBonuses';
import { FetterPieceEffect, resolveFetterPieceDescription } from '@/lib/text/gameText';
import { HoverCard, HoverCardIcon, HoverCardSection, HoverCardBonusList } from '@/components/ui/HoverCard';
import type { HoverCardPlacement } from '@/components/ui/HoverCard';

interface FetterHoverCardProps {
  children: ReactNode;
  fetter: CDNFetter;
  placement?: HoverCardPlacement;
  triggerClassName?: string;
}

type PieceTooltipModel = {
  pieceCount: number;
  effect: FetterPieceEffect;
};

export const formatFetterBonusValue = (value: number): string => (
  Number.isInteger(value)
    ? String(Math.trunc(value))
    : value.toFixed(1).replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '')
);

// Piece-effect entries for a set (2pc/5pc, or the single 3pc tier), sorted by
// piece count. Shared with surfaces that inline the set text (echo inventory).
export const getFetterPieceModels = (fetter: CDNFetter): PieceTooltipModel[] => {
  const entries: PieceTooltipModel[] = [];
  const pieceEffects = fetter.pieceEffects ?? {};
  for (const [pieceCountText, pieceEffect] of Object.entries(pieceEffects)) {
    const pieceCount = Number(pieceCountText);
    if (!Number.isFinite(pieceCount) || !pieceEffect) continue;
    entries.push({ pieceCount, effect: pieceEffect });
  }

  if (entries.length === 0) {
    entries.push({
      pieceCount: fetter.pieceCount,
      effect: {
        pieceCount: fetter.pieceCount,
        fetterId: fetter.fetterId,
        addProp: fetter.addProp,
        buffIds: fetter.buffIds,
        effectDescription: fetter.effectDescription,
        effectDescriptionParam: fetter.effectDescriptionParam,
      },
    });
  }

  entries.sort((a, b) => a.pieceCount - b.pieceCount);

  if (fetter.pieceCount === 3) {
    return entries.filter((entry) => entry.pieceCount === 3);
  }

  const standardEntries = entries.filter((entry) => entry.pieceCount === 2 || entry.pieceCount === 5);
  return standardEntries.length > 0 ? standardEntries : entries;
};

export function FetterHoverCard({
  children,
  fetter,
  placement = 'right',
  triggerClassName,
}: FetterHoverCardProps) {
  const { t } = useLanguage();
  const { statTranslations } = useGameData();
  const pieceModels = getFetterPieceModels(fetter);

  const icon = (
    <HoverCardIcon
      src={fetter.icon}
      alt={t(fetter.name)}
      borderClass="border-white/24"
      bgClass="bg-black/45"
    />
  );

  const body = (
    <>
      {pieceModels.map(({ pieceCount, effect }) => {
        const pieceBonuses = getSetBonusesFromPieceEffect(effect);
        const renderBonuses = pieceBonuses.length > 0 && (effect.buffIds?.length ?? 0) === 0;
        const { renderedParts } = resolveFetterPieceDescription(effect, {
          descriptionTemplate: t(effect.effectDescription),
        });

        return (
          <HoverCardSection
            key={`${fetter.id}-${pieceCount}`}
            variant="inset"
            eyebrow={`${pieceCount}-Piece`}
          >
            {renderBonuses ? (
              <HoverCardBonusList
                items={pieceBonuses.map((bonus) => ({
                  name: statTranslations?.[bonus.stat] ? t(statTranslations[bonus.stat]) : bonus.stat,
                  value: formatFetterBonusValue(bonus.value),
                  prefix: '+',
                }))}
              />
            ) : (
              <p className="whitespace-pre-line">{renderedParts}</p>
            )}
          </HoverCardSection>
        );
      })}
    </>
  );

  return (
    <HoverCard
      placement={placement}
      triggerClassName={triggerClassName}
      icon={icon}
      title={t(fetter.name)}
      subtitle="Sonata Effect"
      body={body}
    >
      {children}
    </HoverCard>
  );
}
