'use client';

import { forwardRef } from 'react';

export const BuildCard = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-lg bg-cover bg-center"
      style={{
        backgroundImage: `url(https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png)`,
      }}
    >
      <div className="aspect-[2.4/1]" />
    </div>
  );
});

BuildCard.displayName = 'BuildCard';
