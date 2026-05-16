'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Weapon, WeaponRarity } from '@/lib/weapon';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';

interface WeaponHoverContentProps {
  weapon: Weapon;
  weaponLevel: number;
  weaponRank: number;
  scaledAtk: number;
  scaledMainStat: number;
  atkIcon?: string | null;
  mainStatIcon?: string | null;
}

const RARITY_TO_STARS: Record<WeaponRarity, number> = {
  '5-star': 5,
  '4-star': 4,
  '3-star': 3,
  '2-star': 2,
  '1-star': 1,
};

export const WeaponHoverContent: React.FC<WeaponHoverContentProps> = ({
  weapon,
  weaponLevel,
  weaponRank,
  scaledAtk,
  scaledMainStat,
  atkIcon,
  mainStatIcon,
}) => {
  const { t } = useLanguage();
  const weaponName = t(weapon.nameI18n ?? { en: weapon.name });
  const passiveName = t(weapon.effectName ?? { en: '' });
  const passiveTemplate = t(weapon.effect ?? { en: '' });
  const mainStatName = t(weapon.mainStatI18n ?? { en: weapon.main_stat ?? '' });
  const rarityStyle = RARITY_ACCENTS[weapon.rarity];
  const starCount = RARITY_TO_STARS[weapon.rarity] ?? 0;
  const rankIndex = Math.max(0, Math.min(4, Math.floor(weaponRank || 1) - 1));
  const renderedPassive = renderGameTemplateWithHighlights({
    template: passiveTemplate,
    getParamValue: (paramIndex) => {
      const slotValues = weapon.params?.[String(paramIndex)];
      if (!slotValues?.length) return null;
      return slotValues[Math.min(rankIndex, slotValues.length - 1)] ?? null;
    },
    highlightClassName: 'text-cyan-200 font-semibold',
    keepUnknownPlaceholders: true,
  });

  return (
    <div className="font-plus-jakarta w-80 text-white/90">
      <div className="flex items-start gap-3">
        <div
          className={`relative -mt-1 flex h-22 w-22 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${rarityStyle?.border ?? 'border-white/28'} ${rarityStyle?.bg ?? 'bg-black/30'} shadow-[0_8px_18px_rgba(0,0,0,0.45)]`}
        >
          <img
            src={weapon.iconUrl}
            alt={weaponName || weapon.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
          {starCount > 0 && (
            <div className="pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-px leading-none [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]">
              {Array.from({ length: starCount }).map((_, i) => (
                <span key={i} className="text-[10px] text-amber-400">★</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col">
          <p className="text-base font-semibold leading-tight text-white/96">
            {weaponName || weapon.name}
          </p>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/65">
            {weapon.rarity} {weapon.type}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-white/65">
              Lv {weaponLevel}
            </span>
            <span className="flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-0.5">
              {atkIcon && (
                <img src={atkIcon} alt="ATK" className="h-3.5 w-3.5 object-contain" />
              )}
              <span className="font-semibold text-white/90">{scaledAtk}</span>
            </span>
            {weapon.main_stat && (
              <span className="flex items-center gap-1 rounded-md border border-white/10 bg-black/30 px-2 py-0.5">
                {mainStatIcon && (
                  <img
                    src={mainStatIcon}
                    alt={mainStatName}
                    className="h-3.5 w-3.5 object-contain"
                  />
                )}
                <span className="font-semibold text-white/90">{scaledMainStat}%</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {passiveName && (
        <p className="mt-2.5 text-sm font-semibold text-white/95">
          {passiveName}
          <span className="ml-1 text-orange-400">R{weaponRank}</span>
        </p>
      )}

      {passiveTemplate && (
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/86">
          {renderedPassive}
        </p>
      )}
    </div>
  );
};
