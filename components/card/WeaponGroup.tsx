'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Weapon } from '@/lib/weapon';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';
import { StatHoverKey } from '@/lib/constants/statHover';

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
  const rarityStyle = RARITY_ACCENTS[weapon.rarity];
  const hasActiveHover = Boolean(activeHoverStat);

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
    <div className="flex items-center gap-3">
      <WeaponHoverCard
        placement="right"
        weapon={weapon}
        weaponLevel={weaponLevel}
        weaponRank={weaponRank}
        scaledAtk={weaponStats.scaledAtk}
        scaledMainStat={weaponStats.scaledMainStat}
        atkIcon={weaponAtkIcon}
        mainStatIcon={weaponMainIcon}
      >
        <div className={`relative flex h-30 w-30 items-center justify-center overflow-hidden rounded-xl border shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-all duration-200 ${rarityStyle?.border ?? 'border-white/28'} ${rarityStyle?.bg ?? 'bg-black/20'}`}>
          <img
            src={weapon.iconUrl}
            alt={translatedWeaponName || weapon.name}
            className={`h-full w-full object-contain transition-transform duration-200 ${
              weaponPassiveHoverMatch ? 'card-stat-source-art scale-[1.06]' : ''
            }`}
            loading="lazy"
          />
        </div>
      </WeaponHoverCard>
      <div className="flex min-w-0 flex-col justify-center gap-1.5">
        <span className={`truncate text-2xl font-semibold leading-tight text-white/95 transition-all duration-200 ${nameInteractionClass}`}>
          {translatedWeaponName || weapon.name}
        </span>
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 transition-all duration-200 ${getChipClass(weaponAtkHoverKey)}`}
            onMouseEnter={weaponAtkHoverKey ? () => onHoverStatChange?.(weaponAtkHoverKey) : undefined}
            onMouseLeave={weaponAtkHoverKey ? () => onHoverStatChange?.(null) : undefined}
          >
            {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-5 w-5 object-contain" loading="lazy" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledAtk}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 transition-all duration-200 ${getChipClass(weaponMainHoverKey)}`}
            onMouseEnter={weaponMainHoverKey ? () => onHoverStatChange?.(weaponMainHoverKey) : undefined}
            onMouseLeave={weaponMainHoverKey ? () => onHoverStatChange?.(null) : undefined}
          >
            {weaponMainIcon && <img src={weaponMainIcon} alt={weapon.main_stat} className="h-5 w-5 object-contain" loading="lazy" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledMainStat}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium leading-none text-white/78">
          <span className="rounded-md border border-white/18 bg-black/40 px-2.5 py-1">
            Lv.{weaponLevel}
          </span>
          <span className="rounded-md border border-white/18 bg-black/40 px-2.5 py-1">
            R{weaponRank}
          </span>
        </div>
      </div>
    </div>
  );
};
