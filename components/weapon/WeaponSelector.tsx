'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui/Modal';
import { Weapon, WeaponRarity } from '@/types/weapon';
import { getWeaponPaths } from '@/lib/paths';

const FALLBACK_WEAPON = '/images/Resources/Weapon.png';

const RARITIES = [5, 4, 3] as const;

/** Rarity → default card border */
const RARITY_BORDER: Record<WeaponRarity, string> = {
  '5-star': 'border-rarity-5/50',
  '4-star': 'border-rarity-4/50',
  '3-star': 'border-blue-400/40',
  '2-star': 'border-green-400/40',
  '1-star': 'border-gray-400/40',
};

/** Rarity → hover glow */
const RARITY_HOVER: Record<WeaponRarity, string> = {
  '5-star': 'hover:border-rarity-5 hover:shadow-[0_0_10px_var(--color-rarity-5)]',
  '4-star': 'hover:border-rarity-4 hover:shadow-[0_0_10px_var(--color-rarity-4)]',
  '3-star': 'hover:border-blue-400',
  '2-star': 'hover:border-green-400',
  '1-star': 'hover:border-gray-400',
};

/** Rarity → selected highlight */
const RARITY_SELECTED: Record<WeaponRarity, string> = {
  '5-star': 'border-rarity-5 shadow-[0_0_12px_var(--color-rarity-5)]',
  '4-star': 'border-rarity-4 shadow-[0_0_12px_var(--color-rarity-4)]',
  '3-star': 'border-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]',
  '2-star': 'border-green-400',
  '1-star': 'border-gray-400',
};

/** Rarity → subtle card background tint */
const RARITY_BG: Record<WeaponRarity, string> = {
  '5-star': 'bg-rarity-5/10',
  '4-star': 'bg-rarity-4/10',
  '3-star': 'bg-blue-400/8',
  '2-star': 'bg-green-400/8',
  '1-star': 'bg-gray-400/8',
};

/** Rarity → divider strip */
const RARITY_DIVIDER: Record<WeaponRarity, string> = {
  '5-star': 'bg-rarity-5/40',
  '4-star': 'bg-rarity-4/40',
  '3-star': 'bg-blue-400/30',
  '2-star': 'bg-green-400/30',
  '1-star': 'bg-gray-400/30',
};

/** Rarity → shimmering gradient for weapon name text */
const RARITY_GRADIENT: Record<WeaponRarity, string> = {
  '5-star': 'linear-gradient(to right, #ffd700, #fff7b5, #ffd700)',
  '4-star': 'linear-gradient(to right, #c468e9, #e1bef3, #c468e9)',
  '3-star': 'linear-gradient(to right, #6ebfce, #b4d4da, #6ebfce)',
  '2-star': 'linear-gradient(to right, #7ab488, #bad1bf, #7ab488)',
  '1-star': 'linear-gradient(to right, #595959, #868686, #595959)',
};

/** Numeric rarity → active filter chip styling */
const RARITY_CHIP_ACTIVE: Record<number, string> = {
  5: 'bg-rarity-5/20 border-rarity-5/50 text-rarity-5',
  4: 'bg-rarity-4/20 border-rarity-4/50 text-rarity-4',
  3: 'bg-blue-400/20 border-blue-400/50 text-blue-400',
};

