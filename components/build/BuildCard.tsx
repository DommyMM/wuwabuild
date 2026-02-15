'use client';

import { useMemo, forwardRef } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { useStats } from '@/contexts/StatsContext';
import { getCVRating, getCVRatingColor } from '@/lib/calculations/cv';
import { STAT_ABBREV, STAT_CDN_NAMES, getStatIconName } from '@/lib/constants';
import { StatName } from '@/types/stats';

interface BuildCardProps {
  className?: string;
  showWatermark?: boolean;
}

// Get CDN URL for stat icon
const getStatIconUrl = (statName: string): string => {
  const iconName = getStatIconName(statName);
  const cdnName = STAT_CDN_NAMES[iconName] || 'redattack';
  return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconAttribute/${cdnName}.png`;
};

// Get character portrait URL
const getCharacterPortraitUrl = (characterId: string | null): string => {
  if (!characterId) return '/images/Resources/Resonator.png';
  return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconRoleHead/${characterId}.png`;
};

// Get weapon icon URL
const getWeaponIconUrl = (weaponId: string | null): string => {
  if (!weaponId) return '/images/Resources/Weapon.png';
  return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconWeapon/${weaponId}.png`;
};

// Get echo icon URL
const getEchoIconUrl = (echoId: string | null): string => {
  if (!echoId) return '/images/Resources/Echo.png';
  return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconMonsterGoods/${echoId}.png`;
};

// Element colors
const ELEMENT_COLORS: Record<string, string> = {
  Havoc: '#9d4edd',
  Spectro: '#ffd93d',
  Aero: '#6bcb77',
  Glacio: '#4d96ff',
  Electro: '#a78bfa',
  Fusion: '#fb923c'
};

// Key stats to display
const KEY_STATS: { stat: StatName; isPercent: boolean }[] = [
  { stat: 'HP', isPercent: false },
  { stat: 'ATK', isPercent: false },
  { stat: 'DEF', isPercent: false },
  { stat: 'Crit Rate', isPercent: true },
  { stat: 'Crit DMG', isPercent: true },
  { stat: 'Energy Regen', isPercent: true }
];

