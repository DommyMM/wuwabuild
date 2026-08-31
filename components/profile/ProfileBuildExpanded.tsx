'use client';

import React, { useCallback, useState } from 'react';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { Character } from '@/lib/character';
import { Echo } from '@/lib/echo';
import { RegionBadge } from '@/components/leaderboards/constants';
import { BuildSimulationSection } from '@/components/leaderboards/BuildSimulationSection';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RankBoard } from '@/components/card/RankModule';
import { ProfileCard } from './ProfileCard';

interface ProfileBuildExpandedProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry | undefined;
  isExpanded: boolean;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
  statIcons: Record<string, string> | null;
  getEcho: (id: string | null) => Echo | null;
  translateText: (i18n: Record<string, string> | undefined, fallback: string) => string;
  onRetryDetail: (buildId: string) => void;
  isLayoutSettled: boolean;
}

const ProfileBuildLoading: React.FC = () => (
  <div
    className="flex min-h-24 items-center justify-center gap-2.5 font-ropa text-2xs uppercase tracking-[0.18em] text-text-primary/50"
    role="status"
  >
    <span>Loading build</span>
    <span className="flex items-center gap-1" aria-hidden="true">
      <span className="profile-build-loading-dot" />
      <span className="profile-build-loading-dot [animation-delay:120ms]" />
      <span className="profile-build-loading-dot [animation-delay:240ms]" />
    </span>
  </div>
);

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
  // Mirrors the card's board picker for ranked cards. When "Original forte" is
  // selected, ProfileCard still reports an equipped/best fallback board so the
  // bench remains usable while the card itself shows the original forte grid.
  const [activeBoard, setActiveBoard] = useState<RankBoard | null>(null);
  const [isCardVisualReady, setIsCardVisualReady] = useState(false);
  const handleVisualReady = useCallback(() => setIsCardVisualReady(true), []);

  if (!isExpanded) return null;

  const canMountCard = isLayoutSettled && !isDetailLoading && !detailError && Boolean(detail);
  const showLoading = !isLayoutSettled || isDetailLoading || (canMountCard && !isCardVisualReady);

  return (
    <div
      className="profile-build-expanded-shell overflow-clip border-t border-border/50 bg-black/15 tracking-wide"
      aria-busy={showLoading}
    >
      {/* w-full like any row (so a fitting table stays exactly min-w-full;
          a definite width here would re-add the shell's 2px borders to the
          w-max wrapper and force 2px of scroll), capped at the measured
          scrollport (--scrollport, useScrollportVar) and pinned sticky so
          the card stays visible when the rows genuinely overflow. */}
      <div className="sticky left-0 w-full max-w-(--scrollport,none)">
        <div className="relative mx-auto w-full max-w-368 px-4 pt-5 pb-3">
          {showLoading && (
            <div className={canMountCard ? 'absolute inset-x-4 top-5 z-20' : ''}>
              <ProfileBuildLoading />
            </div>
          )}

          {isLayoutSettled && !isDetailLoading && detailError && (
            <ErrorBanner onRetry={() => onRetryDetail(entry.id)}>{detailError}</ErrorBanner>
          )}

          {canMountCard && detail && (
            <div
              className="profile-build-card-stage space-y-4"
              data-ready={isCardVisualReady}
            >
              {/* ProfileCard is mounted only after width settles. Its first
                  visible frame already has the splash palette. */}
              <ProfileCard
                entry={entry}
                detail={detail}
                onActiveBoardChange={setActiveBoard}
                onVisualReady={handleVisualReady}
              />

              {isCardVisualReady && (
                <BuildSimulationSection
                  buildId={detail.id}
                  buildDetail={detail}
                  character={character}
                  characterId={detail.buildState.characterId ?? ''}
                  characterName={characterName}
                  regionBadge={regionBadge}
                  activeWeaponId={activeBoard?.weaponId ?? ''}
                  activeTrackKey={activeBoard?.trackKey ?? ''}
                  isExpanded={isExpanded}
                  baseDamage={activeBoard?.damage}
                  globalRank={activeBoard?.rank}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
