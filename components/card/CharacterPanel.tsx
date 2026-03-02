'use client';

import React from 'react';
import { SelectedCharacter } from '@/hooks/useSelectedCharacter';

interface CharacterPanelProps {
  selected: SelectedCharacter;
  tintClass: string;
  artSource: string;
  onArtSourceChange: (value: string) => void;
  useAltSkin?: boolean;
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  selected, tintClass, artSource, onArtSourceChange, useAltSkin = false,
}) => {
  const altBanner = selected.character.skins?.find(s => s.icon.banner !== selected.banner)?.icon.banner;
  const bannerUrl = useAltSkin && altBanner ? altBanner : selected.banner;

  return (
    <div className="relative w-[30%] shrink-0 self-stretch z-10 overflow-hidden rounded-r-[3rem] shadow-[4px_0_15px_rgba(0,0,0,0.15)]">
      {/* Glass pane background */}
      <div className="absolute inset-0 bg-white/4 backdrop-blur-[3px] border-r border-white/10 rounded-r-[3rem] overflow-hidden">
        <div className={`absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t ${tintClass} opacity-40 mix-blend-screen pointer-events-none`} />
      </div>

      {/* Art source at bottom-left */}
      <div className="absolute bottom-3 left-3 z-30">
        <input
          type="text"
          value={artSource}
          onChange={e => onArtSourceChange(e.target.value)}
          placeholder=""
          className="bg-transparent text-white/50 text-lg italic placeholder:text-white/15 focus:outline-none blur-[0.3px]"
        />
      </div>

      {/* Character banner */}
      <div className="absolute z-20 pointer-events-none flex items-end justify-center overflow-hidden">
        <img
          src={bannerUrl}
          alt={selected.displayName}
          className="h-full w-auto object-contain"
        />
      </div>
    </div>
  );
};
