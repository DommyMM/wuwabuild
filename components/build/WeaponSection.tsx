'use client';

import React from 'react';
import { Weapon } from '@/lib/weapon';
import { useGameData } from '@/contexts/GameDataContext';

interface WeaponSectionProps {
  weapon: Weapon;
  level: number;
  rank: number;
  scaledAtk: number;
  scaledMainStat: number;
}

const starCount = (rarity: string) => parseInt(rarity.charAt(0)) || 5;

export const WeaponSection: React.FC<WeaponSectionProps> = ({
  weapon, level, rank, scaledAtk, scaledMainStat,
}) => {
  const { statIcons } = useGameData();
  const stars = starCount(weapon.rarity);
  // weapon.main_stat uses "ER" but Stats.json keys it as "Energy Regen"
  const atkIcon = statIcons?.['ATK'];
  const mainStatIcon = statIcons?.[weapon.main_stat] ?? statIcons?.['Energy Regen'];

  return (
    <div className="flex flex-col rounded-xl border border-white/10 bg-white/4 backdrop-blur-[3px] overflow-hidden">
      {/* Weapon image, hero element */}
      <div className="relative w-full">
        <img
          src={weapon.iconUrl}
          alt={weapon.name}
          className="w-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
        />
      </div>

      {/* Info block */}
      <div className="flex flex-col gap-1.5 px-2 pb-2">
        {/* Stars */}
        <div className="flex">
          {Array.from({ length: stars }).map((_, i) => (
            <img key={i} src="/images/Star.png" alt="★" className="h-8 w-auto" />
          ))}
        </div>

        {/* Name */}
        <div className="text-white/90 text-[11px] font-semibold leading-tight line-clamp-2">
          {weapon.name}
        </div>

        {/* ATK + main stat in one row */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <img src={atkIcon} alt="ATK" className="h-3 w-3 object-contain" />
            <span className="text-white/80 text-sm">{scaledAtk}</span>
          </div>
          <div className="flex items-center gap-1">
            <img src={mainStatIcon} alt={weapon.main_stat} className="h-3 w-3 object-contain" />
            <span className="text-white/80 text-sm]">{scaledMainStat}%</span>
          </div>
        </div>

        {/* Lv then Rank */}
        <div className="flex gap-1 text-[10px]">
          <span className="px-1.5 py-0.5 rounded-md bg-black/40 border border-white/15 text-white/60 tracking-wider">
            Lv.{level}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/40 border border-white/20 text-white/75 tracking-wider font-medium">
            R{rank}
          </span>
        </div>
      </div>
    </div>
  );
};
