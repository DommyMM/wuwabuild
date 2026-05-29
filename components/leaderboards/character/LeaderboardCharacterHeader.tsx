'use client';

import React from 'react';
import Link from 'next/link';
import { HoverCard, HoverCardDescription } from '@/components/ui/HoverCard';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBTeamMemberConfig } from '@/lib/lb';
import { CDNFetter } from '@/lib/echo';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';
import { EchoHoverCard } from '@/components/echo/EchoHoverCard';
import { FetterHoverCard } from '@/components/echo/FetterHoverCard';
import { LB_SEQ_BADGE_COLORS, parseLBSeqLevel, stripLBSeqPrefix } from '../constants';

interface LeaderboardCharacterHeaderProps {
  characterId?: string;
  characterName: string;
  characterHead?: string;
  characterElement?: string;
  teamCharacterIds?: string[];
  teamMembers?: LBTeamMemberConfig[];
  activeWeaponId?: string;
  activeTrackKey?: string;
  activeTrackLabel?: string;
  activeTrackNote?: string;
}

interface LoadoutIcon {
  key: string;
  src: string;
  label: string;
  wrap?: (trigger: React.ReactNode) => React.ReactNode;
}

function LoadoutIconRow({
  icons,
  keyPrefix,
}: {
  icons: LoadoutIcon[];
  keyPrefix: string;
}) {
  if (icons.length === 0) return null;

  return (
    <div className="relative z-10 -mt-4 flex items-center justify-center gap-1">
      {icons.map((icon) => {
        const trigger = (
          <div
            role="img"
            aria-label={icon.label}
            className="h-10 w-10 rounded-xl border border-white/10 bg-black/60 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url("${icon.src}")` }}
          />
        );
        return (
          <React.Fragment key={`${keyPrefix}-${icon.key}`}>
            {icon.wrap ? icon.wrap(trigger) : trigger}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Terms that appear in track notes and get an inline tooltip when hovered.
const NOTE_GLOSSARY: Record<string, React.ReactNode> = {
  'crit fished': (
    <span>
      Guaranteed crit on the move, because the player usually resets if the hit doesn&apos;t crit
    </span>
  ),
};

const NOTE_PATTERN = new RegExp(
  `(${Object.keys(NOTE_GLOSSARY).map((t) => t.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')).join('|')})`,
  'gi',
);

function renderNoteWithTooltips(note: string): React.ReactNode {
  const parts = note.split(NOTE_PATTERN);
  return parts.map((part, i) => {
    const tooltip = NOTE_GLOSSARY[part.toLowerCase()];
    if (tooltip) {
      return (
        <HoverCard
          key={i}
          placement="top"
          title={part}
          subtitle="Glossary"
          body={<HoverCardDescription>{tooltip}</HoverCardDescription>}
          width="sm"
        >
          <span className="cursor-help underline decoration-dotted decoration-white/40 underline-offset-2">
            {part}
          </span>
        </HoverCard>
      );
    }
    return part;
  });
}

export const LeaderboardCharacterHeader: React.FC<LeaderboardCharacterHeaderProps> = ({
  characterId,
  characterName,
  characterHead,
  characterElement,
  teamCharacterIds = [],
  teamMembers = [],
  activeWeaponId,
  activeTrackKey,
  activeTrackLabel,
  activeTrackNote,
}) => {
  const {
    fetters,
    getCharacter,
    getEcho,
    getWeapon,
    statIcons,
  } = useGameData();
  const { t } = useLanguage();

  const seqLevel = activeTrackKey ? parseLBSeqLevel(activeTrackKey) : 0;
  const cleanTrackLabel = activeTrackLabel ? stripLBSeqPrefix(activeTrackLabel) : null;
  const elementClass = characterElement ? characterElement.toLowerCase() : '';
  const activeWeapon = getWeapon(activeWeaponId ?? null);
  const activeWeaponIcon = activeWeapon ? getWeaponPaths(activeWeapon) : null;
  const activeWeaponName = activeWeapon ? t(activeWeapon.nameI18n ?? { en: activeWeapon.name }) : null;

  const wrapWeapon = React.useCallback((weaponId?: string, refinement?: number) => {
    const weapon = getWeapon(weaponId ?? null);
    if (!weapon) return undefined;

    const rank = refinement && refinement > 0 ? refinement : 1;
    const atk90 = Math.floor(weapon.ATK * 12.5);
    const mainStat90 = parseFloat((weapon.base_main * 4.5).toFixed(1));
    const atkIcon = statIcons?.['ATK'];
    const mainStatIcon = weapon.main_stat ? (statIcons?.[weapon.main_stat] ?? null) : null;

    return function wrapWeaponTrigger(trigger: React.ReactNode) {
      return (
        <WeaponHoverCard
          placement="bottom"
          weapon={weapon}
          weaponLevel={90}
          weaponRank={rank}
          scaledAtk={atk90}
          scaledMainStat={mainStat90}
          atkIcon={atkIcon}
          mainStatIcon={mainStatIcon}
        >
          {trigger}
        </WeaponHoverCard>
      );
    };
  }, [getWeapon, statIcons]);

  const wrapEcho = React.useCallback((echoId?: string, fetter?: CDNFetter | null) => {
    const echo = getEcho(echoId ?? null);
    if (!echo) return undefined;
    return function wrapEchoTrigger(trigger: React.ReactNode) {
      return (
        <EchoHoverCard placement="bottom" echo={echo} resolvedFetter={fetter ?? null}>
          {trigger}
        </EchoHoverCard>
      );
    };
  }, [getEcho]);

  const wrapFetter = React.useCallback((setId?: string) => {
    const fetter = fetters.find((entry) => String(entry.id) === setId);
    if (!fetter) return undefined;
    return function wrapFetterTrigger(trigger: React.ReactNode) {
      return <FetterHoverCard placement="bottom" fetter={fetter}>{trigger}</FetterHoverCard>;
    };
  }, [fetters]);

  const supportConfigs: LBTeamMemberConfig[] = teamMembers.length > 0
    ? teamMembers
    : teamCharacterIds.map((charId) => ({ charId }));

  const supportMembers = supportConfigs.map((member) => {
    const character = getCharacter(member.charId);
    const weapon = getWeapon(member.weaponId ?? null);
    const echo = getEcho(member.echoId ?? null);
    const set = fetters.find((entry) => String(entry.id) === member.setId);

    const loadoutIconCandidates: Array<LoadoutIcon | null> = [
      weapon ? ({
        key: 'weapon',
        src: getWeaponPaths(weapon),
        label: t(weapon.nameI18n ?? { en: weapon.name }),
        wrap: wrapWeapon(member.weaponId, member.refinement),
      }) : null,
      echo ? ({
        key: 'echo',
        src: getEchoPaths(echo),
        label: t(echo.nameI18n ?? { en: echo.name }),
        wrap: wrapEcho(member.echoId, set),
      }) : null,
      set?.icon ? ({
        key: 'set',
        src: set.icon,
        label: t(set.name),
        wrap: wrapFetter(member.setId),
      }) : null,
    ];
    const loadoutIcons = loadoutIconCandidates.filter((icon): icon is LoadoutIcon => icon !== null);

    return {
      id: member.charId,
      head: character?.head,
      name: character ? t(character.nameI18n ?? { en: character.name }) : member.charId,
      sequence: member.sequence ?? 0,
      loadoutIcons,
    };
  });

  const leadLoadoutIcons: LoadoutIcon[] = activeWeapon && activeWeaponIcon
    ? [{
      key: 'weapon',
      src: activeWeaponIcon,
      label: activeWeaponName ?? 'Weapon',
      wrap: wrapWeapon(activeWeaponId),
    }]
    : [];

  return (
    <div className="py-3">
      <div className="flex items-center gap-1.5 text-xs text-text-primary/40">
        <Link href="/leaderboards" className="transition-colors hover:text-accent">
          Leaderboards
        </Link>
        <span>/</span>
        {characterId ? (
          <Link href={`/characters/${characterId}`} className="transition-colors hover:text-accent">
            {characterName}
          </Link>
        ) : (
          <span className="text-text-primary/60">{characterName}</span>
        )}
        <span>/</span>
        <span className="text-text-primary/60">Leaderboard</span>
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
          {activeTrackNote ? (
            <p className="text-center mt-2">{renderNoteWithTooltips(activeTrackNote)}</p>
          ) : null}
        </div>

        <div className="mt-2 flex w-full max-w-5xl flex-wrap items-start justify-center gap-8 md:gap-10">
          <div className="flex flex-col items-center">
            <div className="h-25 w-25 rounded-3xl border border-white/12 bg-black/16 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
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
            <LoadoutIconRow icons={leadLoadoutIcons} keyPrefix="lead" />
          </div>

          {supportMembers.map((member) => {
            return (
              <div key={member.id} className="flex flex-col items-center">
                <div className="relative h-25 w-25 rounded-3xl border border-white/12 bg-black/16 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
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
                  {member.sequence > 0 && (
                    <span
                      aria-label={`Sequence ${member.sequence}`}
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-black/80 shadow-[0_2px_8px_rgba(0,0,0,0.55)] backdrop-blur-sm"
                    >
                      <span
                        className={`block rounded-full border px-2 py-0.5 text-[11px] font-bold leading-none tracking-wide ${LB_SEQ_BADGE_COLORS[member.sequence]}`}
                      >
                        S{member.sequence}
                      </span>
                    </span>
                  )}
                </div>
                <LoadoutIconRow icons={member.loadoutIcons} keyPrefix={member.id} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
