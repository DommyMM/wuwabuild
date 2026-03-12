'use client';

import React from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from './leaderboardConstants';

interface LeaderboardHeaderProps {
  characterName: string;
  characterHead?: string;
  characterElement?: string;
  teamCharacterIds?: string[];
  activeTrackKey?: string;
  activeTrackLabel?: string;
}

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  characterName,
  characterHead,
  characterElement,
  teamCharacterIds = [],
  activeTrackKey,
  activeTrackLabel,
}) => {
  const { getCharacter } = useGameData();
  const { t } = useLanguage();

  const seqLevel = activeTrackKey ? parseLBSeqLevel(activeTrackKey) : 0;
  const cleanTrackLabel = activeTrackLabel ? stripLBSeqPrefix(activeTrackLabel) : null;
  const elementClass = characterElement ? characterElement.toLowerCase() : '';

  const teamMembers = teamCharacterIds.map((id) => {
    const character = getCharacter(id);
    return {
      id,
      head: character?.head,
      name: character ? t(character.nameI18n ?? { en: character.name }) : id,
    };
  });

  const roster = [
    { id: 'lead', head: characterHead, name: characterName, role: 'DPS', isLead: true },
    ...teamMembers.map((member) => ({ ...member, role: 'Support', isLead: false })),
  ];

  return (
    <div className="py-3">
      <div className="flex items-center gap-1.5 text-xs text-text-primary/40">
        <Link href="/leaderboards" className="transition-colors hover:text-accent">
          Leaderboards
        </Link>
        <span>/</span>
        <span className="text-text-primary/60">{characterName}</span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className={`text-center text-3xl font-semibold tracking-wide md:text-4xl ${elementClass ? `char-sig ${elementClass}` : 'text-accent'}`}>
              {cleanTrackLabel ? `${characterName} - ${cleanTrackLabel}` : characterName}
            </h1>
            {seqLevel > 0 && (
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[seqLevel]}`}>
                S{seqLevel}
              </span>
            )}
          </div>
        </div>

        {roster.length > 0 && (
          <div className="mt-5 flex w-full max-w-4xl flex-wrap justify-center gap-3">
            {roster.map(({ id, head, name, role, isLead }) => (
              <div key={id} className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  {head ? (
                    <img
                      src={head}
                      alt={name}
                      className="h-14 w-14 object-cover object-top md:h-16 md:w-16"
                    />
                  ) : (
                    <div className="h-14 w-14 bg-background-secondary/80 md:h-16 md:w-16" />
                  )}
                </div>
                <div className="w-full text-center">
                  <div className={`text-xs uppercase tracking-[0.18em] ${isLead ? 'text-amber-200/80' : 'text-text-primary/34'}`}>
                    {role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
