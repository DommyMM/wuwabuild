'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const INDICATOR_DELAY_MS = 200;
const INDICATOR_MIN_VISIBLE_MS = 400;

/**
 * Standard progress-indicator timing: opens that finish within the delay show
 * nothing at all (an indicator flashing for a moment reads slower than no
 * indicator), and one that does appear stays up a minimum time so it never
 * flickers. Warm reopens resolve inside the delay and stay indicator-free.
 */
const useLoadingIndicator = (isActive: boolean): boolean => {
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (isActive) {
      if (isVisible) return;
      const showId = window.setTimeout(() => {
        shownAtRef.current = performance.now();
        setIsVisible(true);
      }, INDICATOR_DELAY_MS);
      return () => window.clearTimeout(showId);
    }

    if (!isVisible) return;
    const remaining = INDICATOR_MIN_VISIBLE_MS - (performance.now() - shownAtRef.current);
    if (remaining <= 0) {
      setIsVisible(false);
      return;
    }
    const hideId = window.setTimeout(() => setIsVisible(false), remaining);
    return () => window.clearTimeout(hideId);
  }, [isActive, isVisible]);

  return isVisible;
};

const ProfileBuildLoading: React.FC<{ showIndicator: boolean }> = ({ showIndicator }) => (
  <div className="flex min-h-24 items-center justify-center" role="status">
    <span className="sr-only">Loading build</span>
    {showIndicator && (
      <span className="flex items-center gap-1.5" aria-hidden="true">
        <span className="profile-build-loading-dot" />
        <span className="profile-build-loading-dot [animation-delay:120ms]" />
        <span className="profile-build-loading-dot [animation-delay:240ms]" />
      </span>
    )}
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

  const canMountCard = isLayoutSettled && !isDetailLoading && !detailError && Boolean(detail);
  const showError = isLayoutSettled && !isDetailLoading && Boolean(detailError);
  const isLoadingActive = !isLayoutSettled || isDetailLoading || (canMountCard && !isCardVisualReady);
  // The width stage is choreography with its own visible motion, not waiting,
  // so its 150ms never counts toward the indicator delay. Only genuine
  // post-settle loading (detail fetch, art download) can summon the dots;
  // otherwise a shrink-then-reopen would flash them while a same-width reopen
  // does not.
  const isIndicatorEligible = isExpanded && isLayoutSettled
    && (isDetailLoading || (canMountCard && !isCardVisualReady));
  const showIndicator = useLoadingIndicator(isIndicatorEligible);
  // The reveal waits out an already-visible indicator's minimum display time;
  // when the indicator never fired, the card reveals the moment it is ready.
  const isStageRevealed = isCardVisualReady && !showIndicator;

  if (!isExpanded) return null;

  return (
    <div
      className="profile-build-expanded-shell overflow-clip border-t border-border/50 bg-black/15 tracking-wide"
      aria-busy={isLoadingActive}
    >
      {/* w-full like any row (so a fitting table stays exactly min-w-full;
          a definite width here would re-add the shell's 2px borders to the
          w-max wrapper and force 2px of scroll), capped at the measured
          scrollport (--scrollport, useScrollportVar) and pinned sticky so
          the card stays visible when the rows genuinely overflow. */}
      <div className="sticky left-0 w-full max-w-(--scrollport,none)">
        <div className="relative mx-auto w-full max-w-368 px-4 pt-5 pb-3">
          {!isStageRevealed && !showError && (
            <div className={canMountCard ? 'absolute inset-x-4 top-5 z-20' : ''}>
              <ProfileBuildLoading showIndicator={showIndicator} />
            </div>
          )}

          {showError && (
            <ErrorBanner onRetry={() => onRetryDetail(entry.id)}>{detailError}</ErrorBanner>
          )}

          {canMountCard && detail && (
            <div
              className="profile-build-card-stage space-y-4"
              data-ready={isStageRevealed}
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
