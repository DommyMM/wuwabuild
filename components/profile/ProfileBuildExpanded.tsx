'use client';

import React from 'react';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { Character } from '@/lib/character';
import { RegionBadge } from '@/components/leaderboards/constants';
import { ProfileBuildCardStage } from './ProfileBuildCardStage';

interface ProfileBuildExpandedProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry | undefined;
  isExpanded: boolean;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
  onRetryDetail: (buildId: string) => void;
  isLayoutSettled: boolean;
}

/** Table-row placement of the profile card stage */
export const ProfileBuildExpanded: React.FC<ProfileBuildExpandedProps> = ({
  entry,
  detail,
  isExpanded,
  isDetailLoading,
  detailError,
  character,
  characterName,
  regionBadge,
  onRetryDetail,
  isLayoutSettled,
}) => {
  if (!isExpanded) return null;

  // Only the shell is row-specific, clipping the reveal to the row and leaving the card to the table's own scroll
  return (
    <div className="profile-build-expanded-shell overflow-clip border-t border-border/50 bg-black/15 tracking-wide">
      {/* w-full like any row, since a definite width would re-add the shell's 2px borders to the w-max wrapper and force scroll
          Card is a 1440px design-space artifact, so capping it to the visible scrollport at any width would crush it
          It keeps the desktop layout behind the table's own scroll, and only BuildSimulationSection's controls follow */}
      <div className="w-full">
        <ProfileBuildCardStage
          buildId={entry.id}
          entry={entry}
          detail={detail}
          isLayoutSettled={isLayoutSettled}
          isDetailLoading={isDetailLoading}
          detailError={detailError}
          character={character}
          characterName={characterName}
          regionBadge={regionBadge}
          onRetryDetail={onRetryDetail}
        />
      </div>
    </div>
  );
};
