'use client';

import React, { useMemo } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { TalentPills } from '@/components/card/TalentPills';
import { RankBoard, RankLoadoutIcon, RankModule, RankTeamMember } from '@/components/card/RankModule';
import { LBStandingEntry, LBTeamMemberConfig } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';

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
  const { getWeapon, getCharacter, getEcho, fetters } = useGameData();
  const { t } = useLanguage();

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

        const icons: RankLoadoutIcon[] = [
          supportWeapon ? {
            key: 'weapon',
            src: getWeaponPaths(supportWeapon),
            label: t(supportWeapon.nameI18n ?? { en: supportWeapon.name }),
          } : null,
          supportEcho ? {
            key: 'echo',
            src: getEchoPaths(supportEcho),
            label: t(supportEcho.nameI18n ?? { en: supportEcho.name }),
          } : null,
          supportSet?.icon ? {
            key: 'set',
            src: supportSet.icon,
            label: t(supportSet.name),
          } : null,
        ].filter((icon): icon is RankLoadoutIcon => icon !== null);

        return {
          id: `support-${member.charId}`,
          name: supportChar ? t(supportChar.nameI18n ?? { en: supportChar.name }) : member.charId,
          head: supportChar?.head ?? supportChar?.iconRound,
          sequence: member.sequence ?? 0,
          loadoutIcons: icons,
        };
      });

    return [leadMember, ...supportMembers];
  }, [selected, canonicalStanding, getWeapon, t, getCharacter, getEcho, fetters]);

  if (!selected) return null;

  return (
    <div className="flex flex-col gap-2">
      <TalentPills character={selected.character} forte={state.forte} />
      <RankModule
        board={activeBoard}
        team={team}
        loading={standingsLoading && availableBoards.length === 0}
      />
    </div>
  );
};
