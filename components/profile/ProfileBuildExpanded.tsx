'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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
}

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
}) => {
  // Mirrors the card's board picker for ranked cards. When "Original forte" is
  // selected, ProfileCard still reports an equipped/best fallback board so the
  // bench remains usable while the card itself shows the original forte grid.
  const [activeBoard, setActiveBoard] = useState<RankBoard | null>(null);
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          // Matches the leaderboard expansion: ease-out on enter, and only an
          // opacity crossfade under reduced motion. `overflow-x-visible` beside
          // a hidden y computes to `auto`, so both axes clip explicitly.
          transition={prefersReducedMotion
            ? { duration: 0.12, ease: 'linear' }
            : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden border-t border-border/50 bg-black/15 tracking-wide"
        >
          <div className="mx-auto w-full max-w-368 space-y-4 px-4 pt-5 pb-3">
            {isDetailLoading && (
              <div className="flex items-center justify-center gap-3 py-8 text-sm text-text-primary/55">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/40 border-t-accent" />
                Loading build details...
              </div>
            )}

            {!isDetailLoading && detailError && (
              <ErrorBanner onRetry={() => onRetryDetail(entry.id)}>{detailError}</ErrorBanner>
            )}

            {!isDetailLoading && !detailError && detail && (
              <>
                {/* ── ProfileCard the hero visual (includes substat row + action bar) ── */}
                <ProfileCard entry={entry} detail={detail} onActiveBoardChange={setActiveBoard} />

                {/* ── Full breakdown bench (same as the boards), scoped to the picked board ── */}
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
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
