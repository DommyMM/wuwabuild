'use client';

import React, { useRef, useState } from 'react';
import { SelectedCharacter } from '@/hooks/useSelectedCharacter';
import { CardArtSourceMode, CardArtTransform } from '@/lib/cardArt';

interface CharacterPanelProps {
  selected: SelectedCharacter;
  tintClass: string;
  artSource: string;
  onArtSourceChange: (value: string) => void;
  useAltSkin?: boolean;
  artTransform: CardArtTransform;
  artSourceMode: CardArtSourceMode;
  customArtUrl: string | null;
  isArtEditMode: boolean;
  onCustomArtUpload: (file: File) => void;
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  selected,
  tintClass,
  artSource,
  onArtSourceChange,
  useAltSkin = false,
  artTransform,
  artSourceMode,
  customArtUrl,
  isArtEditMode,
  onCustomArtUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const altBanner = selected.character.skins?.find(s => s.icon.banner !== selected.banner)?.icon.banner;
  const baseBannerUrl = useAltSkin && altBanner ? altBanner : selected.banner;
  const bannerUrl = artSourceMode === 'custom' && customArtUrl ? customArtUrl : baseBannerUrl;

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    onCustomArtUpload(file);
  };

  return (
    <div className="relative w-3/10 shrink-0 self-stretch z-10 overflow-hidden rounded-r-[48px] shadow-[4px_0_15px_rgba(0,0,0,0.15)]">
      {/* Glass pane background */}
      <div className="absolute inset-0 bg-white/4 backdrop-blur-[3px] border-r border-white/10 rounded-r-[48px] overflow-hidden">
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
      <div className="absolute inset-0 z-20 pointer-events-none flex items-end justify-center overflow-hidden">
        <img
          src={bannerUrl}
          alt={selected.displayName}
          className="h-full min-h-full w-auto max-w-none object-contain"
          style={{
            transform: `translate3d(${artTransform.x}px, ${artTransform.y}px, 0) scale(${artTransform.scale})`,
            transformOrigin: 'center bottom',
          }}
          draggable={false}
        />
      </div>

      {isArtEditMode && (
        <>
          <button
            type="button"
            className={`absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed rounded-r-[48px] transition-colors ${
              isDropActive
                ? 'border-accent/85 bg-black/55'
                : 'border-white/30 bg-black/45 hover:bg-black/55 hover:border-white/50'
            }`}
            onClick={openFilePicker}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropActive(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDropActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDropActive(false);
              const file = e.dataTransfer.files?.[0];
              if (!file) return;
              onCustomArtUpload(file);
            }}
          >
            <span className="max-w-[220px] text-center text-sm font-medium text-white/90">
              Drag and Drop or Click to Upload Image
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
};
