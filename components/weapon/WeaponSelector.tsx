'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { Modal } from '@/components/ui';
import { Weapon, WeaponType, WeaponRarity } from '@/types/weapon';
import { Character } from '@/types/character';

interface WeaponSelectorProps {
  selectedCharacter: Character;
  className?: string;
}

// Rarity to background color mapping
const RARITY_COLORS: Record<WeaponRarity, string> = {
  '5-star': 'bg-amber-100',
  '4-star': 'bg-purple-200',
  '3-star': 'bg-blue-200',
  '2-star': 'bg-green-200',
  '1-star': 'bg-gray-300'
};

// Rarity to border color mapping
const RARITY_BORDERS: Record<WeaponRarity, string> = {
  '5-star': 'border-amber-400',
  '4-star': 'border-purple-400',
  '3-star': 'border-blue-400',
  '2-star': 'border-green-400',
  '1-star': 'border-gray-400'
};

// Rarity sort order
const RARITY_ORDER: WeaponRarity[] = ['5-star', '4-star', '3-star', '2-star', '1-star'];

export const WeaponSelector: React.FC<WeaponSelectorProps> = ({
  selectedCharacter,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { getWeaponsByType, getWeapon } = useGameData();
  const { state, setWeapon } = useBuild();

  const selectedWeapon = getWeapon(state.weaponState.id);

  // Get weapons for the character's weapon type
  const weapons = useMemo(() => {
    return getWeaponsByType(selectedCharacter.weaponType);
  }, [getWeaponsByType, selectedCharacter.weaponType]);

  // Sort weapons by rarity
  const sortedWeapons = useMemo(() => {
    return [...weapons].sort((a, b) => {
      return RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity);
    });
  }, [weapons]);

  // Handle weapon selection
  const handleWeaponSelect = useCallback((weapon: Weapon) => {
    setWeapon(weapon.id);
    setIsModalOpen(false);
  }, [setWeapon]);

  // Get weapon image URL
  const getWeaponImageUrl = (weapon: Weapon | null): string => {
    if (!weapon) return '/images/Resources/Weapon.png';
    return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconWeapon/${weapon.id}.png`;
  };

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      {/* Weapon Selection Button */}
      <div className={`flex flex-col gap-2 ${className}`}>
        <span className="text-sm font-medium text-text-primary/80">Weapon</span>
        <button
          onClick={openModal}
          className="flex items-center gap-3 rounded-lg border border-border bg-background-secondary p-3 transition-colors hover:border-accent hover:bg-background"
        >
          {/* Weapon Image */}
          <div
            className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
              selectedWeapon ? RARITY_BORDERS[selectedWeapon.rarity] : 'border-border'
            } ${selectedWeapon ? RARITY_COLORS[selectedWeapon.rarity] : 'bg-background'}`}
          >
            <img
              src={getWeaponImageUrl(selectedWeapon)}
              alt={selectedWeapon?.name || 'Select Weapon'}
              className="h-full w-full object-contain"
            />
          </div>

          {/* Weapon Info */}
          <div className="flex flex-col items-start">
            {selectedWeapon ? (
              <>
                <span className="font-semibold text-text-primary">
                  {selectedWeapon.name}
                </span>
                <span className="text-xs text-text-primary/60">
                  {selectedWeapon.rarity} | {selectedWeapon.main_stat}
                </span>
              </>
            ) : (
              <span className="text-text-primary/60">Click to select...</span>
            )}
          </div>
        </button>
      </div>

      {/* Weapon Selection Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={`Select ${selectedCharacter.weaponType}`}
        contentClassName="w-[700px] max-w-[90vw]"
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {sortedWeapons.map((weapon) => (
            <button
              key={weapon.id}
              onClick={() => handleWeaponSelect(weapon)}
              className={`group relative flex flex-col items-center gap-1 overflow-hidden rounded-lg border-2 p-2 transition-all hover:scale-105 ${
                RARITY_BORDERS[weapon.rarity]
              } ${
                selectedWeapon?.id === weapon.id ? 'ring-2 ring-accent' : ''
              }`}
              style={{
                backgroundImage: `url('/images/Quality/${weapon.rarity}.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Weapon Image */}
              <div className="relative h-16 w-16">
                <img
                  src={getWeaponImageUrl(weapon)}
                  alt={weapon.name}
                  className="h-full w-full object-contain transition-transform group-hover:scale-110"
                />
              </div>

              {/* Weapon Name */}
              <span className="text-center text-xs font-medium text-gray-900">
                {weapon.name}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default WeaponSelector;
