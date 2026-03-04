'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Weapon } from '@/lib/weapon';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';
import { StatHoverKey } from '@/lib/constants/statHover';
import { HoverTooltip } from '@/components/ui/HoverTooltip';
import { renderTemplateWithHighlights, stripGameMarkup } from '@/lib/text/gameText';

interface WeaponGroupProps {
  weapon: Weapon;
  weaponStats: {
    scaledAtk: number;
    scaledMainStat: number;
  };
  weaponLevel: number;
  weaponRank: number;
  weaponAtkIcon?: string | null;
  weaponMainIcon?: string | null;
  activeHoverStat?: StatHoverKey | null;
  onHoverStatChange?: (next: StatHoverKey | null) => void;
  weaponAtkHoverKey?: StatHoverKey | null;
  weaponMainHoverKey?: StatHoverKey | null;
  weaponPassiveHoverMatch?: boolean;
}

export const WeaponGroup: React.FC<WeaponGroupProps> = ({
  weapon,
  weaponStats,
  weaponLevel,
  weaponRank,
  weaponAtkIcon,
  weaponMainIcon,
  activeHoverStat = null,
  onHoverStatChange,
  weaponAtkHoverKey = null,
  weaponMainHoverKey = null,
  weaponPassiveHoverMatch = false,
}) => {
  const { t } = useLanguage();
  const translatedWeaponName = t(weapon.nameI18n ?? { en: weapon.name });
  const translatedMainStatName = t(weapon.mainStatI18n ?? { en: weapon.main_stat });
  const translatedPassiveName = t(weapon.effectName ?? { en: '' });
  const passiveTemplate = stripGameMarkup(t(weapon.effect ?? { en: '' }));
  const rarityStyle = RARITY_ACCENTS[weapon.rarity];
  const hasActiveHover = Boolean(activeHoverStat);
  const rankIndex = Math.max(0, Math.min(4, Math.floor(weaponRank || 1) - 1));
  const renderedPassiveText = renderTemplateWithHighlights({
    template: passiveTemplate,
    getParamValue: (paramIndex) => {
      const slotValues = weapon.params?.[String(paramIndex)];
      if (!slotValues || slotValues.length === 0) return null;
      return slotValues[Math.min(rankIndex, slotValues.length - 1)] ?? null;
    },
    highlightClassName: 'text-cyan-200 font-semibold',
    keepUnknownPlaceholders: true,
  });

  const getChipClass = (hoverKey: StatHoverKey | null): string => {
    if (!hasActiveHover) return '';
    if (hoverKey && activeHoverStat === hoverKey) {
      return 'opacity-100 bg-white/14 ring-1 ring-white/32 shadow-[0_0_10px_rgba(255,255,255,0.24)]';
    }
    return 'opacity-45 brightness-90';
  };
  const nameInteractionClass = !hasActiveHover
    ? ''
    : weaponPassiveHoverMatch
      ? 'opacity-100'
      : 'opacity-45 brightness-90';

  return (
    <div className="flex items-center gap-2">
      <HoverTooltip
        placement="right"
        maxWidthClassName="max-w-[28rem]"
        content={(
          <div className="font-plus-jakarta text-white/90">
            <p className="text-[1.04rem] font-semibold leading-tight text-white/96">
              {translatedWeaponName || weapon.name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-semibold">
              <span className="rounded-md border border-white/18 bg-black/45 px-2 py-0.5 text-white/90">
                Lv.{weaponLevel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-white/18 bg-black/45 px-2 py-0.5 text-white/88">
                {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-4 w-4 object-contain" />}
                {weaponStats.scaledAtk}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-white/18 bg-black/45 px-2 py-0.5 text-white/88">
                {weaponMainIcon && <img src={weaponMainIcon} alt={translatedMainStatName} className="h-4 w-4 object-contain" />}
                {translatedMainStatName} {weaponStats.scaledMainStat}%
              </span>
            </div>
            {(translatedPassiveName || passiveTemplate) && (
              <p className="mt-2 text-sm font-semibold text-white/95">
                {translatedPassiveName || 'Passive'} <span className="text-white/68">R{weaponRank}</span>
              </p>
            )}
            {passiveTemplate && (
              <p className="mt-1 whitespace-pre-line text-[0.92rem] leading-relaxed text-white/86">
                {renderedPassiveText}
              </p>
            )}
          </div>
        )}
      >
        <div className={`relative flex h-30 w-30 items-center justify-center overflow-hidden rounded-xl border shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-all duration-200 ${weaponPassiveHoverMatch ? 'brightness-110 saturate-110' : ''} ${rarityStyle?.border ?? 'border-white/28'} ${rarityStyle?.bg ?? 'bg-black/20'}`}>
          <img
            src={weapon.iconUrl}
            alt={translatedWeaponName || weapon.name}
            className="h-full w-full object-contain"
          />
          {weaponPassiveHoverMatch && (
            <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-cyan-200/90 shadow-[inset_0_0_12px_rgba(110,255,255,0.22),0_0_14px_rgba(110,255,255,0.45)]" />
          )}
        </div>
      </HoverTooltip>
      <div className="flex flex-col gap-1.5">
        <span className={`truncate text-2xl font-semibold leading-tight text-white/95 transition-all duration-200 ${nameInteractionClass}`}>
          {translatedWeaponName || weapon.name}
        </span>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-all duration-200 ${getChipClass(weaponAtkHoverKey)}`}
            onMouseEnter={weaponAtkHoverKey ? () => onHoverStatChange?.(weaponAtkHoverKey) : undefined}
            onMouseLeave={weaponAtkHoverKey ? () => onHoverStatChange?.(null) : undefined}
          >
            {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-5 w-5 object-contain" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledAtk}</span>
          </div>
          <div
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-all duration-200 ${getChipClass(weaponMainHoverKey)}`}
            onMouseEnter={weaponMainHoverKey ? () => onHoverStatChange?.(weaponMainHoverKey) : undefined}
            onMouseLeave={weaponMainHoverKey ? () => onHoverStatChange?.(null) : undefined}
          >
            {weaponMainIcon && <img src={weaponMainIcon} alt={weapon.main_stat} className="h-5 w-5 object-contain" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledMainStat}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-sm font-medium leading-none text-white/78">
          <span className="rounded-md border border-white/18 bg-black/40 px-3 py-1.5">
            Lv.{weaponLevel}
          </span>
          <span className="rounded-md border border-white/22 bg-black/40 px-3 py-1.5">
            R{weaponRank}
          </span>
        </div>
      </div>
    </div>
  );
};
