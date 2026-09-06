'use client';

import React, { useLayoutEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Weapon } from '@/lib/weapon';
import { RARITY_ACCENTS } from '@/components/weapon/rarityStyles';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';
import { StatHoverKey } from '@/lib/constants/statHover';

// Design-space font sizes for the weapon name: the card's 2xl, shrinking for
// long names down to base. Measured 2026-09-06 in Plus Jakarta: the slot beside
// the icon is ~250px, and 9 of 122 English names (up to "Thousandfold
// Deliverance") plus 92 of 610 Latin-script names overflow it at 24px.
const WEAPON_NAME_MAX_PX = 24;
const WEAPON_NAME_MIN_PX = 16;

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
  const displayedWeaponName = translatedWeaponName || weapon.name;
  const weaponNameRef = useRef<HTMLSpanElement>(null);
  // Shrink the name until it fits its slot, measured on the real DOM so every
  // face and script is exact; `truncate` on the span makes scrollWidth report
  // the full text width. Written straight onto the node: it is a layout fact,
  // not app state. Re-measured once web fonts land, since the first paint can
  // be in the fallback face.
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const node = weaponNameRef.current;
      if (cancelled || !node) return;
      node.style.fontSize = `${WEAPON_NAME_MAX_PX}px`;
      const { scrollWidth, clientWidth } = node;
      if (scrollWidth > clientWidth && scrollWidth > 0) {
        node.style.fontSize = `${Math.max(WEAPON_NAME_MIN_PX, Math.floor((WEAPON_NAME_MAX_PX * clientWidth) / scrollWidth))}px`;
      }
    };
    measure();
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(measure);
    }
    return () => {
      cancelled = true;
    };
  }, [displayedWeaponName]);
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
      >
        <div className={`relative flex h-30 w-30 items-center justify-center overflow-hidden rounded-xl border shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-[background-color,border-color,box-shadow,filter,opacity,transform] duration-200 ${rarityStyle?.border ?? 'border-white/28'} ${rarityStyle?.bg ?? 'bg-black/20'}`}>
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
        {/* Same weight and color as the character name in NameGroup. Long names
            shrink to fit the slot (see WEAPON_NAME_*); `truncate` remains the
            floor's safety net and keeps the export's no-wrap invariant. */}
        <span ref={weaponNameRef} className={`-mx-2 -my-1.5 truncate px-2 py-1.5 text-2xl leading-tight text-white transition-[color,filter,opacity,transform] duration-200 ${nameInteractionClass}`}>
          {displayedWeaponName}
        </span>
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 transition-[background-color,box-shadow,filter,opacity,transform] duration-200 ${getChipClass(weaponAtkHoverKey)}`}
            onMouseEnter={weaponAtkHoverKey ? () => onHoverStatChange?.(weaponAtkHoverKey) : undefined}
            onMouseLeave={weaponAtkHoverKey ? () => onHoverStatChange?.(null) : undefined}
          >
            {weaponAtkIcon && <img src={weaponAtkIcon} alt="ATK" className="h-5 w-5 object-contain" loading="lazy" />}
            <span className="text-lg font-semibold text-white/88">{weaponStats.scaledAtk}</span>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 transition-[background-color,box-shadow,filter,opacity,transform] duration-200 ${getChipClass(weaponMainHoverKey)}`}
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
