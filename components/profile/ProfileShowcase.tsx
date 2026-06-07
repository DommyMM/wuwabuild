'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getProfileStandings, LBProfileStandingEntry } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { computeTopPercent, getRankTier } from '@/lib/calculations/rankTier';
import { stripLBSeqPrefix } from '@/components/leaderboards/constants';
import { WeaponHoverCard } from '@/components/weapon/WeaponHoverCard';

interface ProfileShowcaseProps {
  uid: string;
  onFeaturedEntry?: (entry: LBProfileStandingEntry | null) => void;
}

const TILE_W = 184;
const TILE_GAP = 8;

// Bare percentile, scaled precision the number is the hero, so it should read cleanly whether it's 0.003 or 42.
function formatPercent(topPercent: number): string {
  if (topPercent < 1) return topPercent.toFixed(2);
  if (topPercent < 10) return topPercent.toFixed(1);
  return String(Math.round(topPercent));
}

function formatCount(n: number): string {
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
  // Expanded (wrapped grid) is the default; condensing shrinks it to a single
  // horizontally-scrollable row to reclaim vertical space.
  const [condensed, setCondensed] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    getProfileStandings(uid, controller.signal)
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
        <h2 className="text-[11px] font-semibold tracking-wider text-text-primary/55 uppercase">Rankings</h2>
        {!loading && entries.length > 0 && (
          <span className="text-[11px] tabular-nums text-text-primary/35">{entries.length}</span>
        )}
      </div>

      {loading ? (
        <div className="flex flex-wrap gap-2 overflow-hidden max-[560px]:grid max-[560px]:grid-cols-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[108px] w-[184px] shrink-0 animate-pulse rounded-md border border-border bg-background/50 max-[560px]:w-full" />
          ))}
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className={
              condensed
                ? 'flex flex-nowrap gap-2 overflow-x-auto pb-1.5 scrollbar-none hover:scrollbar-thin [&::-webkit-scrollbar]:h-0 hover:[&::-webkit-scrollbar]:h-1.5'
                : 'flex flex-wrap gap-2 max-[560px]:grid max-[560px]:grid-cols-1'
            }
          >
            {entries.map((entry) => {
              const character = getCharacter(entry.characterId);
              const weapon = getWeapon(entry.weaponId) ?? null;
              const characterName = character ? t(character.nameI18n ?? { en: character.name }) : entry.characterId;
              const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : entry.weaponId;
              const topPercent = computeTopPercent(entry.rank, entry.total);
              const tier = getRankTier(topPercent);
              const baseLabel = stripLBSeqPrefix(entry.trackLabel || entry.trackKey) || 'DMG';
              const href = `/leaderboards/${entry.characterId}?weaponId=${encodeURIComponent(entry.weaponId)}&track=${encodeURIComponent(entry.trackKey)}&buildId=${encodeURIComponent(entry.buildId)}`;
              const atkIcon = statIcons?.ATK;
              const mainStatIcon = weapon?.main_stat ? (statIcons?.[weapon.main_stat] ?? null) : null;
              const weaponBadge = (
                <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background/75 backdrop-blur-sm">
                  <img src={getWeaponPaths(weapon)} alt={weaponName} className="h-8 w-8 object-contain" />
                </span>
              );
              const tileClassName = condensed
                ? 'group relative h-[108px] w-[184px] shrink-0 overflow-hidden rounded-md border border-border bg-background-secondary/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40'
                : 'group relative h-[108px] w-[184px] shrink-0 overflow-hidden rounded-md border border-border bg-background-secondary/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 max-[560px]:w-full';

              return (
                <Link
                  key={`${entry.characterId}:${entry.buildId}`}
                  href={href}
                  title={`${characterName} · ${weaponName} · ${baseLabel}`}
                  className={tileClassName}
                >
                  {/* Character face — right-anchored hero art, full color, faded into the card. */}
                  {character?.head && (
                    <img
                      src={character.head}
                      alt=""
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 right-0 h-full w-[56%] object-cover object-top mask-[linear-gradient(to_right,transparent,black_38%)]"
                    />
                  )}

                  {/* Scrim — darkens the text column so data stays legible over the art. */}
                  <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-background-secondary from-30% via-background-secondary/70 to-transparent" />

                  {/* Tier-colored top edge — the achievement signal. */}
                  <span
                    className="absolute inset-x-0 top-0 z-10 h-[2px]"
                    style={{ background: tier.color, boxShadow: tier.glow ? `0 0 10px ${tier.glow}` : undefined }}
                  />

                  {/* Sequence is board identity, so S0 stays visible like Akasha's C0/C6 chips. */}
                  <span className="absolute top-2 right-2 z-10 rounded-sm bg-background/90 px-1 py-px text-[9px] font-bold tracking-wide text-accent shadow-sm ring-1 ring-inset ring-accent/50 backdrop-blur-sm">
                    S{entry.sequence}
                  </span>

                  {/* Weapon — board identity, badged over the art bottom-right. */}
                  <span className="absolute right-2 bottom-2 z-10 flex">
                    {weapon ? (
                      <WeaponHoverCard
                        placement="top"
                        triggerClassName="flex"
                        weapon={weapon}
                        weaponLevel={90}
                        weaponRank={1}
                        scaledAtk={Math.floor(weapon.ATK * 12.5)}
                        scaledMainStat={parseFloat((weapon.base_main * 4.5).toFixed(1))}
                        atkIcon={atkIcon}
                        mainStatIcon={mainStatIcon}
                      >
                        {weaponBadge}
                      </WeaponHoverCard>
                    ) : weaponBadge}
                  </span>

                  {/* Data column: track · percentile (hero) · absolute rank. */}
                  <div className="relative z-10 flex h-full w-[63%] flex-col justify-between p-3">
                    <span className="truncate text-[11px] font-bold tracking-wider text-text-primary/80 uppercase">
                      {baseLabel}
                    </span>

                    <div className="leading-none">
                      <span className="text-[9px] font-semibold tracking-[0.2em] text-text-primary/40 uppercase">top</span>
                      <div className="mt-0.5 flex items-baseline gap-0.5">
                        <span className="text-[25px] font-bold tabular-nums" style={{ color: tier.color }}>
                          {formatPercent(topPercent)}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: tier.color }}>%</span>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold tabular-nums text-text-primary/85">#{entry.rank.toLocaleString()}</span>
                      <span className="text-[10px] tabular-nums text-text-primary/40">/ {formatCount(entry.total)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {showToggle && (
            <div className="mt-1.5 flex justify-center">
              <button
                type="button"
                onClick={() => setCondensed((v) => !v)}
                aria-expanded={!condensed}
                aria-label={condensed ? 'Expand rankings' : 'Condense rankings'}
                className="flex h-6 w-12 items-center justify-center rounded-md text-text-primary/40 transition-colors hover:bg-background/60 hover:text-text-primary/70"
              >
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 transition-transform duration-200 ${condensed ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