export const BuildCard = forwardRef<HTMLDivElement, BuildCardProps>(({
  className = '',
  showWatermark = true
}, ref) => {
  const { getCharacter, getWeapon, getEcho } = useGameData();
  const { state } = useBuild();
  const { stats, getStatValue } = useStats();

  const selectedCharacter = getCharacter(state.characterState.id);
  const selectedWeapon = getWeapon(state.weaponState.id);
  const currentElement = state.characterState.element || selectedCharacter?.element || 'Havoc';

  // Get display name for character
  const displayName = useMemo(() => {
    if (!selectedCharacter) return 'No Resonator';
    const isRover = selectedCharacter.name.startsWith('Rover');
    return isRover ? `Rover${currentElement}` : selectedCharacter.name;
  }, [selectedCharacter, currentElement]);

  // Get CV info
  const cv = stats.cv;
  const cvRating = getCVRating(cv);
  const cvColor = getCVRatingColor(cv);

  // Get element DMG stat based on character element
  const elementDmgStat = useMemo((): StatName | null => {
    if (!currentElement) return null;
    return `${currentElement} DMG` as StatName;
  }, [currentElement]);

  // Get active sets
  const activeSets = stats.activeSets;

  // Format stat value
  const formatStat = (value: number, isPercent: boolean): string => {
    if (isPercent) {
      return `${value.toFixed(1)}%`;
    }
    return Math.round(value).toLocaleString();
  };

  if (!selectedCharacter) {
    return (
      <div
        ref={ref}
        className={`rounded-lg border border-border bg-background-secondary p-8 text-center ${className}`}
      >
        <span className="text-text-primary/60">No build to display</span>
      </div>
    );
  }

  const elementColor = ELEMENT_COLORS[currentElement] || '#ffffff';

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-lg border border-border bg-linear-to-br from-background-secondary to-background ${className}`}
      style={{ minWidth: '400px', maxWidth: '600px' }}
    >
      {/* Background Gradient */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `radial-gradient(circle at 20% 20%, ${elementColor}, transparent 60%)`
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-6">
        {/* Header: Character + Weapon */}
        <div className="flex items-start gap-4">
          {/* Character Portrait */}
          <div
            className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-3"
            style={{ borderColor: elementColor }}
          >
            <img
              src={getCharacterPortraitUrl(selectedCharacter.id)}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Character Info */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text-primary">{displayName}</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-text-primary/60">
              <span>Lv. {state.characterState.level}</span>
              <span>|</span>
              <span>S{state.currentSequence}</span>
            </div>

            {/* Weapon Info */}
            {selectedWeapon && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={getWeaponIconUrl(selectedWeapon.id)}
                  alt={selectedWeapon.name}
                  className="h-8 w-8 rounded"
                />
                <div>
                  <div className="text-sm font-medium text-text-primary">
                    {selectedWeapon.name}
                  </div>
                  <div className="text-xs text-text-primary/50">
                    Lv. {state.weaponState.level} | R{state.weaponState.rank}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CV Badge */}
          <div className="text-right">
            <div className="text-xs text-text-primary/50">CV</div>
            <div
              className="text-2xl font-bold"
              style={{ color: cvColor }}
            >
              {cv.toFixed(1)}
            </div>
            <div
              className="rounded px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${cvColor}20`,
                color: cvColor
              }}
            >
              {cvRating}
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {KEY_STATS.map(({ stat, isPercent }) => {
            const value = getStatValue(stat);
            return (
              <div
                key={stat}
                className="rounded-lg bg-background/50 p-2 text-center"
              >
                <div className="mb-1 flex items-center justify-center gap-1">
                  <img
                    src={getStatIconUrl(stat)}
                    alt={stat}
                    className="h-4 w-4"
                  />
                  <span className="text-xs text-text-primary/50">
                    {STAT_ABBREV[stat] || stat}
                  </span>
                </div>
                <div className="font-bold text-text-primary">
                  {formatStat(value, isPercent)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Element DMG */}
        {elementDmgStat && (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-background/50 p-2">
            <img
              src={getStatIconUrl(elementDmgStat)}
              alt={elementDmgStat}
              className="h-5 w-5"
            />
            <span className="text-sm text-text-primary/70">{elementDmgStat}</span>
            <span className="font-bold" style={{ color: elementColor }}>
              {getStatValue(elementDmgStat).toFixed(1)}%
            </span>
          </div>
        )}

        {/* Set Bonuses */}
        {activeSets.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs text-text-primary/50">Echo Sets</div>
            <div className="flex flex-wrap gap-2">
              {activeSets.map(({ element, count, setName }) => (
                <div
                  key={element}
                  className="rounded-full bg-accent/10 px-3 py-1 text-sm text-accent"
                >
                  {setName} ({count}pc)
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Echo Preview */}
        <div className="mt-4">
          <div className="mb-2 text-xs text-text-primary/50">Echoes</div>
          <div className="flex justify-center gap-2">
            {state.echoPanels.map((panel, index) => {
              const echo = panel.id ? getEcho(panel.id) : null;
              return (
                <div
                  key={index}
                  className={`h-12 w-12 overflow-hidden rounded-lg border ${
                    echo ? 'border-border' : 'border-border/50'
                  } bg-background/50`}
                >
                  {echo ? (
                    <img
                      src={getEchoIconUrl(echo.id)}
                      alt={echo.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-text-primary/20">
                      ?
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Watermark */}
        {showWatermark && (state.watermark.username || state.watermark.uid) && (
          <div className="mt-4 border-t border-border/50 pt-3 text-center text-xs text-text-primary/40">
            {state.watermark.username && <span>{state.watermark.username}</span>}
            {state.watermark.username && state.watermark.uid && <span> | </span>}
            {state.watermark.uid && <span>UID: {state.watermark.uid}</span>}
          </div>
        )}

        {/* Branding */}
        <div className="mt-3 text-center text-xs text-text-primary/30">
          WuwaBuilds
        </div>
      </div>
    </div>
  );
});

BuildCard.displayName = 'BuildCard';

export default BuildCard;
