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
    <div className={`flex items-center gap-4 rounded-xl border px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${rarityStyle.border} ${rarityStyle.bg}`}>
      <img
        src={weapon.iconUrl}
        alt={translatedWeaponName || weapon.name}
        className="h-16 w-16 shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.65)]"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="truncate pr-1 text-lg font-semibold leading-tight text-white/95">
          {translatedWeaponName || weapon.name}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-4 w-4 object-contain" />}
            <span className="text-sm font-medium text-white/88">{weaponStats.scaledAtk}</span>
          </div>
          <div className="flex items-center gap-1">
            {weaponMainIcon && <img src={weaponMainIcon} alt={weapon.main_stat} className="h-4 w-4 object-contain" />}
            <span className="text-sm font-medium text-white/88">{weaponStats.scaledMainStat}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-white/20 bg-black/45 px-2.5 py-1 text-xs font-medium leading-none text-white/74">
            Lv.{weaponLevel}
          </span>
          <span className="rounded-md border border-white/25 bg-black/45 px-2.5 py-1 text-xs font-semibold leading-none text-white/82">
            R{weaponRank}
          </span>
        </div>
      </div>
    </div>
  );
};
