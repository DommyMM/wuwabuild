'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LBBuildDetailEntry } from '@/lib/lb';
import { getRankTier } from '@/lib/calculations/rankTier';
import { resolveRegionBadge } from '@/components/leaderboards/formatters';
import { scrollToElementBelowNav } from '@/components/leaderboards/scrollToElementBelowNav';
import { useScrollportVar } from '@/components/leaderboards/useScrollportVar';
import { ProfileBuildCardStage } from './ProfileBuildCardStage';

export interface FeaturedBuildSelection {
  buildId: string;
  /** `weaponId:trackKey` of the board the reader clicked through from, when known. */
  standingKey: string | null;
  /** Character behind the build, when the opener knew it before the detail loaded. */
  characterId: string | null;
  /** Percentile on the board the reader clicked; unknown for a pasted deep link. */
  topPercent: number | null;
}

interface ProfileFeaturedBuildProps {
  uid: string;
  selection: FeaturedBuildSelection;
  detail: LBBuildDetailEntry | undefined;
  isDetailLoading: boolean;
  detailError: string | null | undefined;
  isLayoutSettled: boolean;
  onRetryDetail: (buildId: string) => void;
  onClose: () => void;
}

/**
 * The card placement for builds that arrive without a table row: a rankings
 * tile, a `?buildId=` deep link, or the echo inventory's "Equipped by" strip.
 * Sits between the rankings shelf and the filters so a tile and its card stay
 * adjacent, and it is not part of the build query, so filtering and paging the
 * table below never disturb it.
 *
 * The tier-colored top edge is the tile's own edge continued: the same 2px,
 * the same color, so the open card reads as that tile's drawer.
 */
export const ProfileFeaturedBuild: React.FC<ProfileFeaturedBuildProps> = ({
  uid,
  selection,
  detail,
  isDetailLoading,
  detailError,
  isLayoutSettled,
  onRetryDetail,
  onClose,
}) => {
  const { getCharacter } = useGameData();
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const scrollportRef = useScrollportVar();

  const characterId = detail?.character.id ?? selection.characterId;
  const character = getCharacter(characterId);
  const characterName = character ? t(character.nameI18n ?? { en: character.name }) : null;
  const regionBadge = resolveRegionBadge(uid);
  const tier = selection.topPercent !== null ? getRankTier(selection.topPercent) : null;

  // A tile is usually on screen when it is clicked; a deep link lands cold.
  // Both end with the region under the sticky nav, once per build.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const frame = window.requestAnimationFrame(() => scrollToElementBelowNav(node));
    return () => window.cancelAnimationFrame(frame);
  }, [selection.buildId]);

  return (
    <section
      ref={sectionRef}
      aria-label={characterName ? `${characterName} build` : 'Featured build'}
      className="relative border-b border-border/70 bg-black/15"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-0.5"
        style={tier
          ? { background: tier.color, boxShadow: tier.glow ? `0 0 10px ${tier.glow}` : undefined }
          : { background: 'color-mix(in srgb, var(--color-accent) 45%, transparent)' }}
      />

      {/* The card names itself, so this strip is only the way out. */}
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close build"
          title="Close"
          className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-text-primary/50 transition-[background-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-background/60 hover:text-text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <X size={16} aria-hidden />
        </button>
      </div>

      {/* Below md the card keeps its 1440px design space and scrolls sideways
          in its own scroller (this is not inside the table, so it is the only
          one); from md up CardScaler shrinks it to fit. --scrollport keeps the
          bench controls over the visible strip while scrolled. */}
      <div ref={scrollportRef} className="-mt-3 w-full max-md:overflow-x-auto">
        <div className="max-md:min-w-360">
          <ProfileBuildCardStage
            buildId={selection.buildId}
            detail={detail}
            isLayoutSettled={isLayoutSettled}
            isDetailLoading={isDetailLoading}
            detailError={detailError}
            character={character}
            characterName={characterName ?? characterId ?? 'build'}
            regionBadge={regionBadge}
            onRetryDetail={onRetryDetail}
            initialStandingKey={selection.standingKey}
          />
        </div>
      </div>
    </section>
  );
};
