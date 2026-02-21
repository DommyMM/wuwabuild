'use client';

import { forwardRef } from 'react';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';

// All class names must be static strings for Tailwind to detect and generate them.
const ELEMENT_GRADIENT_FROM: Record<string, string> = {
  Aero:    'from-aero/25',
  Havoc:   'from-havoc/20',
  Spectro: 'from-spectro/20',
  Glacio:  'from-glacio/20',
  Electro: 'from-electro/20',
  Fusion:  'from-fusion/30',
};

export const BuildCard = forwardRef<HTMLDivElement>((_, ref) => {
  const selected = useSelectedCharacter();
  const fromClass = selected?.element
    ? (ELEMENT_GRADIENT_FROM[selected.element] ?? 'from-transparent')
    : 'from-transparent';

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')]"
    >
      {/* Element-tinted gradient overlay: element color at top → dark at bottom */}
      <div className={`absolute inset-0 bg-linear-to-b ${fromClass} to-black/25`} />

      <div className="aspect-[2.4/1]" />
    </div>
  );
});

BuildCard.displayName = 'BuildCard';

