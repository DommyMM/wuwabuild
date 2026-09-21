'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { capture } from '@/lib/analytics';
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
  /** Table row, absent in the featured region where the loaded detail stands in as a superset */
  entry?: LBBuildRowEntry;
  detail: LBBuildDetailEntry | undefined;
  /** False while the host animates its width, so the card mounts only once it flips true */
  isLayoutSettled: boolean;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  character: Character | null;
  characterName: string;
  regionBadge: RegionBadge | null;
  onRetryDetail: (buildId: string) => void;
  /** Board key `weaponId:trackKey` to open on, when the caller knows it */
  initialStandingKey?: string | null;
  /** Fired on the card's first ready frame so hosts can sequence their own reveal */
  onVisualReady?: () => void;
}

const INDICATOR_DELAY_MS = 200;
const INDICATOR_MIN_VISIBLE_MS = 400;

/** Progress-indicator visibility that leaves short waits, warm reopens included, indicator-free */
const useLoadingIndicator = (isActive: boolean): boolean => {
  const [isVisible, setIsVisible] = useState(false);
  const shownAtRef = useRef(0);

  useEffect(() => {
    if (isActive) {
      if (isVisible) return;
      // Delayed because a momentary flash reads slower than no indicator
      const showId = window.setTimeout(() => {
        shownAtRef.current = performance.now();
        setIsVisible(true);
      }, INDICATOR_DELAY_MS);
      return () => window.clearTimeout(showId);
    }

    if (!isVisible) return;
    // Once shown it stays a minimum time so it never flickers
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
 * Profile's card view of one build: ProfileCard with the leaderboard bench beneath it
 *
 * Placement-agnostic, so a table row and the featured region render a build identically
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
  // Mirrors the card's board picker, and on "Original forte" ProfileCard still reports a fallback board
  // Keeps the bench usable while the card itself shows the original forte grid
  const [activeBoard, setActiveBoard] = useState<RankBoard | null>(null);
  const [isCardVisualReady, setIsCardVisualReady] = useState(false);
  const [isReplaceDraftOpen, setIsReplaceDraftOpen] = useState(false);
  const handleVisualReady = useCallback(() => {
    setIsCardVisualReady(true);
    onVisualReady?.();
  }, [onVisualReady]);

  /** Loads this build into the editor as the working draft, replacing whatever was there */
  const openInEditor = useCallback(() => {
    if (!detail) return;
    capture('editor_load', {
      surface: 'profile',
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
  // Width stage is choreography with its own motion, not waiting, so its 150ms never counts toward the indicator delay
  // Only post-settle loading (detail fetch, art download) summons the dots, or a shrink-then-reopen would flash them
  const isIndicatorEligible = isLayoutSettled
    && (isDetailLoading || (canMountCard && !isCardVisualReady));
  const showIndicator = useLoadingIndicator(isIndicatorEligible);
  // Reveal waits out a visible indicator's minimum display time, or fires the moment the card is ready
  const isStageRevealed = isCardVisualReady && !showIndicator;

  return (
    <div className="relative mx-auto w-full max-w-368 px-4 py-5" aria-busy={isLoadingActive}>
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
          {/* Mounted only after width settles, so its first visible frame already carries the splash palette */}
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
              surface="profile"
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
