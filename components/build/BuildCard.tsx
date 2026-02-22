'use client';

import { forwardRef } from 'react';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';

const BASE_BG =
  "bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')]";

const ELEMENT_TINT: Record<string, string> = {
  Aero: 'from-aero/24 via-aero/10 to-transparent',
  Havoc: 'from-havoc/28 via-havoc/12 to-transparent',
  Spectro: 'from-spectro/24 via-spectro/10 to-transparent',
  Glacio: 'from-glacio/22 via-glacio/9 to-transparent',
  Electro: 'from-electro/24 via-electro/10 to-transparent',
  Fusion: 'from-fusion/26 via-fusion/11 to-transparent',
};

const ELEMENT_BLOOM: Record<string, string> = {
  Aero: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(85,255,181,0.28)_0%,rgba(85,255,181,0.08)_40%,transparent_78%)]',
  Havoc: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(230,73,166,0.3)_0%,rgba(230,73,166,0.09)_40%,transparent_78%)]',
  Spectro: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(248,229,108,0.27)_0%,rgba(248,229,108,0.09)_40%,transparent_78%)]',
  Glacio: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(65,174,251,0.26)_0%,rgba(65,174,251,0.08)_40%,transparent_78%)]',
  Electro: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(180,107,255,0.28)_0%,rgba(180,107,255,0.09)_40%,transparent_78%)]',
  Fusion: 'bg-[radial-gradient(120%_90%_at_50%_8%,rgba(240,116,78,0.28)_0%,rgba(240,116,78,0.09)_40%,transparent_78%)]',
};

export const BuildCard = forwardRef<HTMLDivElement>((_, ref) => {
  const selected = useSelectedCharacter();
  const tintClass = selected?.element
    ? (ELEMENT_TINT[selected.element] ?? 'from-transparent via-transparent to-transparent')
    : 'from-transparent via-transparent to-transparent';
  const bloomClass = selected?.element
    ? (ELEMENT_BLOOM[selected.element] ?? '')
    : '';

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-lg bg-cover bg-center ${BASE_BG}`}
    >
      {/* Restored your exact original background lighting/overlays */}
      <div className="absolute inset-0 bg-black/6" />
      <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
      <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_30%,rgba(0,0,0,0.18)_100%)]" />

      {selected && (
        <div className="absolute inset-y-0 left-0 w-[36%] z-10">
          
          {/* Glass Pane - Adjusted to w-[36%] max */}
          <div className="absolute inset-y-0 left-0 right-0 bg-white/4 backdrop-blur-[3px] border-r border-white/10 rounded-r-[3rem] shadow-[4px_0_15px_rgba(0,0,0,0.15)] overflow-hidden">
            {/* Keeping the base element glow so the glass has some life */}
            <div className={`absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t ${tintClass} opacity-40 mix-blend-screen pointer-events-none`} />
          </div>

          {/* Character Integration - Shadows removed, full height restored */}
          <div className="absolute inset-0 z-20 pointer-events-none flex items-end justify-center overflow-hidden">
            <img
              src={selected.banner}
              alt={selected.displayName}
              className="h-full w-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* Keeps the wide banner aspect ratio */}
      <div className="aspect-[2.4/1]" />
    </div>
  );
});

BuildCard.displayName = 'BuildCard';