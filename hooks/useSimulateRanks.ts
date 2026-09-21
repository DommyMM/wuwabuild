'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSimulateRanks, LBSimulateBoard } from '@/lib/lb';
import type { SavedState } from '@/lib/build';
import type { EchoPanelState } from '@/lib/echo';

/**
 * Slice of editor state the simulate result depends on
 *
 * No level, forte, weapon or sequence since server normalizes them to a fair ceiling and ranks every weapon and track
 */
interface BuildLike {
  characterId: string | null;
  roverElement?: string;
  echoPanels: EchoPanelState[];
  isDirty?: boolean;
}

export interface SimulateRanksState {
  /** Boards from the most recent successful run, empty until the first run */
  boards: LBSimulateBoard[];
  /** A run completed, though the response may legitimately be an empty board set */
  hasResult: boolean;
  loading: boolean;
  error: boolean;
  /** The build changed since the last run, so the shown result is out of date */
  stale: boolean;
  /** Trigger a simulate for the current build. No-op without a character and echoes. */
  run: () => void;
}

const signatureOf = (state: BuildLike): string =>
  JSON.stringify({ c: state.characterId ?? '', r: state.roverElement ?? '', e: state.echoPanels });

/** On-demand "where would this build rank" fetch, which never submits anything */
export function useSimulateRanks(state: BuildLike, enabled: boolean): SimulateRanksState {
  const [result, setResult] = useState<{ sig: string; boards: LBSimulateBoard[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const characterId = state.characterId;
  const hasEchoes = state.echoPanels.some((panel) => Boolean(panel.id));
  const canRun = enabled && Boolean(characterId) && hasEchoes;

  // Only run() fetches, and callers wire it to a button so the leaderboard isn't polled on every keystroke
  const run = useCallback(() => {
    if (!enabled) return;
    const snapshot = state;
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
        if (controller.signal.aborted) {
          if (abortRef.current === controller) {
            abortRef.current = null;
            setLoading(false);
          }
          return;
        }
        setResult({ sig, boards });
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          if (abortRef.current === controller) {
            abortRef.current = null;
            setLoading(false);
          }
          return;
        }
        setError(true);
        if (abortRef.current === controller) abortRef.current = null;
        setLoading(false);
      });
  }, [enabled, state]);

  useEffect(() => {
    if (enabled) return;
    abortRef.current?.abort();
  }, [enabled]);

  // Abort any in-flight request on unmount
  useEffect(() => () => {
    const controller = abortRef.current;
    abortRef.current = null;
    controller?.abort();
  }, []);

  const currentSignature = signatureOf(state);
  const stale = canRun && result !== null && result.sig !== currentSignature;

  return {
    boards: result?.boards ?? [],
    hasResult: result !== null,
    loading,
    error,
    stale,
    run,
  };
}
