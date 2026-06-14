'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useSimulateRanks } from '@/hooks/useSimulateRanks';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { BuildStandingsTable } from '@/components/leaderboards/BuildStandingsTable';
import { getWeaponPaths } from '@/lib/paths';
import { LBStandingEntry } from '@/lib/lb';

const formatTopPct = (rank: number, total: number): string => {
  if (total <= 0) return '';
  const pct = (rank / total) * 100;
  return pct < 0.001 ? '< 0.001%' : `top ${pct.toFixed(3)}%`;
};

/**
 * Editor-side "where would this build rank" console. A collapsed-by-default
 * disclosure that lives under the card (so the shareable export stays clean) and
 * never submits anything — pure read. Runs on demand (the Simulate button / first
 * expand) and automatically when the resonator changes, but never on every echo
 * edit, so there's no per-keystroke polling.
 *
 * Expanded, it splits into a summary rail (the headline best placement + the
 * resonator swap + Re-simulate) and the full per-board standings table. Swapping
 * the resonator carries echoes over via SET_CHARACTER, so the same farmed set can
 * be ranked on any character — owned or not — normalized to a fair ceiling
 * (max level + forte).
 */
export const SimulateRankPanel: React.FC = () => {
  const { state } = useBuild();
  const { t } = useLanguage();
  const { getWeapon } = useGameData();
  const selected = useSelectedCharacter();
  const [expanded, setExpanded] = useState(false);

  const { boards, hasResult, loading, error, stale, run } = useSimulateRanks(state, Boolean(state.characterId));
  const hasEchoes = state.echoPanels.some((panel) => Boolean(panel.id));
  const canRun = Boolean(state.characterId) && hasEchoes;

  // Only boards with a real pool are rankable; total === 0 is the "would be #1" case.
  const standings = useMemo<LBStandingEntry[]>(() => (
    boards
      .filter((board) => board.total > 0)
      .map((board) => ({
        key: board.key,
        weaponId: board.weaponId,
        trackKey: board.trackKey,
        rank: board.rank,
        total: board.total,
        trackLabel: board.trackLabel,
        teamCharacterIds: board.teamCharacterIds,
        teamMembers: board.teamMembers,
        damage: board.damage,
      }))
  ), [boards]);

  // The headline: the single best placement across every board (lowest rank).
  const best = useMemo<LBStandingEntry | null>(() => (
    standings.reduce<LBStandingEntry | null>((acc, s) => (!acc || s.rank < acc.rank ? s : acc), null)
  ), [standings]);

  // Swapping the resonator is a deliberate, discrete action (unlike typing), so we
  // auto-run for it — that's the compare loop. Echo edits stay manual (Re-simulate).
  const prevCharIdRef = useRef(state.characterId);
  useEffect(() => {
    if (prevCharIdRef.current === state.characterId) return;
    prevCharIdRef.current = state.characterId;
    if (canRun) run();
  }, [state.characterId, canRun, run]);

  if (!selected) return null;

  const characterId = selected.character.id;
  const characterName = t(selected.nameI18n);
  const buttonLabel = loading ? 'Simulating…' : hasResult ? 'Re-simulate' : 'Simulate rank';
  const noBoard = hasResult && boards.length === 0;
  const wouldBeFirst = hasResult && boards.length > 0 && standings.length === 0;
  const hasStandings = standings.length > 0;

  // Expanding implies you want the rank, so prime it on the first open.
  const toggle = () => {
    setExpanded((open) => {
      const next = !open;
      if (next && canRun && !hasResult && !loading) run();
      return next;
    });
  };

  const renderRailSummary = () => {
    if (loading && !hasStandings) {
      return <p className="text-sm text-text-primary/45">Simulating…</p>;
    }
    if (best) {
      const weapon = getWeapon(best.weaponId);
      const weaponName = weapon?.name ?? best.weaponId;
      const weaponIcon = weapon ? getWeaponPaths(weapon) : null;
      return (
        <div className="flex flex-col gap-2">
          <span className="font-ropa text-[10px] uppercase tracking-[0.2em] text-text-primary/40">
            Best placement
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-3xl leading-none tabular-nums text-accent">
              #{best.rank.toLocaleString()}
            </span>
            <span className="text-xs text-text-primary/40">of {best.total.toLocaleString()}</span>
          </div>
          <span className="text-xs font-medium text-text-primary/60">{formatTopPct(best.rank, best.total)}</span>
          <div className="mt-1 flex items-center gap-2">
            {weaponIcon ? (
              <img src={weaponIcon} alt={weaponName} className="h-7 w-7 shrink-0 object-contain" />
            ) : (
              <div className="h-7 w-7 shrink-0 rounded bg-white/10" />
            )}
            <div className="min-w-0 leading-tight">
              <div className="truncate text-xs font-medium text-text-primary/80">{weaponName}</div>
              <div className="truncate text-[11px] text-text-primary/45">{best.trackLabel}</div>
            </div>
          </div>
          <span className="text-xs font-semibold tabular-nums text-accent/90">
            {Math.round(best.damage).toLocaleString()}{' '}
            <span className="font-normal text-text-primary/40">dmg</span>
          </span>
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-rose-300/80">Couldn’t simulate this build’s rank. Please try again.</p>;
    }
    if (wouldBeFirst) {
      return <p className="text-sm text-text-primary/45">No ranked builds here yet, you’d place #1.</p>;
    }
    if (noBoard) {
      return <p className="text-sm text-text-primary/45">No leaderboard exists for this resonator yet.</p>;
    }
    return (
      <p className="text-sm text-text-primary/45">
        {hasEchoes
          ? 'Run a simulation to see your best placement.'
          : 'Add echoes, then run a simulation to see where this build would rank.'}
      </p>
    );
  };

  const renderTable = () => {
    if (loading) {
      return (
        <BuildStandingsTable
          standings={null}
          standingsLoading
          standingsError={null}
          characterId={characterId}
          characterName={characterName}
          hasBoardContext={false}
          activeWeaponId=""
          activeTrackKey=""
          align="left"
        />
      );
    }
    if (hasStandings) {
      return (
        <div className="overflow-x-auto">
          <BuildStandingsTable
            standings={standings}
            standingsLoading={false}
            standingsError={null}
            characterId={characterId}
            characterName={characterName}
            hasBoardContext={false}
            activeWeaponId=""
            activeTrackKey=""
            align="left"
          />
        </div>
      );
    }
    // Non-table states (no run yet, would-be-first, no board, error) are voiced in
    // the rail, so the table side stays empty rather than repeating the message.
    return null;
  };

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-background-secondary">
      {/* Disclosure bar — the whole panel at rest; clicking it expands the body. */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        className="group flex w-full cursor-pointer items-center gap-2.5 bg-linear-to-b from-white/2.5 to-transparent px-4 py-3 text-left transition-colors hover:from-white/5 md:px-5"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-3.5 w-3.5 shrink-0 text-text-primary/40 transition-all duration-200 group-hover:text-text-primary/70 ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
        <h2 className="font-ropa text-sm uppercase tracking-[0.22em] text-text-primary/75">
          Rank Simulation
        </h2>
        <span className="hidden rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent sm:inline">
          Not submitted
        </span>

        <div className="ml-auto flex min-w-0 items-center gap-2.5">
          {!expanded && (
            <span className="flex min-w-0 items-center gap-2 text-sm text-text-primary/55">
              <span className="truncate">{characterName}</span>
              {best && (
                <span className="hidden shrink-0 items-center gap-2 text-xs tabular-nums text-text-primary/35 sm:flex">
                  <span className="h-3 w-px bg-border" />
                  #{best.rank.toLocaleString()} · {formatTopPct(best.rank, best.total)}
                </span>
              )}
            </span>
          )}
          {stale && !loading && (
            <span className="flex shrink-0 items-center gap-1 font-ropa text-[9px] uppercase tracking-[0.16em] text-amber-300/80">
              <span className="h-1 w-1 rounded-full bg-amber-300/80" />
              Build changed
            </span>
          )}
        </div>
      </button>

      {/* Animated reveal: grid-rows 0fr -> 1fr expands to content height, no JS measure. */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden" inert={!expanded || undefined}>
          <div className="flex flex-col gap-5 border-t border-border/70 px-4 py-4 md:flex-row md:items-start md:px-5">
            {/* Summary rail: headline placement + the controls. */}
            <aside className="flex shrink-0 flex-col gap-4 md:w-60 md:border-r md:border-border/60 md:pr-5">
              {renderRailSummary()}

              <div className="flex flex-col gap-2.5">
                <span className="font-ropa text-[10px] uppercase tracking-[0.2em] text-text-primary/40">
                  Simulate as
                </span>
                <CharacterSelector compact className="w-full" />
                <button
                  type="button"
                  onClick={run}
                  disabled={!canRun || loading}
                  className="w-full cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold tracking-wide text-background transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {buttonLabel}
                </button>
                <p className="text-[11px] leading-relaxed text-text-primary/35">
                  Nothing is submitted. This only checks where your equipped echoes would land.
                </p>
              </div>
            </aside>

            {/* Full per-board standings. */}
            <div className="min-w-0 flex-1 md:pl-5">{renderTable()}</div>
          </div>
        </div>
      </div>
    </section>
  );
};
