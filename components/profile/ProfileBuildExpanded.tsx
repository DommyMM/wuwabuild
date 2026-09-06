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

/**
 * The table-row placement of the profile card stage. The shell is the only
 * thing that is row-specific: it clips the reveal to the row and keeps the
 * 1440px design-space card reachable through the table's own horizontal
 * scroll on narrow viewports (see the comment inside).
 */
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

  return (
    <div className="profile-build-expanded-shell overflow-clip border-t border-border/50 bg-black/15 tracking-wide">
      {/* w-full like any row (so a fitting table stays exactly min-w-full; a
          definite width here would re-add the shell's 2px borders to the w-max
          wrapper and force 2px of scroll). The card is a 1440px design-space
          artifact, so it is never capped to the visible scrollport at any
          width — that crushes it. It keeps the desktop layout and is reached by
          the table's own horizontal scroll, and only the controls in
          BuildSimulationSection follow the scroller. */}
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
