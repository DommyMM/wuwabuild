'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useSimulateRanks } from '@/hooks/useSimulateRanks';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { BuildStandingsTable } from '@/components/leaderboards/BuildStandingsTable';
import { LBStandingEntry } from '@/lib/lb';

/**
 * Editor-side "where would this build rank" console. Runs on demand (the Simulate
 * button) and automatically when the resonator changes, but never on every echo
 * edit — so there's no per-keystroke polling. Lives under the card, not on it, so
 * the shareable export stays clean. Pure read: nothing is submitted.
 *
 * Left rail swaps the resonator (echoes carry over via SET_CHARACTER), so the same
 * farmed set can be ranked on any character — owned or not. The right surface shows
 * the build's would-be standing on every board (weapon × track), normalized to a
 * fair ceiling (max level + forte).
 */
export const SimulateRankPanel: React.FC = () => {
  const { state } = useBuild();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();

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

  const renderResult = () => {
    if (error) {
      return (
        <p className="py-3 text-sm text-rose-300/80">
          Couldn’t simulate this build’s rank. Please try again.
        </p>
      );
    }
    if (!hasResult && !loading) {
      return (
        <p className="py-3 text-sm text-text-primary/45">
          {hasEchoes
            ? 'Run a simulation to see where this build would rank.'
            : 'Add echoes, then run a simulation to see where this build would rank.'}
        </p>
      );
    }
    if (standings.length > 0) {
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
    if (noBoard) {
      return <p className="py-3 text-sm text-text-primary/45">No leaderboard exists for this resonator yet.</p>;
    }
    if (wouldBeFirst) {
      return <p className="py-3 text-sm text-text-primary/45">No ranked builds here yet, this build would place #1.</p>;
    }
    return null;
  };

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-border bg-background-secondary">
      {/* Header band: identity + the one-line purpose, action pinned right. */}
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border/70 bg-linear-to-b from-white/2.5 to-transparent px-4 py-3 md:px-5">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="font-ropa text-sm uppercase tracking-[0.22em] text-text-primary/75">
              Rank Simulation
            </h2>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
              Not submitted
            </span>
            {stale && !loading && (
              <span className="flex items-center gap-1 font-ropa text-[9px] uppercase tracking-[0.16em] text-amber-300/80">
                <span className="h-1 w-1 rounded-full bg-amber-300/80" />
                Build changed
              </span>
            )}
          </div>
          <p className="text-xs text-text-primary/40">
            Select any resonator to check where you’d rank with these equipped echoes.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={!canRun || loading}
          className="shrink-0 cursor-pointer rounded-lg bg-accent px-4 py-2 text-sm font-semibold tracking-wide text-background transition-all hover:brightness-110 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </header>

      {/* Body: control rail | results surface. */}
      <div className="flex min-w-0 flex-col gap-5 px-4 py-4 md:flex-row md:items-start md:gap-0 md:px-5">
        <div className="flex shrink-0 flex-col gap-3 md:w-56 md:border-r md:border-border/60 md:pr-5">
          <span className="font-ropa text-[10px] uppercase tracking-[0.2em] text-text-primary/40">
            Simulate as
          </span>
          <CharacterSelector />
        </div>

        <div className="min-w-0 flex-1 md:pl-5">{renderResult()}</div>
      </div>
    </section>
  );
};
