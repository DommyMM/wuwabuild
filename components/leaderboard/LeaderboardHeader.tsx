'use client';

import React from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWeaponPaths } from '@/lib/paths';
import { LB_SEQ_BADGE_COLORS, getLBTrackExcerpt, parseLBSeqLevel } from './leaderboardConstants';

interface LeaderboardHeaderProps {
  characterName: string;
  characterHead?: string;
  characterElementIcon?: string;
  characterElement?: string;
  teamCharacterIds?: string[];
  total: number;
  activeTrackKey?: string;
  activeTrackLabel?: string;
  activeWeaponId?: string;
}

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  characterName,
  characterHead,
  characterElementIcon,
  characterElement,
  teamCharacterIds = [],
  total,
  activeTrackKey,
  activeTrackLabel,
  activeWeaponId,
}) => {
  const { getCharacter, getWeapon } = useGameData();
  const { t } = useLanguage();

  const seqLevel = activeTrackKey ? parseLBSeqLevel(activeTrackKey) : 0;
  const excerpt = activeTrackKey ? getLBTrackExcerpt(activeTrackKey, teamCharacterIds.length) : null;
  const activeWeapon = activeWeaponId ? getWeapon(activeWeaponId) : null;
  const activeWeaponName = activeWeapon ? t(activeWeapon.nameI18n ?? { en: activeWeapon.name }) : null;
  const elementClass = characterElement ? characterElement.toLowerCase() : '';

  const teamMembers = teamCharacterIds.map((id) => {
    const c = getCharacter(id);
    return { id, head: c?.head, name: c ? t(c.nameI18n ?? { en: c.name }) : id };
  });

  return (
    <div className="py-4">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1.5 text-xs text-text-primary/40">
        <Link href="/leaderboards" className="transition-colors hover:text-accent">
          Leaderboards
        </Link>
        <span>/</span>
        <span className="text-text-primary/60">{characterName}</span>
      </div>

      {/* Main row: portrait + info */}
      <div className="flex items-start gap-5">
        {/* Portrait with element icon overlay */}
        <div className="relative shrink-0">
          {characterHead ? (
            <img
              src={characterHead}
              alt={characterName}
              className="h-20 w-20 rounded-2xl border border-border/60 object-cover object-top shadow-md"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl border border-border/60 bg-background-secondary/80" />
          )}
          {characterElementIcon && (
            <img
              src={characterElementIcon}
              alt={characterElement ?? ''}
              className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full border border-border/50 bg-background object-contain p-0.5 shadow"
            />
          )}
        </div>

        {/* Info column */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Name + sequence badge + track label */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`text-2xl font-extrabold tracking-wide ${elementClass ? `char-sig ${elementClass}` : 'text-accent'}`}>
              {characterName}
            </h1>
            {seqLevel > 0 && (
              <span className={`rounded border px-1.5 py-0.5 text-xs font-semibold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[seqLevel]}`}>
                S{seqLevel}
              </span>
            )}
            {activeTrackLabel && (
              <span className="rounded border border-border/50 bg-background-secondary/50 px-2 py-0.5 text-xs text-text-primary/55">
                {activeTrackLabel}
              </span>
            )}
          </div>

          {/* Excerpt */}
          {excerpt && (
            <p className="text-sm text-text-primary/50">{excerpt}</p>
          )}

          {/* Active weapon */}
          {activeWeapon && (
            <div className="flex items-center gap-1.5 text-xs text-text-primary/45">
              <img
                src={getWeaponPaths(activeWeapon)}
                alt={activeWeaponName ?? ''}
                className="h-4 w-4 shrink-0 object-contain opacity-70"
              />
              <span>{activeWeaponName}</span>
            </div>
          )}

          {/* Team portraits */}
          {teamMembers.length > 0 && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="text-xs text-text-primary/30">Team</span>
              <div className="flex gap-1">
                {/* Main character first */}
                {characterHead && (
                  <div title={characterName}>
                    <img
                      src={characterHead}
                      alt={characterName}
                      className="h-8 w-8 rounded-lg border border-accent/30 object-cover object-top ring-1 ring-accent/20"
                    />
                  </div>
                )}
                {teamMembers.map(({ id, head, name }) => (
                  <div key={id} title={name}>
                    {head ? (
                      <img
                        src={head}
                        alt={name}
                        className="h-8 w-8 rounded-lg border border-border/40 object-cover object-top"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg border border-border/40 bg-background-secondary/60" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entry count */}
          <p className="text-xs text-text-primary/30">
            {total > 0 ? `${total.toLocaleString()} ranked builds` : 'No ranked builds yet'}
          </p>
        </div>
      </div>
    </div>
  );
};
