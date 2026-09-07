'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProfileStandings, LBProfileStandingEntry } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { computeTopPercent, getRankTier } from '@/lib/calculations/rankTier';
import { stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';

interface ProfileShowcaseProps {
  uid: string;
  /** The ranked standings once loaded (best board per character, best first); the header reads its facts from them. */
  onStandingsLoaded?: (entries: LBProfileStandingEntry[]) => void;
  /** Build currently open in the featured region, so its tile reads as selected. */
  activeBuildId: string | null;
  /** Tile click: open (or, on the active tile, close) that build's card below the shelf. */
  onSelectBuild: (entry: LBProfileStandingEntry) => void;
}

const TILE_W = 184;
const TILE_GAP = 8;
// The site's sequence ramp at a whisper: the chip says which board the number
// is on, but on a shelf where most tiles share one sequence it must not
// outshout the percentile or the tier edge. Same hues, lower alpha.
const PROFILE_SEQUENCE_BADGE_COLORS = [
  'border-slate-300/35 bg-slate-500/15 text-slate-200/85',
  'border-cyan-300/35 bg-cyan-500/15 text-cyan-100/85',
  'border-blue-300/35 bg-blue-500/15 text-blue-100/85',
  'border-violet-300/35 bg-violet-500/15 text-violet-100/85',
  'border-fuchsia-300/35 bg-fuchsia-500/15 text-fuchsia-100/85',
  'border-amber-300/40 bg-amber-500/15 text-amber-100/85',
  'border-spectro/45 bg-spectro/15 text-spectro/85',
] as const;

// Bare percentile, scaled precision: the number is the hero, so it should read
// cleanly whether it is 0.003 or 42.1.
function formatPercent(topPercent: number): string {
  if (topPercent < 1) return topPercent.toFixed(2);
  return topPercent.toFixed(1);
}

function formatCount(n: number): string {
  if (n < 10_000) return n.toLocaleString();
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

export const ProfileShowcase: React.FC<ProfileShowcaseProps> = ({ uid, onStandingsLoaded, activeBuildId, onSelectBuild }) => {
  const { getCharacter, getWeapon } = useGameData();
  const { t } = useLanguage();
  const [state, setState] = useState<{ uid: string; entries: LBProfileStandingEntry[]; loading: boolean }>(() => ({
    uid,
    entries: [],
    loading: true,
  }));
  // The profile header is a summary shelf by default. Players can expand it to
  // a wrapped grid without losing the compact first read.
  const [showAll, setShowAll] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // The controller is only an unmount flag; the shared fetch itself is not
    // abortable (see getProfileStandings).
    const controller = new AbortController();
    getProfileStandings(uid)
      .then((result) => {
        if (!controller.signal.aborted) setState({ uid, entries: result, loading: false });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ uid, entries: [], loading: false });
      });
    return () => controller.abort();
  }, [uid]);

  const loading = state.uid !== uid || state.loading;
  const entries = useMemo(
    () => state.uid === uid ? state.entries : [],
    [state.entries, state.uid, uid],
  );

  useEffect(() => {
    if (loading) return;
    onStandingsLoaded?.(entries);
  }, [entries, loading, onStandingsLoaded]);

  // The condense/expand toggle is only meaningful when the tiles can't all sit
  // in a single row at the current width.
  const measure = useCallback((count: number) => {
    const el = containerRef.current;
    if (!el) return;
    const perRow = Math.max(1, Math.floor((el.clientWidth + TILE_GAP) / (TILE_W + TILE_GAP)));
    setOverflows(count > perRow);
  }, []);

  useLayoutEffect(() => {
    measure(entries.length);
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure(entries.length));
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, entries.length]);

  // Collapse entirely once we know there are no ranked boards.
  if (!loading && entries.length === 0) return null;

  const showToggle = !loading && overflows;

  return (
    // group/shelf: the strip's scrollbar shows only while the pointer is over
    // the shelf (or a tile has focus). The character count lives in the
    // header's fact row, not here.
    <div className="group/shelf border-b border-border/70 px-6 py-4">
      <h2 className="mb-3 text-2xs font-semibold tracking-wider text-text-primary/55 uppercase">Rankings</h2>

      {loading ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-29 w-46 shrink-0 animate-pulse rounded-md border border-border bg-background/50" />
          ))}
        </div>
      ) : (
        <>
          <div className="relative">
            <div
              ref={containerRef}
              className={
                showAll
                  ? 'flex flex-wrap gap-2 max-[560px]:grid max-[560px]:grid-cols-2'
                  // The bar keeps its 6px so nothing shifts; only its colour
                  // comes and goes. scrollbar-color for Chrome/Firefox, the
                  // thumb rule for Safari (which uses overlay bars anyway).
                  : 'flex snap-x snap-proximity flex-nowrap gap-2 overflow-x-auto pb-1.5 [scrollbar-color:transparent_transparent] group-hover/shelf:[scrollbar-color:rgba(191,173,125,0.6)_transparent] group-focus-within/shelf:[scrollbar-color:rgba(191,173,125,0.6)_transparent] [&::-webkit-scrollbar-thumb]:bg-transparent group-hover/shelf:[&::-webkit-scrollbar-thumb]:bg-[rgba(191,173,125,0.6)] group-focus-within/shelf:[&::-webkit-scrollbar-thumb]:bg-[rgba(191,173,125,0.6)]'
              }
            >
              {entries.map((entry) => {
              const character = getCharacter(entry.characterId);
              const weapon = getWeapon(entry.weaponId) ?? null;
              const characterName = character ? t(character.nameI18n ?? { en: character.name }) : entry.characterId;
              const compactCharacterName = characterName.length > 16;
              const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : entry.weaponId;
              const topPercent = computeTopPercent(entry.rank, entry.total);
              const tier = getRankTier(topPercent);
              const boardSequenceClass = PROFILE_SEQUENCE_BADGE_COLORS[entry.sequence]
                || 'border-slate-400/45 bg-slate-500/15 text-slate-200';
              const baseLabel = stripLBSeqPrefix(entry.trackLabel || entry.trackKey) || 'DMG';
              const isActive = activeBuildId === entry.buildId;
              const weaponBadge = (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background/75 backdrop-blur-sm">
                  <img src={getWeaponPaths(weapon)} alt={weaponName} className="h-9 w-9 object-contain" />
                </span>
              );
              // The whole tile is one target: it opens the card beneath the
              // shelf. The way on to the board is the rank module inside that
              // card, so nothing here competes with the tile click. Hover is the
              // site's gold glow and nothing more: a strip of 27 tiles is
              // crossed by the pointer constantly, so the tile's only motion is
              // the press. The open tile holds the glow with a firmer border.
              const tileClassName = `relative h-[116px] w-[184px] shrink-0 cursor-pointer overflow-hidden rounded-md border bg-background-secondary/80 text-left transition-[border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 motion-reduce:transition-none ${
                isActive
                  ? 'border-accent/60 shadow-[0_0_16px_rgba(166,150,98,0.35)]'
                  : 'border-border hover:border-accent/40 hover:shadow-[0_0_16px_rgba(166,150,98,0.35)]'
              } ${showAll ? 'max-[560px]:w-full' : 'snap-start'}`;

              return (
                <button
                  key={`${entry.characterId}:${entry.buildId}`}
                  type="button"
                  onClick={() => onSelectBuild(entry)}
                  aria-pressed={isActive}
                  aria-label={`${characterName}, ${weaponName} R${entry.weaponRank}, ${baseLabel} board S${entry.sequence}, top ${formatPercent(topPercent)} percent, rank ${entry.rank.toLocaleString()} of ${entry.total.toLocaleString()}. ${isActive ? 'Close build' : 'Show build'}`}
                  className={tileClassName}
                >
                  {/* Character face: right-anchored hero art, full color, faded into the card. */}
                  {character?.head && (
                    <img
                      src={character.head}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[66%] object-cover object-top mask-[linear-gradient(to_right,transparent,black_40%)]"
                    />
                  )}

                  {/* Scrim: darkens the text column so data stays legible over the art. */}
                  <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-background-secondary from-22% via-background-secondary/48 to-transparent" />

                  {/* Tier-colored top edge: the one place the tile carries its tier at rest. */}
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5"
                    style={{ background: tier.color, boxShadow: tier.glow ? `0 0 10px ${tier.glow}` : undefined }}
                  />

                  {/* Weapon: constrained to an uploaded weapon for this summary. The hover card carries its name, refinement and Lv.90 stats. */}
                  <span className="absolute right-2 bottom-2 z-20 flex">
                    {weapon ? (
                      <WeaponHoverCard placement="top" triggerClassName="flex" weapon={weapon} weaponRank={entry.weaponRank}>
                        {weaponBadge}
                      </WeaponHoverCard>
                    ) : weaponBadge}
                  </span>

                  {/* Data column: character + track, percentile (hero), exact rank. */}
                  <div className="pointer-events-none relative z-20 flex h-full flex-col justify-between p-3">
                    <div className="flex min-w-0 items-start gap-1.5">
                      <div className="min-w-0 flex-1">
                        <span className={`block truncate font-bold text-text-primary/90 uppercase ${compactCharacterName ? 'text-3xs tracking-[0.04em]' : 'text-2xs tracking-wider'}`}>
                          {characterName}
                        </span>
                        <span className="mt-0.5 block truncate text-[8px] font-semibold tracking-[0.16em] text-text-primary/45 uppercase">
                          {baseLabel}
                        </span>
                      </div>
                      <span className={`shrink-0 rounded border px-1.5 py-px text-[8px] font-semibold tracking-wide backdrop-blur-sm ${boardSequenceClass}`}>
                        S{entry.sequence} BOARD
                      </span>
                    </div>

                    <div className="flex w-[63%] items-baseline gap-0.5 leading-none">
                      <span className="text-[25px] font-bold tabular-nums text-text-primary/90">
                        {formatPercent(topPercent)}
                      </span>
                      <span className="text-sm font-semibold text-text-primary/75">%</span>
                    </div>

                    <div className="flex w-[63%] items-baseline gap-1">
                      <span className="text-sm font-bold tabular-nums text-text-primary/85">#{entry.rank.toLocaleString()}</span>
                      <span className="text-3xs tabular-nums text-text-primary/40">/ {formatCount(entry.total)}</span>
                    </div>
                  </div>
                </button>
              );
              })}
            </div>
            {!showAll && overflows && (
              <span className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-background-secondary/75 to-transparent" aria-hidden />
            )}
          </div>
          {showToggle && (
            <div className="mt-1.5 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll((value) => !value)}
                aria-expanded={showAll}
                aria-label={showAll ? 'Show fewer rankings' : `Show all ${entries.length} rankings`}
                className="flex h-7 w-14 items-center justify-center rounded-md text-text-primary/40 transition-colors hover:bg-background/60 hover:text-text-primary/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <ChevronDown size={16} className={`transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
