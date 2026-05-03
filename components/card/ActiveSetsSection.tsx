'use client';

import React from 'react';
import { useStats } from '@/contexts/StatsContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { CDNFetter } from '@/lib/echo';
import { getSetBonusesFromFetter, getSetBonusesFromPieceEffect } from '@/lib/constants/setBonuses';
import { normalizeStatHoverKey, StatHoverKey } from '@/lib/constants/statHover';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { FetterPieceEffect, resolveFetterPieceDescription } from '@/lib/text/gameText';

interface ActiveSetsSectionProps {
  showCV?: boolean;
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
}

type PieceTooltipModel = {
  pieceCount: number;
  effect: FetterPieceEffect;
};

const getPieceLabel = (count: number, threshold: number): string => {
  if (threshold === 3) return '3';
  return count >= 5 ? '5' : '2';
};

const formatSetBonusValue = (value: number): string => (
  Number.isInteger(value)
    ? String(Math.trunc(value))
    : value.toFixed(1).replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '')
);

const getFetterPieceTooltipModels = (fetter: CDNFetter | undefined): PieceTooltipModel[] => {
  if (!fetter) return [];

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

export const ActiveSetsSection: React.FC<ActiveSetsSectionProps> = ({
  showCV = true,
  activeHoverStat = null,
}) => {
  const { stats } = useStats();
  const { fettersByElement, statTranslations } = useGameData();
  const { t } = useLanguage();
  const hasActiveSets = stats.activeSets.length > 0;
  const hasActiveHover = Boolean(activeHoverStat);

  if (!hasActiveSets && !showCV) return null;

  return (
    <div className="flex w-full min-w-0 gap-2 overflow-hidden pt-2 pl-4 text-sm font-semibold leading-none">
      {showCV && (
        <div className="flex shrink-0 items-center rounded-xl bg-black/35 p-1.5">
          <span className="rounded-md">
            {stats.cv.toFixed(1)} CV
          </span>
        </div>
      )}
      {stats.activeSets.map(({ element, count, setName }, index) => {
        const fetter = fettersByElement[element];
        const threshold = fetter?.pieceCount ?? 2;
        const pieceLabel = getPieceLabel(count, threshold);
        const displayName = fetter ? t(fetter.name) : setName;
        const isLastSet = index === stats.activeSets.length - 1;
        const setIcon = fetter?.icon ?? '';
        const setBonuses = getSetBonusesFromFetter(fetter, count);
        const setHoverMatch = Boolean(
          activeHoverStat && setBonuses.some((bonus) => normalizeStatHoverKey(bonus.stat) === activeHoverStat)
        );
        const interactionClass = !hasActiveHover
          ? ''
          : setHoverMatch
            ? 'opacity-100 ring-1 ring-white/34 bg-white/12 shadow-[0_0_10px_rgba(255,255,255,0.22)]'
            : 'opacity-45 brightness-90';
        const pieceModels = getFetterPieceTooltipModels(fetter);
        const tooltipContent = fetter ? (
          <div className="font-plus-jakarta text-white/90">
            <div className="flex items-center gap-2">
              {setIcon && <img src={setIcon} alt="" className="h-6 w-6 object-contain" />}
              <p className="text-base font-semibold text-white/96">
                {displayName}
              </p>
            </div>
            <div className="mt-2 space-y-2">
              {pieceModels.map((pieceModel) => {
                const pieceBonuses = getSetBonusesFromPieceEffect(pieceModel.effect);
                const shouldRenderNormalizedBonuses = pieceBonuses.length > 0 && (pieceModel.effect.buffIds?.length ?? 0) === 0;
                const localizedDescription = t(pieceModel.effect.effectDescription);
                const { renderedParts } = resolveFetterPieceDescription(pieceModel.effect, {
                  descriptionTemplate: localizedDescription,
                });
                return (
                  <div key={`${fetter.id}-${pieceModel.pieceCount}`} className="rounded-lg border border-white/12 bg-black/25 px-2.5 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                      {pieceModel.pieceCount}-Piece
                    </p>
                    {shouldRenderNormalizedBonuses ? (
                      <div className="mt-1 space-y-1">
                        {pieceBonuses.map((bonus, bonusIndex) => {
                          const localizedStatName = statTranslations?.[bonus.stat]
                            ? t(statTranslations[bonus.stat])
                            : bonus.stat;
                          return (
                            <p key={`${fetter.id}-${pieceModel.pieceCount}-${bonus.stat}-${bonusIndex}`} className="text-sm leading-relaxed text-white/86">
                              <span>{localizedStatName}</span>{' '}
                              <span className="text-cyan-200 font-semibold">+{formatSetBonusValue(bonus.value)}</span>
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/86">
                        {renderedParts}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null;

        return (
          <HoverTooltip
            key={`${element}-${count}`}
            content={tooltipContent}
            disabled={!fetter}
            placement="top"
          >
            <div
              className={`flex h-8 min-w-0 max-w-50 ${isLastSet ? 'shrink' : 'shrink-0'} items-center gap-2 rounded-xl bg-black/35 px-2 py-1 transition-all duration-200 ${interactionClass}`}
            >
              {setIcon && <img src={setIcon} alt={setIcon} className="h-5 w-5 shrink-0 object-contain" />}
              <span className={`min-w-0 text-center leading-none ${isLastSet ? 'whitespace-normal text-xs' : 'whitespace-nowrap text-sm'}`}>
                {displayName}
              </span>
              <span className="shrink-0 rounded-md border border-amber-300/55 bg-amber-300/18 px-1 text-xs">
                {pieceLabel}
              </span>
            </div>
          </HoverTooltip>
        );
      })}
    </div>
  );
};
