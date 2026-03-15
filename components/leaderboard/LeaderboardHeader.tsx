'use client';

import React from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { LBTeamMemberConfig } from '@/lib/lb';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from './leaderboardConstants';

interface LeaderboardHeaderProps {
  characterName: string;
  characterHead?: string;
  characterElement?: string;
  teamCharacterIds?: string[];
  teamMembers?: LBTeamMemberConfig[];
  activeWeaponId?: string;
  activeTrackKey?: string;
  activeTrackLabel?: string;
}

export const LeaderboardHeader: React.FC<LeaderboardHeaderProps> = ({
  characterName,
  characterHead,
  characterElement,
  teamCharacterIds = [],
  teamMembers = [],
  activeWeaponId,
  activeTrackKey,
  activeTrackLabel,
}) => {
  const { fetters, getCharacter, getEcho, getWeapon } = useGameData();
  const { t } = useLanguage();

  const seqLevel = activeTrackKey ? parseLBSeqLevel(activeTrackKey) : 0;
  const cleanTrackLabel = activeTrackLabel ? stripLBSeqPrefix(activeTrackLabel) : null;
  const elementClass = characterElement ? characterElement.toLowerCase() : '';
  const activeWeapon = getWeapon(activeWeaponId ?? null);
  const activeWeaponIcon = activeWeapon ? getWeaponPaths(activeWeapon) : null;
  const activeWeaponName = activeWeapon ? t(activeWeapon.nameI18n ?? { en: activeWeapon.name }) : null;

  const supportConfigs: LBTeamMemberConfig[] = teamMembers.length > 0
    ? teamMembers
    : teamCharacterIds.map((charId) => ({ charId }));

  const supportMembers = supportConfigs.map((member) => {
    const character = getCharacter(member.charId);
    const weapon = getWeapon(member.weaponId ?? null);
    const echo = getEcho(member.echoId ?? null);
    const set = fetters.find((entry) => String(entry.id) === member.setId);

    return {
      id: member.charId,
      head: character?.head,
      name: character ? t(character.nameI18n ?? { en: character.name }) : member.charId,
      weaponIcon: weapon ? getWeaponPaths(weapon) : null,
      weaponName: weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : null,
      setIcon: set?.icon ?? null,
      setName: set ? t(set.name) : null,
      echoIcon: echo ? getEchoPaths(echo) : null,
      echoName: echo ? t(echo.nameI18n ?? { en: echo.name }) : null,
    };
  });

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

        <div className="mt-5 flex w-full max-w-5xl flex-wrap items-start justify-center gap-8 md:gap-10">
          <div className="flex flex-col items-center">
            <div className="h-25 w-25 rounded-3xl border border-accent/18 bg-black/16 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
              {characterHead ? (
                <div
                  role="img"
                  aria-label={characterName}
                  className="h-full w-full rounded-[inherit] bg-cover bg-center bg-no-repeat"
                  style={{ backgroundImage: `url("${characterHead}")` }}
                />
              ) : (
                <div className="h-full w-full rounded-[inherit] bg-background-secondary/80" />
              )}
            </div>
            {activeWeaponIcon ? (
              <div className="-mt-3 flex min-h-12 items-center justify-center rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(34,36,42,0.84),rgba(16,18,24,0.72))] px-4 shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <img
                  src={activeWeaponIcon}
                  alt={activeWeaponName ?? 'Weapon'}
                  title={activeWeaponName ?? 'Weapon'}
                  className="h-10 w-10 object-contain"
                />
              </div>
            ) : null}
          </div>

          {supportMembers.map((member) => {
            const loadoutIcons = [
              member.weaponIcon ? { key: 'weapon', src: member.weaponIcon, label: member.weaponName ?? 'Weapon' } : null,
              member.echoIcon ? { key: 'echo', src: member.echoIcon, label: member.echoName ?? 'Echo' } : null,
              member.setIcon ? { key: 'set', src: member.setIcon, label: member.setName ?? 'Echo Set' } : null
            ];
            const visibleLoadoutIcons = loadoutIcons.filter((icon): icon is NonNullable<typeof icon> => icon !== null);
            const badgeColsClass = visibleLoadoutIcons.length >= 3
              ? 'grid-cols-3 min-w-[8.5rem]'
              : visibleLoadoutIcons.length === 2
                ? 'grid-cols-2 min-w-[5.75rem]'
                : 'grid-cols-1 min-w-[3.9rem]';

            return (
              <div key={member.id} className="flex flex-col items-center">
                <div className="h-25 w-25 rounded-3xl border border-border/70 bg-black/16 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
                  {member.head ? (
                    <div
                      role="img"
                      aria-label={member.name}
                      className="h-full w-full rounded-[inherit] bg-cover bg-center bg-no-repeat"
                      style={{ backgroundImage: `url("${member.head}")` }}
                    />
                  ) : (
                    <div className="h-full w-full rounded-[inherit] bg-background-secondary/80" />
                  )}
                </div>
                {visibleLoadoutIcons.length > 0 ? (
                  <div className={`-mt-3 grid min-h-12 items-center gap-1.5 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(32,34,40,0.82),rgba(14,16,22,0.7))] p-0.5 overflow-hidden shadow-[0_10px_24px_rgba(0,0,0,0.28)] backdrop-blur-md ${badgeColsClass}`}>
                    {visibleLoadoutIcons.map((icon) => (
                      <img
                        key={`${member.id}-${icon.key}`}
                        src={icon.src}
                        alt={icon.label}
                        title={icon.label}
                        className="h-10 w-10 object-contain"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
