'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Weapon } from '@/lib/weapon';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';

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
}

export const WeaponGroup: React.FC<WeaponGroupProps> = ({
  weapon,
  weaponStats,
  weaponLevel,
  weaponRank,
  weaponAtkIcon,
  weaponMainIcon,
}) => {
  const { t } = useLanguage();
  const translatedWeaponName = t(weapon.nameI18n ?? { en: weapon.name });
  const rarityStyle = RARITY_ACCENTS[weapon.rarity];
  const starCount = Number.parseInt(weapon.rarity, 10) || 0;

  return (
    <div className={`flex items-center gap-5 rounded-2xl px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${rarityStyle.bg}`}>
      <img
        src={weapon.iconUrl}
        alt={translatedWeaponName || weapon.name}
        className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_6px_16px_rgba(0,0,0,0.65)]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: starCount }).map((_, index) => (
            <img
              key={`${weapon.id}-star-${index}`}
              src="/images/Star.png"
              alt="star"
              className="h-4 w-4 object-contain"
            />
          ))}
        </div>
        <span className="truncate pr-1 text-2xl font-semibold leading-tight text-white/95">
          {translatedWeaponName || weapon.name}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-5 w-5 object-contain" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledAtk}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {weaponMainIcon && <img src={weaponMainIcon} alt={weapon.main_stat} className="h-5 w-5 object-contain" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledMainStat}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-md border border-white/18 bg-black/40 px-3 py-1.5 text-sm font-medium leading-none text-white/78">
            Lv.{weaponLevel}
          </span>
          <span className="rounded-md border border-white/22 bg-black/40 px-3 py-1.5 text-sm font-semibold leading-none text-white/84">
            R{weaponRank}
          </span>
        </div>
      </div>
    </div>
  );
};
