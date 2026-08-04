'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProfileStandings, LBProfileStandingEntry } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { computeTopPercent, getRankTier } from '@/lib/calculations/rankTier';
import { ITEMS_PER_PAGE, stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { buildLeaderboardHref } from '@/components/leaderboards/character/leaderboardCharacterQuery';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';

interface ProfileShowcaseProps {
  uid: string;
  onFeaturedEntry?: (entry: LBProfileStandingEntry | null) => void;
}

const TILE_W = 184;
const TILE_GAP = 8;
const PROFILE_SEQUENCE_BADGE_COLORS = [
  'border-slate-300/65 bg-slate-500/30 text-slate-100',
  'border-cyan-300/65 bg-cyan-500/30 text-cyan-100',
  'border-blue-300/65 bg-blue-500/30 text-blue-100',
  'border-violet-300/65 bg-violet-500/30 text-violet-100',
  'border-fuchsia-300/65 bg-fuchsia-500/30 text-fuchsia-100',
  'border-amber-300/70 bg-amber-500/35 text-amber-100',
  'border-spectro/80 bg-spectro/35 text-spectro',
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

export const ProfileShowcase: React.FC<ProfileShowcaseProps> = ({ uid, onFeaturedEntry }) => {
  const { getCharacter, getWeapon, statIcons } = useGameData();
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
    onFeaturedEntry?.(entries[0] ?? null);
  }, [entries, loading, onFeaturedEntry]);

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
    <div className="border-b border-border/70 px-6 py-4">
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className="text-2xs font-semibold tracking-wider text-text-primary/55 uppercase">Rankings</h2>
        {!loading && entries.length > 0 && (
          <span className="text-3xs tabular-nums text-text-primary/35">
            {entries.length} character{entries.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[116px] w-[184px] shrink-0 animate-pulse rounded-md border border-border bg-background/50" />
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
                  : 'flex snap-x snap-proximity flex-nowrap gap-2 overflow-x-auto pb-1.5 scrollbar-none hover:[&::-webkit-scrollbar]:h-0 hover:[&::-webkit-scrollbar]:h-1.5'
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
              const highlightPercent = topPercent <= 10;
              const percentStyle = highlightPercent
                ? {
                    color: tier.color,
                    textShadow: tier.glow ? `0 0 8px ${tier.glow}` : undefined,
                  }
                : undefined;
              const baseLabel = stripLBSeqPrefix(entry.trackLabel || entry.trackKey) || 'DMG';
              const href = buildLeaderboardHref(entry.characterId, {
                page: Math.max(1, Math.ceil(entry.rank / ITEMS_PER_PAGE)),
                weaponId: entry.weaponId,
                track: entry.trackKey,
                buildId: entry.buildId,
              });
              const atkIcon = statIcons?.ATK;
              const mainStatIcon = weapon?.main_stat ? (statIcons?.[weapon.main_stat] ?? null) : null;
              const weaponBadge = (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background/75 backdrop-blur-sm">
                  <img src={getWeaponPaths(weapon)} alt={weaponName} className="h-9 w-9 object-contain" />
                </span>
              );
              const tileClassName = showAll
                ? 'group relative h-[116px] w-[184px] shrink-0 overflow-hidden rounded-md border border-border bg-background-secondary/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 max-[560px]:w-full'
                : 'group relative h-[116px] w-[184px] shrink-0 snap-start overflow-hidden rounded-md border border-border bg-background-secondary/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70';

              return (
                <Link
                  key={`${entry.characterId}:${entry.buildId}`}
                  href={href}
                  title={`${characterName} · ${weaponName} R${entry.weaponRank} · ${baseLabel} S${entry.sequence}`}
                  aria-label={`${characterName}, ${weaponName} R${entry.weaponRank}, ${baseLabel} board S${entry.sequence}, top ${formatPercent(topPercent)} percent, rank ${entry.rank.toLocaleString()} of ${entry.total.toLocaleString()}`}
                  className={tileClassName}
                >
                  {/* Character face — right-anchored hero art, full color, faded into the card. */}
                  {character?.head && (
                    <img
                      src={character.head}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[66%] object-cover object-top mask-[linear-gradient(to_right,transparent,black_40%)]"
                    />
                  )}

                  {/* Scrim — darkens the text column so data stays legible over the art. */}
                  <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-background-secondary from-22% via-background-secondary/48 to-transparent" />

                  {/* Tier-colored top edge — the achievement signal. */}
                  <span
                    className="absolute inset-x-0 top-0 z-10 h-[2px]"
                    style={{ background: tier.color, boxShadow: tier.glow ? `0 0 10px ${tier.glow}` : undefined }}
                  />

                  {/* Weapon — constrained to an uploaded weapon for this summary. */}
                  <span className="absolute right-2 bottom-2 z-10 flex">
                    {weapon ? (
                      <WeaponHoverCard
                        placement="top"
                        triggerClassName="flex"
                        weapon={weapon}
                        weaponLevel={90}
                        weaponRank={entry.weaponRank}
                        scaledAtk={Math.floor(weapon.ATK * 12.5)}
                        scaledMainStat={parseFloat((weapon.base_main * 4.5).toFixed(1))}
                        atkIcon={atkIcon}
                        mainStatIcon={mainStatIcon}
                      >
                        {weaponBadge}
                      </WeaponHoverCard>
                    ) : weaponBadge}
                  </span>

                  {/* Data column: character + track · percentile (hero) · exact rank. */}
                  <div className="relative z-10 flex h-full flex-col justify-between p-3">
                    <div className="flex min-w-0 items-start gap-1.5">
                      <div className="min-w-0 flex-1">
                        <span className={`block truncate font-bold text-text-primary/90 uppercase ${compactCharacterName ? 'text-3xs tracking-[0.04em]' : 'text-2xs tracking-wider'}`}>
                          {characterName}
                        </span>
                        <span className="mt-0.5 block truncate text-[8px] font-semibold tracking-[0.16em] text-text-primary/45 uppercase">
                          {baseLabel}
                        </span>
                      </div>
                      <span className={`shrink-0 rounded border px-2 py-0.5 text-[8px] font-semibold tracking-wide shadow-sm backdrop-blur-sm ${boardSequenceClass}`}>
                        S{entry.sequence} BOARD
                      </span>
                    </div>

                    <div className="flex w-[63%] items-baseline gap-0.5 leading-none">
                      <span className="text-[25px] font-bold tabular-nums text-text-primary/90" style={percentStyle}>
                        {formatPercent(topPercent)}
                      </span>
                      <span className="text-sm font-semibold text-text-primary/75" style={percentStyle}>%</span>
                    </div>

                    <div className="flex w-[63%] items-baseline gap-1">
                      <span className="text-sm font-bold tabular-nums text-text-primary/85">#{entry.rank.toLocaleString()}</span>
                      <span className="text-3xs tabular-nums text-text-primary/40">/ {formatCount(entry.total)}</span>
                    </div>
                  </div>
                </Link>
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
