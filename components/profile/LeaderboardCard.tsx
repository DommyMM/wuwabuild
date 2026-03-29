'use client';

import React, { useMemo } from 'react';
import { BuildCard } from '@/components/edit/BuildCard';
import { BuildProvider } from '@/contexts/BuildContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { DEFAULT_CARD_ART_TRANSFORM } from '@/lib/cardArt';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { SavedState } from '@/lib/build';

interface LeaderboardCardProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry;
}

const READ_ONLY_ART_TRANSFORM = DEFAULT_CARD_ART_TRANSFORM;

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
        <BuildCard
          artTransform={READ_ONLY_ART_TRANSFORM}
          artSourceMode="default"
          customArtUrl={null}
          isArtEditMode={false}
          onCustomArtUpload={() => {}}
          onArtTransformChange={() => {}}
        />
      </StatsProvider>
    </BuildProvider>
  );
};
