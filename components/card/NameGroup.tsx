'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SelectedCharacter } from '@/hooks/useSelectedCharacter';

interface NameGroupProps {
  selected: SelectedCharacter;
  characterLevel: number;
}

export const NameGroup: React.FC<NameGroupProps> = ({
  selected,
  characterLevel,
}) => {
  const { t } = useLanguage();
  const roleIcon = `/images/Roles/${selected.character.Role}.png`;
  const translatedName = selected.isRover
    ? `${t(selected.character.nameI18n ?? { en: 'Rover' })} · ${selected.element}`
    : t(selected.character.nameI18n ?? { en: selected.displayName });

  return (
    <div className="flex flex-col py-4 tracking-wide leading-none text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
      <div className="flex items-center gap-2">
        <span className="text-4xl text-white">{translatedName}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl text-white">Lv.{characterLevel}/90</span>
        <div className="flex items-center">
          {selected.character.elementIcon && (
            <img
              src={selected.character.elementIcon}
              alt={selected.element}
              className="h-8 w-8 object-contain"
            />
          )}
          <img
            src={roleIcon}
            alt={`${selected.character.Role} role`}
            className="h-8 w-8 object-contain"
          />
        </div>
      </div>
    </div>
  );
};
