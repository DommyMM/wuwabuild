'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from 'posthog-js';
import { LBBuildDetailEntry, LBBuildRowEntry } from '@/lib/lb';
import { Character } from '@/lib/character';
import { loadDraftBuild, saveDraftBuild } from '@/lib/storage';
import { RegionBadge } from '@/components/leaderboards/constants';
import { BuildSimulationSection } from '@/components/leaderboards/BuildSimulationSection';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RankBoard } from '@/components/card/RankModule';
import { ProfileCard } from './ProfileCard';

interface ProfileBuildCardStageProps {
  buildId: string;
  /** The table row. The featured region has no row, so the loaded detail stands in (it is a superset). */
  entry?: LBBuildRowEntry;
  detail: LBBuildDetailEntry | undefined;
  /** False while the host is still animating its width; the card mounts only once it is true. */
  isLayoutSettled: boolean;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
  onRetryDetail: (buildId: string) => void;
  /** Board key (`weaponId:trackKey`) the card should open on, when the caller knows it. */
  initialStandingKey?: string | null;
  /** Fired when the card's first frame is ready; hosts use it to sequence their own reveal. */
  onVisualReady?: () => void;
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

/**
 * The profile's card view of one build: ProfileCard, its action bar, and the
 * leaderboard bench beneath it. Placement-agnostic. The table row and the
 * featured-build region above the filters both render this, so a build reads
 * identically whichever way the reader arrived at it.
 */
export const ProfileBuildCardStage: React.FC<ProfileBuildCardStageProps> = ({
  buildId,
  entry: rowEntry,
  detail,
  isLayoutSettled,
  isDetailLoading,
  detailError,
  character,
  characterName,
  regionBadge,
  onRetryDetail,
  initialStandingKey = null,
  onVisualReady,
}) => {
  const router = useRouter();
  // Mirrors the card's board picker for ranked cards. When "Original forte" is
  // selected, ProfileCard still reports an equipped/best fallback board so the
  // bench remains usable while the card itself shows the original forte grid.
  const [activeBoard, setActiveBoard] = useState<RankBoard | null>(null);
  const [isCardVisualReady, setIsCardVisualReady] = useState(false);
  const [isReplaceDraftOpen, setIsReplaceDraftOpen] = useState(false);
  const handleVisualReady = useCallback(() => {
    setIsCardVisualReady(true);
    onVisualReady?.();
  }, [onVisualReady]);

  // Loads this build into the editor as the working draft. The profile is the
  // only public surface that offers it, since the leaderboards hand off here.
  const openInEditor = useCallback(() => {
    if (!detail) return;
    posthog.capture('profile_open_in_editor_click', {
      character_id: detail.buildState.characterId ?? null,
      weapon_id: detail.buildState.weaponId ?? null,
    });
    saveDraftBuild(detail.buildState);
    router.push('/edit');
  }, [detail, router]);

  const handleOpenInEditor = useCallback(() => {
    if (!detail) return;
    const currentDraft = loadDraftBuild();
    const wouldReplaceDraft = Boolean(
      currentDraft?.characterId
      && JSON.stringify(currentDraft) !== JSON.stringify(detail.buildState),
    );
    if (wouldReplaceDraft) {
      setIsReplaceDraftOpen(true);
      return;
    }
    openInEditor();
  }, [detail, openInEditor]);

  const entry = rowEntry ?? detail;
  const canMountCard = isLayoutSettled && !isDetailLoading && !detailError && Boolean(detail);
  const showError = isLayoutSettled && !isDetailLoading && Boolean(detailError);
  const isLoadingActive = !isLayoutSettled || isDetailLoading || (canMountCard && !isCardVisualReady);
  // The width stage is choreography with its own visible motion, not waiting,
  // so its 150ms never counts toward the indicator delay. Only genuine
  // post-settle loading (detail fetch, art download) can summon the dots;
  // otherwise a shrink-then-reopen would flash them while a same-width reopen
  // does not.
  const isIndicatorEligible = isLayoutSettled
    && (isDetailLoading || (canMountCard && !isCardVisualReady));
  const showIndicator = useLoadingIndicator(isIndicatorEligible);
  // The reveal waits out an already-visible indicator's minimum display time;
  // when the indicator never fired, the card reveals the moment it is ready.
  const isStageRevealed = isCardVisualReady && !showIndicator;

  return (
    <div className="relative mx-auto w-full max-w-368 px-4 pt-5 pb-3" aria-busy={isLoadingActive}>
      {!isStageRevealed && !showError && (
        <div className={canMountCard ? 'absolute inset-x-4 top-5 z-20' : ''}>
          <ProfileBuildLoading showIndicator={showIndicator} />
        </div>
      )}

      {showError && (
        <ErrorBanner onRetry={() => onRetryDetail(buildId)}>{detailError}</ErrorBanner>
      )}

      {canMountCard && detail && entry && (
        <div
          className="profile-build-card-stage space-y-4"
          data-ready={isStageRevealed}
        >
          {/* ProfileCard is mounted only after width settles. Its first
              visible frame already has the splash palette. */}
          <ProfileCard
            entry={entry}
            detail={detail}
            initialStandingKey={initialStandingKey}
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
              isExpanded
              baseDamage={activeBoard?.damage}
              globalRank={activeBoard?.rank}
              onOpenInEditor={handleOpenInEditor}
            />
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={isReplaceDraftOpen}
        onClose={() => setIsReplaceDraftOpen(false)}
        onConfirm={() => {
          setIsReplaceDraftOpen(false);
          openInEditor();
        }}
        title="Replace editor draft?"
        description="Opening this build will replace the build currently loaded in the editor."
        cancelLabel="Keep Draft"
        confirmLabel="Replace & Open"
        confirmTone="destructive"
      />
    </div>
  );
};
