'use client';

import { useSyncExternalStore } from 'react';
import type { I18nString } from '@/lib/character';

/**
 * One in-game glossary entry behind the `<te href=N>` links in skill, sequence, weapon and echo text
 *
 * - Synced by `scripts/sync_terms.py`, scoped to the terms our own text links
 * - Fetched on its own rather than through GameDataContext, which blocks the page on every file it loads
 * - The first keyword to render starts the fetch, so a page with no skill text never pays for it
 */
export interface GameTerm {
  id: number;
  name: I18nString;
  description: I18nString;
}

type TermIndex = ReadonlyMap<number, GameTerm>;

const EMPTY: TermIndex = new Map();

let index: TermIndex | null = null;
let pending: Promise<void> | null = null;
let failed = false;
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Fetches once per page load, remembering a failure so a hover never retries */
export function loadTerms(): void {
  if (index || pending || failed || typeof window === 'undefined') return;
  pending = fetch('/Data/Terms.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Terms.json: ${res.status}`);
      return res.json();
    })
    .then((rows: unknown) => {
      const next = new Map<number, GameTerm>();
      if (Array.isArray(rows)) {
        for (const row of rows as GameTerm[]) {
          if (row && typeof row.id === 'number') next.set(row.id, row);
        }
      }
      index = next;
    })
    .catch(() => {
      failed = true;
    })
    .finally(() => {
      pending = null;
      notify();
    });
}

const getSnapshot = (): TermIndex => index ?? EMPTY;
const getServerSnapshot = (): TermIndex => EMPTY;

/**
 * Every term in `ids` the glossary has, in the order given
 *
 * - One subscription for the whole list, since hooks cannot be called per id when the list length varies
 * - Reading terms is what starts the fetch, so nothing loads until text with keywords renders
 */
export function useTerms(ids: readonly number[]): GameTerm[] {
  const terms = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (typeof window !== 'undefined' && ids.length > 0) loadTerms();
  const found: GameTerm[] = [];
  for (const id of ids) {
    const term = terms.get(id);
    if (term) found.push(term);
  }
  return found;
}