interface WeaponSelectorProps {
  className?: string;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rarityFilter, setRarityFilter] = useState<Set<number>>(new Set());

  const { getCharacter, getWeapon, getWeaponsByType } = useGameData();
  const { state, setWeapon, setWeaponLevel, setWeaponRank } = useBuild();
  const { t } = useLanguage();

  const character = getCharacter(state.characterId);
  const selectedWeapon = getWeapon(state.weaponId);

  // 5-star first, then alphabetical
  const sortedWeapons = useMemo(() => {
    if (!character) return [];
    return [...getWeaponsByType(character.weaponType)].sort((a, b) => {
      const diff = parseInt(b.rarity) - parseInt(a.rarity);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  }, [character, getWeaponsByType]);

  const filteredWeapons = useMemo(() => {
    if (rarityFilter.size === 0) return sortedWeapons;
    return sortedWeapons.filter(w => rarityFilter.has(parseInt(w.rarity)));
  }, [sortedWeapons, rarityFilter]);

  const handleSelect = useCallback((weapon: Weapon) => {
    setWeapon(weapon.id);
    setWeaponLevel(1);
    setWeaponRank(1);
    setIsModalOpen(false);
  }, [setWeapon, setWeaponLevel, setWeaponRank]);

  const toggleRarity = useCallback((r: number) => {
    setRarityFilter(prev => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setRarityFilter(new Set()), []);

  if (!character) return null;

  const weaponPaths = selectedWeapon ? getWeaponPaths(selectedWeapon) : FALLBACK_WEAPON;
  const weaponLabel = selectedWeapon
    ? t(selectedWeapon.nameI18n ?? { en: selectedWeapon.name })
    : 'Select Weapon';

  return (
    <>
      {/* Weapon trigger — centered card + rank slider */}
      <div className={`relative flex flex-col items-center gap-2 ${className}`}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group h-32 w-32 cursor-pointer overflow-hidden rounded-xl border border-border bg-background-secondary transition-colors hover:border-[rgba(166,150,98,0.4)]"
        >
          <img
            src={weaponPaths}
            alt={weaponLabel}
            className="h-full w-full object-cover drop-shadow-[0_0_12px_rgba(166,150,98,0.3)]"
          />
        </button>

        {/* Rank slider — vertical 1-5, right edge */}
        {selectedWeapon && (
          <div className="absolute right-4 top-0 flex flex-col items-center">
            <span className="text-xs font-bold text-text-primary/40 mb-1">5</span>
            <div className="relative">
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={state.weaponRank}
                onChange={e => setWeaponRank(parseInt(e.target.value))}
                className="rank-slider h-28"
                style={{ '--fill': `${((state.weaponRank - 1) / 4) * 100}%` } as React.CSSProperties}
              />
            </div>
            <span className="text-xs font-bold text-text-primary/40">1</span>
          </div>
        )}

        {/* Weapon name */}
        <span
          className="text-xl font-medium"
          style={selectedWeapon ? {
            backgroundImage: RARITY_GRADIENT[selectedWeapon.rarity],
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shine 3s linear infinite',
          } : undefined}
        >
          {weaponLabel}
        </span>
      </div>

      {/* Selection modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Select ${character.weaponType}`}
        contentClassName="w-full mx-8 lg:mx-32 max-h-[90vh]"
      >
        <div className="flex h-full flex-col gap-3">
          {/* Rarity filter chips */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {RARITIES.map(r => (
              <button
                key={r}
                onClick={() => toggleRarity(r)}
                className={`rounded-md border px-3 py-1 text-sm font-medium transition-colors
                  ${rarityFilter.has(r)
                    ? RARITY_CHIP_ACTIVE[r]
                    : 'border-border text-text-primary/50 hover:border-text-primary/30'
                  }
                `}
              >
                {r}★
              </button>
            ))}

            {rarityFilter.size > 0 && (
              <>
                <span className="mx-1 h-5 w-px bg-border" />
                <button
                  onClick={clearFilters}
                  className="rounded-md px-3 py-1 text-sm text-text-primary/40 hover:text-text-primary"
                >
                  Clear
                </button>
              </>
            )}
          </div>

          {/* Weapon grid */}
          {filteredWeapons.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-text-primary/40">No weapons found</span>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9">
                {filteredWeapons.map(weapon => {
                  const isSelected = selectedWeapon?.id === weapon.id;
                  const name = t(weapon.nameI18n ?? { en: weapon.name });

                  return (
                    <button
                      key={weapon.id}
                      onClick={() => handleSelect(weapon)}
                      className={`group relative flex flex-col items-center overflow-hidden rounded-lg border-2 transition-all duration-200
                        ${RARITY_BG[weapon.rarity] ?? ''}
                        ${isSelected
                          ? RARITY_SELECTED[weapon.rarity] ?? 'border-accent'
                          : `${RARITY_BORDER[weapon.rarity] ?? 'border-border'} ${RARITY_HOVER[weapon.rarity] ?? ''}`
                        }
                      `}
                    >
                      <div className="relative aspect-square w-full overflow-hidden">
                        <img
                          src={getWeaponPaths(weapon)}
                          alt={name}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div className={`h-0.5 w-full ${RARITY_DIVIDER[weapon.rarity] ?? 'bg-border'}`} />

                      <span className="max-w-full truncate px-1.5 py-1 text-center text-xs leading-tight text-text-primary/80 group-hover:text-text-primary">
                        {name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default WeaponSelector;
