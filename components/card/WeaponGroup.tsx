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

  return (
    <div className="flex items-center gap-2">
      <div className={`relative flex h-30 w-30 items-center justify-center overflow-hidden rounded-xl border shadow-[0_8px_18px_rgba(0,0,0,0.35)] ${rarityStyle?.border ?? 'border-white/28'} ${rarityStyle?.bg ?? 'bg-black/20'}`}>
        <img
          src={weapon.iconUrl}
          alt={translatedWeaponName || weapon.name}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="truncate text-2xl font-semibold leading-tight text-white/95">
          {translatedWeaponName || weapon.name}
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-5 w-5 object-contain" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledAtk}</span>
          </div>
          <div className="flex items-center gap-1">
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
