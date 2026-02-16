'use client';

import React, { useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { LevelSlider } from '@/components/ui/LevelSlider';
import { WeaponSelector } from './WeaponSelector';
import { WeaponRarity } from '@/types/weapon';

interface WeaponInfoProps {
  className?: string;
}

// Rarity to border/accent color mapping
const RARITY_ACCENTS: Record<WeaponRarity, { border: string; bg: string; text: string }> = {
  '5-star': { border: 'border-amber-400', bg: 'bg-amber-400/20', text: 'text-amber-400' },
  '4-star': { border: 'border-purple-400', bg: 'bg-purple-400/20', text: 'text-purple-400' },
  '3-star': { border: 'border-blue-400', bg: 'bg-blue-400/20', text: 'text-blue-400' },
  '2-star': { border: 'border-green-400', bg: 'bg-green-400/20', text: 'text-green-400' },
  '1-star': { border: 'border-gray-400', bg: 'bg-gray-400/20', text: 'text-gray-400' }
};

export const WeaponInfo: React.FC<WeaponInfoProps> = ({
  className = ''
}) => {
  const { getWeapon, getCharacter, scaleWeaponAtk, scaleWeaponStat } = useGameData();
  const { state, setWeaponLevel, setWeaponRank } = useBuild();

  const selectedCharacter = getCharacter(state.characterId);
  const selectedWeapon = getWeapon(state.weaponId);
  const weaponLevel = state.weaponLevel;
  const weaponRank = state.weaponRank;

  // Calculate scaled weapon stats
  const scaledStats = useMemo(() => {
    if (!selectedWeapon) return null;

    const scaledAtk = scaleWeaponAtk(selectedWeapon.ATK, weaponLevel);
    const scaledMainStat = scaleWeaponStat(selectedWeapon.base_main, weaponLevel);

    return {
      atk: scaledAtk,
      mainStat: scaledMainStat,
      mainStatName: selectedWeapon.main_stat
    };
  }, [selectedWeapon, weaponLevel, scaleWeaponAtk, scaleWeaponStat]);

  // Handle level change
  const handleLevelChange = useCallback((newLevel: number) => {
    setWeaponLevel(newLevel);
  }, [setWeaponLevel]);

  // Handle rank change
  const handleRankChange = useCallback((newRank: number) => {
    setWeaponRank(newRank);
  }, [setWeaponRank]);

  // No character selected
  if (!selectedCharacter) {
    return null;
  }

  const rarityStyle = selectedWeapon ? RARITY_ACCENTS[selectedWeapon.rarity] : null;

  return (
    <div className={`rounded-lg border border-border bg-background-secondary p-4 ${className}`}>
      {/* Weapon Selector */}
      <WeaponSelector selectedCharacter={selectedCharacter} />

      {/* Weapon Details (only show if weapon is selected) */}
      {selectedWeapon && (
        <div className="mt-4 space-y-4">
          {/* Scaled Stats Display */}
          {scaledStats && (
            <div className={`rounded-lg border p-3 ${rarityStyle?.border} ${rarityStyle?.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-text-primary/60">ATK</span>
                  <span className={`text-lg font-bold ${rarityStyle?.text}`}>
                    {scaledStats.atk}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs text-text-primary/60">{scaledStats.mainStatName}</span>
                  <span className={`text-lg font-bold ${rarityStyle?.text}`}>
                    {scaledStats.mainStat.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Level Slider */}
          <LevelSlider
            value={weaponLevel}
            onLevelChange={handleLevelChange}
            label="Weapon Level"
            showDiamonds={true}
          />

          {/* Rank Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-primary/80">Rank (Refinement)</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((rank) => (
                <button
                  key={rank}
                  onClick={() => handleRankChange(rank)}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 font-semibold transition-all ${
                    rank === weaponRank
                      ? `${rarityStyle?.border} ${rarityStyle?.bg} ${rarityStyle?.text}`
                      : 'border-border bg-transparent text-text-primary/40 hover:border-text-primary/40 hover:text-text-primary/60'
                  }`}
                  aria-label={`Rank ${rank}`}
                  aria-pressed={rank === weaponRank}
                >
                  R{rank}
                </button>
              ))}
            </div>
          </div>

          {/* Passive Stats (if available) */}
          {selectedWeapon.passive && (
            <div className="rounded-lg border border-border bg-background p-3">
              <div className="text-xs text-text-primary/60">Passive Effect</div>
              <div className="mt-1 text-sm text-text-primary">
                {selectedWeapon.passive}: {selectedWeapon.passive_stat}%
                {selectedWeapon.passive2 && (
                  <>
                    <br />
                    {selectedWeapon.passive2}: {selectedWeapon.passive_stat2}%
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeaponInfo;
