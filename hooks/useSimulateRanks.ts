'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSimulateRanks, LBSimulateBoard } from '@/lib/lb';
import type { SavedState } from '@/lib/build';
import type { EchoPanelState } from '@/lib/echo';

// The slice of editor state the simulate result actually depends on. Level, forte,
// weapon, and sequence are deliberately excluded: the server normalizes to a fair
// ceiling and computes every weapon × track, so those never change the ranking.
interface BuildLike {
  characterId: string | null;
  roverElement?: string;
  echoPanels: EchoPanelState[];
  isDirty?: boolean;
}

export interface SimulateRanksState {
  /** Boards from the most recent successful run (empty until the first run). */
  boards: LBSimulateBoard[];
  /** A run completed (the response may legitimately be an empty board set). */
  hasResult: boolean;
  loading: boolean;
  error: boolean;
  /** The build changed since the last run, so the shown result is out of date. */
  stale: boolean;
  /** Trigger a simulate for the current build. No-op without a character + echoes. */
  run: () => void;
}

const signatureOf = (state: BuildLike): string =>
  JSON.stringify({ c: state.characterId ?? '', r: state.roverElement ?? '', e: state.echoPanels });

/**
 * On-demand "where would this build rank" fetch. The caller triggers `run()` (a
 * button), so we never poll the leaderboard on every keystroke. Tracks staleness
 * by comparing the current build signature against the one that produced the last
 * result. Nothing is ever submitted.
 */
export function useSimulateRanks(state: BuildLike, enabled: boolean): SimulateRanksState {
  const [result, setResult] = useState<{ sig: string; boards: LBSimulateBoard[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Latest state, read at run time. Updated in an effect (never during render).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  const abortRef = useRef<AbortController | null>(null);

  const characterId = state.characterId;
  const hasEchoes = state.echoPanels.some((panel) => Boolean(panel.id));
  const canRun = enabled && Boolean(characterId) && hasEchoes;

  const run = useCallback(() => {
    const snapshot = stateRef.current;
    const cid = snapshot.characterId;
    if (!cid || !snapshot.echoPanels.some((panel) => Boolean(panel.id))) return;

    const sig = signatureOf(snapshot);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(false);

    const { isDirty: _isDirty, ...saved } = snapshot as BuildLike & Record<string, unknown>;
    void _isDirty;

    fetchSimulateRanks(cid, saved as unknown as SavedState, controller.signal)
      .then((boards) => {
        if (controller.signal.aborted) return;
        setResult({ sig, boards });
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError(true);
        setLoading(false);
      });
  }, []);

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), []);

  const stale = canRun && result !== null && result.sig !== signatureOf(state);

  return {
    boards: result?.boards ?? [],
    hasResult: result !== null,
    loading,
    error,
    stale,
    run,
  };
}
