'use client';

import React, { useMemo } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { TalentPills } from '@/components/card/TalentPills';
import { RankBoard, RankLoadoutIcon, RankModule, RankTeamMember } from '@/components/card/RankModule';
import { LBStandingEntry, LBTeamMemberConfig } from '@/lib/lb';
import { CDNFetter } from '@/lib/echo';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';
import { EchoHoverCard } from '@/components/echo/EchoHoverCard';
import { FetterHoverCard } from '@/components/echo/FetterHoverCard';

interface ProfileRankSectionProps {
  availableBoards: RankBoard[];
  activeBoard: RankBoard | null;
  standings: LBStandingEntry[];
  standingsLoading: boolean;
}

/**
 * The variant slot that replaces <ForteCardSection> in the profile flow.
 * Renders the condensed forte chips above a RankModule. Designed to occupy
 * roughly the same vertical space (~124px) as the original ForteCardSection
 * so the rest of the card layout (echoes, stats) stays put.
 */
export const ProfileRankSection: React.FC<ProfileRankSectionProps> = ({
  availableBoards,
  activeBoard,
  standings,
  standingsLoading,
}) => {
  const selected = useSelectedCharacter();
  const { state } = useBuild();
  const { getWeapon, getCharacter, getEcho, fetters, statIcons } = useGameData();
  const { t } = useLanguage();

  const wrapWeapon = React.useCallback((weaponId?: string, refinement?: number) => {
    const weapon = getWeapon(weaponId ?? null);
    if (!weapon) return undefined;

    const rank = refinement && refinement > 0 ? refinement : 1;
    const atk90 = Math.floor(weapon.ATK * 12.5);
    const mainStat90 = parseFloat((weapon.base_main * 4.5).toFixed(1));
    const atkIcon = statIcons?.ATK;
    const mainStatIcon = weapon.main_stat ? (statIcons?.[weapon.main_stat] ?? null) : null;

    return function wrapWeaponTrigger(trigger: React.ReactNode) {
      return (
        <WeaponHoverCard
          placement="top"
          triggerClassName="flex"
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
        <EchoHoverCard placement="top" triggerClassName="flex" echo={echo} resolvedFetter={fetter ?? null}>
          {trigger}
        </EchoHoverCard>
      );
    };
  }, [getEcho]);

  const wrapFetter = React.useCallback((setId?: string) => {
    const fetter = fetters.find((entry) => String(entry.id) === setId);
    if (!fetter) return undefined;

    return function wrapFetterTrigger(trigger: React.ReactNode) {
      return (
        <FetterHoverCard placement="top" triggerClassName="flex" fetter={fetter}>
          {trigger}
        </FetterHoverCard>
      );
    };
  }, [fetters]);

  const canonicalStanding = useMemo<LBStandingEntry | null>(() => {
    if (!activeBoard) return null;
    return (
      standings.find((s) => (
        (s.key && s.key === activeBoard.key) ||
        (`${s.weaponId}:${s.trackKey}` === activeBoard.key)
      )) ?? null
    );
  }, [standings, activeBoard]);

  const team = useMemo<RankTeamMember[]>(() => {
    if (!selected || !canonicalStanding) return [];

    const leadMember: RankTeamMember = {
      id: `lead-${selected.character.id}`,
      name: t(selected.nameI18n),
      head: selected.head,
      sequence: 0,
      isLead: true,
      loadoutIcons: [],
    };

    const supportMembers = canonicalStanding.teamMembers
      .filter((member) => member.charId !== selected.character.id)
      .map((member: LBTeamMemberConfig) => {
        const supportChar = getCharacter(member.charId);
        const supportWeapon = getWeapon(member.weaponId ?? null);
        const supportEcho = getEcho(member.echoId ?? null);
        const supportSet = fetters.find((f) => String(f.id) === member.setId);

        const iconCandidates: Array<RankLoadoutIcon | null> = [
          supportWeapon ? {
            key: 'weapon',
            src: getWeaponPaths(supportWeapon),
            label: t(supportWeapon.nameI18n ?? { en: supportWeapon.name }),
            wrap: wrapWeapon(member.weaponId, member.refinement),
          } : null,
          supportEcho ? {
            key: 'echo',
            src: getEchoPaths(supportEcho),
            label: t(supportEcho.nameI18n ?? { en: supportEcho.name }),
            wrap: wrapEcho(member.echoId, supportSet),
          } : null,
          supportSet?.icon ? {
            key: 'set',
            src: supportSet.icon,
            label: t(supportSet.name),
            wrap: wrapFetter(member.setId),
          } : null,
        ];
        const icons = iconCandidates.filter((icon): icon is RankLoadoutIcon => icon !== null);

        return {
          id: `support-${member.charId}`,
          name: supportChar ? t(supportChar.nameI18n ?? { en: supportChar.name }) : member.charId,
          head: supportChar?.head ?? supportChar?.iconRound,
          sequence: member.sequence ?? 0,
          loadoutIcons: icons,
        };
      });

    return [leadMember, ...supportMembers];
  }, [selected, canonicalStanding, getWeapon, t, getCharacter, getEcho, fetters, wrapWeapon, wrapEcho, wrapFetter]);

  if (!selected) return null;

  return (
    <div className="flex flex-col items-start gap-2 overflow-visible">
      <TalentPills character={selected.character} forte={state.forte} />
      <RankModule
        board={activeBoard}
        team={team}
        loading={standingsLoading && availableBoards.length === 0}
      />
    </div>
  );
};
