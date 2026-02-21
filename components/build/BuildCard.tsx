'use client';

import { forwardRef } from 'react';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';

const BASE_BG =
  "bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')]";

// All class names must be static strings for Tailwind to detect and generate them.
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
      <div className="absolute inset-0 bg-black/6" />
      <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
      <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_30%,rgba(0,0,0,0.18)_100%)]" />

      {selected && (
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 overflow-hidden">
          <img
            src={selected.banner}
            alt={selected.displayName}
            className="h-full w-auto object-contain"
          />
        </div>
      )}

      <div className="aspect-[2.4/1]" />
    </div>
  );
});

BuildCard.displayName = 'BuildCard';
