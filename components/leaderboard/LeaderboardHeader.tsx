'use client';

import React from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface LeaderboardHeaderProps {
  characterName: string;
  characterHead?: string;
  characterElementIcon?: string;
  characterElement?: string;
  teamCharacterIds?: string[];
  total: number;
}

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  characterName,
  characterHead,
  characterElementIcon,
  characterElement,
  teamCharacterIds,
  total,
}) => {
  const { getCharacter } = useGameData();
  const { t } = useLanguage();

  const allMembers = [
    ...(characterHead ? [{ id: '_self', head: characterHead, name: characterName }] : []),
    ...(teamCharacterIds ?? []).map((id) => {
      const c = getCharacter(id);
      return { id, head: c?.head, name: c ? t(c.nameI18n ?? { en: c.name }) : id };
    }),
  ];

  return (
    <div className="flex flex-col items-center gap-4 py-3 text-center">
      {/* Breadcrumb */}
      <div className="flex w-full items-center gap-1.5 text-xs text-text-primary/40">
        <Link href="/leaderboards" className="transition-colors hover:text-accent">
          Leaderboards
        </Link>
        <span>/</span>
        <span className="text-text-primary/60">{characterName}</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold uppercase tracking-wide text-accent drop-shadow-[0_1px_8px_rgba(166,150,98,0.4)]">
          {characterName} Rankings
        </h1>
        {characterElementIcon && (
          <img
            src={characterElementIcon}
            alt={characterElement ?? ''}
            className="mx-auto mt-1 h-5 w-5 object-contain opacity-70"
          />
        )}
      </div>

      {/* Character + team portraits */}
      {allMembers.length > 0 && (
        <div className="flex items-end justify-center gap-5">
          {allMembers.map(({ id, head, name }) => (
            <div key={id} className="flex flex-col items-center gap-1.5">
              {head ? (
                <img
                  src={head}
                  alt={name}
                  className="h-16 w-16 rounded-full border-2 border-border object-cover object-top shadow-md"
                />
              ) : (
                <div className="h-16 w-16 rounded-full border-2 border-border bg-background-secondary/80" />
              )}
              <span className="text-xs font-medium text-text-primary/70">{name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Entry count */}
      <p className="text-xs text-text-primary/40">
        {total > 0 ? `${total.toLocaleString()} ranked builds` : 'No ranked builds yet'}
      </p>
    </div>
  );
};
