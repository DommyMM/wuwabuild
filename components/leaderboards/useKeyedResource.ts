'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Lazily fetches one payload per key and caches every key it has seen.
 *
 * Built for the expanded build row, where each collapsible section (moves,
 * substat upgrades, reference benchmark, standings) fetches on first open and
 * must stay cached when the reader flips between boards and back.
 *
 * Semantics worth preserving if this is ever rewritten:
 *  - A resolved `null`/`undefined` payload is a cache hit, not a miss, so a
 *    board with no data never re-requests on every render.
 *  - A failure latches. The effect will not retry until `retry()` clears the
 *    error, so a broken board cannot spin a request loop.
 *  - Work is deferred by a microtask, so React's development double-invoke
 *    aborts the first attempt before it reaches the network.
 *  - Only the newest request per hook is live; the next run and unmount own the
 *    abort. The loading flag is always released, including on abort, so a board
 *    abandoned mid-flight can still be fetched when the reader returns to it.
 */
interface KeyedResourceOptions<T> {
  /** Cache identity. An empty key is treated as "nothing to fetch". */
  key: string;
  /** Gate the fetch (section open, row expanded, board context resolved). */
  enabled: boolean;
  fetch: (signal: AbortSignal) => Promise<T>;
  /** Maps a rejection to the message shown to the reader. */
  errorMessage: (cause: unknown) => string;
}

interface KeyedResource<T> {
  data: T | undefined;
  error: string | null;
  isLoading: boolean;
  retry: () => void;
}

/** Surfaces the transport's own message when it has one, else `fallback`. */
export function transportError(fallback: string) {
  return (cause: unknown): string => (cause instanceof Error ? cause.message : fallback);
}

export function useKeyedResource<T>({
  key,
  enabled,
  fetch,
  errorMessage,
}: KeyedResourceOptions<T>): KeyedResource<T> {
  const [dataByKey, setDataByKey] = useState<Record<string, T>>({});
  const [errorsByKey, setErrorsByKey] = useState<Record<string, string | null>>({});
  const [loadingByKey, setLoadingByKey] = useState<Record<string, boolean>>({});
  const controllerRef = useRef<AbortController | null>(null);

  // Held in refs so the request effect depends only on identity (key/enabled)
  // and callers can pass inline closures without churning the fetch. Synced in
  // an effect declared ahead of the request effect, which runs first on mount.
  const fetchRef = useRef(fetch);
  const errorMessageRef = useRef(errorMessage);
  useEffect(() => {
    fetchRef.current = fetch;
    errorMessageRef.current = errorMessage;
  });

  const isCached = Object.prototype.hasOwnProperty.call(dataByKey, key);
  const error = errorsByKey[key] ?? null;
  const isLoading = loadingByKey[key] ?? false;

  useEffect(() => {
    if (!enabled || !key || isCached || isLoading || error) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    void Promise.resolve().then(() => {
      if (controller.signal.aborted) return;
      setLoadingByKey((prev) => ({ ...prev, [key]: true }));

      void fetchRef.current(controller.signal)
        .then((payload) => {
          if (controller.signal.aborted) return;
          setDataByKey((prev) => ({ ...prev, [key]: payload }));
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setErrorsByKey((prev) => ({ ...prev, [key]: errorMessageRef.current(cause) }));
        })
        .finally(() => {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
          }
          // Released even when aborted. Two requests can never share a key (the
          // isLoading guard blocks the second, and an abort before the microtask
          // means the first never started), so this cannot clear a live flag.
          setLoadingByKey((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
        });
    });
  }, [enabled, error, isCached, isLoading, key]);

  useEffect(() => (() => { controllerRef.current?.abort(); }), []);

  const retry = useCallback(() => {
    setErrorsByKey((prev) => ({ ...prev, [key]: null }));
  }, [key]);

  return { data: dataByKey[key], error, isLoading, retry };
}
