'use client';

import React, { useMemo } from 'react';
import { BuildProvider } from '@/contexts/BuildContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { SavedState } from '@/lib/build';
import { ProfileBuildCard } from './ProfileBuildCard';

interface LeaderboardCardProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, detail }) => {
  const initialState = useMemo<SavedState>(() => ({
    ...detail.buildState,
    watermark: {
      ...detail.buildState.watermark,
      username: entry.owner.username,
      uid: entry.owner.uid,
    },
  }), [detail.buildState, entry.owner.uid, entry.owner.username]);

  return (
    <BuildProvider initialState={initialState} persistDraft={false}>
      <StatsProvider>
        <ProfileBuildCard entry={entry} />
      </StatsProvider>
    </BuildProvider>
  );
};
