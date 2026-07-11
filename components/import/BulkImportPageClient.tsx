'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { loadImage } from '@/lib/import/imageFile';
import { convertAnalysisToSavedState, resolveImportWeaponFallback } from '@/lib/import/convert';
import { unwrapOcrAnalysisPayload } from '@/lib/import/ocrPayload';
import { readOcrStreamResponse } from '@/lib/import/ocrStream';
import { OCR_POST_URL } from '@/lib/apiEndpoints';
import type { AnalysisData } from '@/lib/import/types';
import { submitBuild } from '@/lib/lb';
import { canonicalScanIdOrNull, canonicalSourceImageKeyOrNull, MAX_OCR_IMAGE_BYTES } from '@/lib/ingestIdentity';
import { AlertTriangle, CheckCircle2, FolderOpen, Loader2, Pause, Play, RotateCcw, UploadCloud, XCircle } from 'lucide-react';

type BulkStatus = 'pending' | 'processing' | 'submitted' | 'skipped' | 'failed';
type BulkSavedState = ReturnType<typeof convertAnalysisToSavedState>;

interface BulkItem {
  id: string;
  file: File;
  status: BulkStatus;
  message: string;
}

interface Counters {
  total: number;
  processed: number;
  submitted: number;
  updated: number;
  skipped: number;
  failed: number;
}

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);
const BULK_OCR_STARTS_PER_WINDOW = 10;
const BULK_OCR_WINDOW_MS = 60_250;
const bulkOcrStartTimes: number[] = [];
let bulkOcrGate: Promise<void> = Promise.resolve();

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

// Serialize admission across all local workers so increasing image concurrency
// cannot create a burst that the public per-IP gateway will reject.
async function acquireBulkOcrSlot(): Promise<void> {
  let release!: () => void;
  const previous = bulkOcrGate;
  bulkOcrGate = new Promise<void>(resolve => { release = resolve; });
  await previous;

  try {
    while (true) {
      const now = Date.now();
      while (bulkOcrStartTimes.length > 0 && bulkOcrStartTimes[0] <= now - BULK_OCR_WINDOW_MS) {
        bulkOcrStartTimes.shift();
      }
      if (bulkOcrStartTimes.length < BULK_OCR_STARTS_PER_WINDOW) {
        bulkOcrStartTimes.push(now);
        return;
      }
      await wait(Math.max(250, bulkOcrStartTimes[0] + BULK_OCR_WINDOW_MS - now));
    }
  } finally {
    release();
  }
}

function createInitialCounters(total: number): Counters {
  return {
    total,
    processed: 0,
    submitted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };
}

function fileKey(file: File) {
  const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  return `${relativePath || file.name}:${file.size}:${file.lastModified}`;
}

function applyLimit(items: BulkItem[], limit: number | null) {
  return limit && limit > 0 ? items.slice(0, limit) : items;
}

// File mtimes are stamped to the R2 upload date by sync_r2.py, so lastModified
// is a reliable "uploaded on" timestamp for date-window reruns.
function toDateInput(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateRangeBounds(fromStr: string, toStr: string): { from: number | null; to: number | null } {
  const parse = (value: string, endOfDay: boolean): number | null => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return null;
    // endOfDay rolls to the next midnight so the `to` day is fully inclusive.
    return new Date(year, month - 1, day + (endOfDay ? 1 : 0)).getTime();
  };
  return { from: parse(fromStr, false), to: parse(toStr, true) };
}

function matchesDateRange(lastModified: number, fromStr: string, toStr: string): boolean {
  const { from, to } = dateRangeBounds(fromStr, toStr);
  if (from !== null && lastModified < from) return false;
  if (to !== null && lastModified >= to) return false;
  return true;
}

function filterByDate(items: BulkItem[], fromStr: string, toStr: string) {
  if (!fromStr && !toStr) return items;
  return items.filter(item => matchesDateRange(item.file.lastModified, fromStr, toStr));
}

function prepareBulkSubmitState(
  savedState: BulkSavedState,
  data: AnalysisData,
): { buildState: BulkSavedState; warnings: string[] } {
  const warnings: string[] = [];
  const trimmedUid = savedState.watermark.uid.trim();
  let buildState = savedState;

  // convert() already fills the signature weapon when the OCR weapon is empty;
  // mirror that decision here to surface it in the per-item message (and as an
  // idempotent safety net) instead of submitting the fallback silently.
  const fallback = resolveImportWeaponFallback(data, savedState.characterId);
  if (fallback) {
    if (!buildState.weaponId) buildState = { ...buildState, weaponId: fallback.id };
    warnings.push(`weapon fallback: ${fallback.name}`);
  } else if (!savedState.weaponId) {
    warnings.push('missing weapon');
  }

  if (!trimmedUid) {
    buildState = { ...buildState, watermark: { ...buildState.watermark, uid: '0' } };
    warnings.push('UID 0 fallback');
  }
  if (trimmedUid === '0') warnings.push('UID 0');

  return { buildState, warnings };
}

function normalizeFiles(fileList: FileList | File[]) {
  const seen = new Set<string>();
  const files = Array.from(fileList)
    .filter(file => ACCEPTED_IMAGE_TYPES.has(file.type) || /\.(jpe?g|png)$/i.test(file.name))
    .filter(file => {
      const key = fileKey(file);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => fileKey(a).localeCompare(fileKey(b)));

  return files.map<BulkItem>(file => ({
    id: fileKey(file),
    file,
    status: 'pending',
    message: '',
  }));
}

async function postImage(file: File) {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await acquireBulkOcrSlot();
    const formData = new FormData();
    formData.append('image', file, file.name || 'card.jpg');
    response = await fetch(OCR_POST_URL, {
      method: 'POST',
      body: formData,
    });
    if (response.status !== 429) break;

    await response.body?.cancel();
    const retryAfterSeconds = Number(response.headers.get('retry-after'));
    await wait(Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : BULK_OCR_WINDOW_MS);
  }

  if (!response) {
    throw new Error(`OCR did not start for ${file.name}`);
  }
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(`OCR rate limit remained busy for ${file.name}`);
    }
    throw new Error(`OCR failed (${response.status}) for ${file.name}`);
  }

  const payload = await readOcrStreamResponse(response);
  return {
    analysisData: unwrapOcrAnalysisPayload(payload, `OCR for ${file.name}`) as AnalysisData,
    timings: payload.timings,
    sourceImageKey: canonicalSourceImageKeyOrNull(payload.trainingImageKey),
    scanId: canonicalScanIdOrNull(payload.scanId),
  };
}

function formatTiming(timings: Record<string, unknown> | undefined) {
  const total = typeof timings?.wallMs === 'number' ? timings.wallMs : timings?.totalMs;
  const recognition = timings?.recognitionWallMs;
  if (typeof total !== 'number') return '';
  const pieces = [`ocr ${(total / 1000).toFixed(2)}s`];
  if (typeof recognition === 'number') {
    pieces.push(`rec ${(recognition / 1000).toFixed(2)}s`);
  }
  return pieces.join(', ');
}

export function BulkImportPageClient() {
  const gameData = useGameData();
  const [allItems, setAllItems] = useState<BulkItem[]>([]);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [counters, setCounters] = useState<Counters>(() => createInitialCounters(0));
  const [imageConcurrency, setImageConcurrency] = useState(1);
  const [selectionLimit, setSelectionLimit] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const stopRef = useRef(false);
  const pauseRef = useRef(false);

  const pendingCount = useMemo(
    () => items.filter(item => item.status === 'pending').length,
    [items],
  );

  const recentRows = useMemo(
    () => items.filter(item => item.status !== 'pending').slice(-80).reverse(),
    [items],
  );
  const issueRows = useMemo(
    () => items.filter(item => item.status === 'failed' || item.status === 'skipped').reverse(),
    [items],
  );

  const loadedSpan = useMemo(() => {
    if (allItems.length === 0) return null;
    let min = Infinity;
    let max = -Infinity;
    for (const item of allItems) {
      const time = item.file.lastModified;
      if (time < min) min = time;
      if (time > max) max = time;
    }
    return { min, max };
  }, [allItems]);

  // Count matching the date window before the limit is applied, so the UI can
  // show "N match dates · M queued" honestly.
  const dateMatchCount = useMemo(
    () => filterByDate(allItems, dateFrom, dateTo).length,
    [allItems, dateFrom, dateTo],
  );

  const setItem = (id: string, patch: Partial<BulkItem>) => {
    setItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  };

  const addCounter = (patch: Partial<Counters>) => {
    setCounters(current => ({
      ...current,
      processed: current.processed + (patch.processed ?? 0),
      submitted: current.submitted + (patch.submitted ?? 0),
      updated: current.updated + (patch.updated ?? 0),
      skipped: current.skipped + (patch.skipped ?? 0),
      failed: current.failed + (patch.failed ?? 0),
    }));
  };

  // Single source of truth for the queue: date window first, then limit.
  const buildQueue = (
    source: BulkItem[],
    limit: number | null,
    from: string,
    to: string,
  ) => applyLimit(filterByDate(source, from, to), limit);

  const commitQueue = (source: BulkItem[], limit: number | null, from: string, to: string) => {
    const queuedItems = buildQueue(source, limit, from, to);
    setItems(queuedItems);
    setCounters(createInitialCounters(queuedItems.length));
    setIsPaused(false);
    pauseRef.current = false;
    stopRef.current = false;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const nextItems = normalizeFiles(fileList);
    setAllItems(nextItems);
    commitQueue(nextItems, selectionLimit, dateFrom, dateTo);
  };

  // Re-derive the queue from any subset of changed selection controls.
  const applySelection = (next: { limit?: number | null; from?: string; to?: string }) => {
    if (isRunning) return;
    const limit = next.limit !== undefined ? next.limit : selectionLimit;
    const from = next.from !== undefined ? next.from : dateFrom;
    const to = next.to !== undefined ? next.to : dateTo;
    if (next.limit !== undefined) setSelectionLimit(limit);
    if (next.from !== undefined) setDateFrom(from);
    if (next.to !== undefined) setDateTo(to);
    commitQueue(allItems, limit, from, to);
  };

  const processOne = async (item: BulkItem) => {
    setItem(item.id, { status: 'processing', message: 'OCR running' });

    try {
      if (item.file.size > MAX_OCR_IMAGE_BYTES) {
        setItem(item.id, {
          status: 'skipped',
          message: 'Skipped: image exceeds 5 MiB',
        });
        addCounter({ processed: 1, skipped: 1 });
        return;
      }
      const image = await loadImage(item.file);
      if (image.naturalWidth !== 1920 || image.naturalHeight !== 1080) {
        setItem(item.id, {
          status: 'skipped',
          message: `Skipped ${image.naturalWidth}x${image.naturalHeight}`,
        });
        addCounter({ processed: 1, skipped: 1 });
        return;
      }

      const { analysisData, timings, sourceImageKey, scanId } = await postImage(item.file);
      const timingMessage = formatTiming(timings);
      if (timings) {
        console.info('Bulk OCR timings', item.file.name, timings);
      }

      const savedState = convertAnalysisToSavedState(analysisData, {
        characters: gameData.characters,
        weapons: gameData.weapons,
        echoes: gameData.echoes,
      });

      if (!savedState.characterId) {
        setItem(item.id, {
          status: 'skipped',
          message: `Missing character${timingMessage ? ` · ${timingMessage}` : ''}`,
        });
        addCounter({ processed: 1, skipped: 1 });
        return;
      }

      const { buildState, warnings } = prepareBulkSubmitState(savedState, analysisData);
      const result = await submitBuild(buildState, { sourceImageKey, scanId });
      setItem(item.id, {
        status: 'submitted',
        message: `${result.action}${result.damageComputed ? '' : ' without damage calc'}${warnings.length ? ` (${warnings.join(', ')})` : ''}${timingMessage ? ` · ${timingMessage}` : ''}`,
      });
      addCounter({
        processed: 1,
        submitted: result.action === 'created' ? 1 : 0,
        updated: result.action === 'created' ? 0 : 1,
      });
    } catch (err) {
      setItem(item.id, {
        status: 'failed',
        message: err instanceof Error ? err.message : 'Failed',
      });
      addCounter({ processed: 1, failed: 1 });
    }
  };

  const runBulkImport = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsPaused(false);
    pauseRef.current = false;
    stopRef.current = false;

    let nextIndex = 0;
    const workers = Array.from({ length: Math.max(1, imageConcurrency) }, async () => {
      while (!stopRef.current) {
        while (pauseRef.current && !stopRef.current) {
          await new Promise(resolve => setTimeout(resolve, 250));
        }

        const snapshot = items.filter(item => item.status === 'pending');
        if (nextIndex >= snapshot.length) break;
        const item = snapshot[nextIndex++];
        if (!item) break;
        await processOne(item);
      }
    });

    await Promise.all(workers);
    setIsRunning(false);
  };

  const reset = () => {
    stopRef.current = true;
    pauseRef.current = false;
    setAllItems([]);
    setItems([]);
    setSelectionLimit(null);
    setDateFrom('');
    setDateTo('');
    setCounters(createInitialCounters(0));
    setIsRunning(false);
    setIsPaused(false);
  };

  const progress = counters.total > 0 ? Math.round((counters.processed / counters.total) * 100) : 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <section className="flex flex-col gap-4 border-b border-border/60 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Bulk Import</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Local batch OCR and leaderboard submit for exported build screenshots.
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Requests are automatically paced to the public OCR limit of 10 starts per minute per IP.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-hover">
              <FolderOpen className="h-4 w-4" />
              Folder
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={event => handleFiles(event.target.files)}
                {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-hover">
              <UploadCloud className="h-4 w-4" />
              Files
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png"
                className="hidden"
                onChange={event => handleFiles(event.target.files)}
              />
            </label>
          </div>
        </div>

        {/* Date window — file mtime == R2 upload date, so this is "uploaded between". */}
        <div className="flex flex-col gap-3 rounded-md border border-border bg-surface/40 p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Uploaded from
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                disabled={isRunning || allItems.length === 0}
                onChange={event => applySelection({ from: event.target.value })}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Uploaded to
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                disabled={isRunning || allItems.length === 0}
                onChange={event => applySelection({ to: event.target.value })}
                className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
            </label>
            <button
              type="button"
              disabled={isRunning || (!dateFrom && !dateTo)}
              onClick={() => applySelection({ from: '', to: '' })}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear dates
            </button>
            {loadedSpan && (
              <span className="text-xs text-text-secondary">
                {dateFrom || dateTo
                  ? `${dateMatchCount} of ${allItems.length} match`
                  : `loaded span ${toDateInput(loadedSpan.min)} → ${toDateInput(loadedSpan.max)}`}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            Limit
            <input
              type="number"
              min={1}
              max={10000}
              value={selectionLimit ?? ''}
              placeholder="All"
              disabled={isRunning}
              onChange={event => {
                const value = event.target.value.trim();
                applySelection({ limit: value ? Math.max(1, Math.min(10000, Number(value) || 1)) : null });
              }}
              className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-text-primary"
            />
          </label>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applySelection({ limit: null })}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            All
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applySelection({ limit: 100 })}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            100
          </button>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            Image workers
            <input
              type="number"
              min={1}
              max={8}
              value={imageConcurrency}
              disabled={isRunning}
              onChange={event => setImageConcurrency(Math.max(1, Math.min(8, Number(event.target.value) || 1)))}
              className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-text-primary"
            />
          </label>
          <button
            type="button"
            disabled={isRunning || pendingCount === 0}
            onClick={() => void runBulkImport()}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Start
          </button>
          <button
            type="button"
            disabled={!isRunning}
            onClick={() => {
              pauseRef.current = !pauseRef.current;
              setIsPaused(pauseRef.current);
            }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pause className="h-4 w-4" />
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            disabled={isRunning && !isPaused}
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Total" value={counters.total} />
        <Metric label="Processed" value={`${counters.processed} / ${counters.total}`} />
        <Metric label="Created" value={counters.submitted} />
        <Metric label="Updated" value={counters.updated} />
        <Metric label="Skipped" value={counters.skipped} />
        <Metric label="Failed" value={counters.failed} />
      </section>

      <section className="flex flex-col gap-2">
        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>{progress}% complete</span>
          <span>
            {pendingCount} pending · {items.length} queued / {allItems.length} loaded
            {(dateFrom || dateTo) && ` · ${dateFrom || '…'} → ${dateTo || '…'}`}
            {' · '}{selectionLimit ? `first ${selectionLimit}` : 'no limit'}
          </span>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-border text-sm text-text-secondary">
          Choose the local r2-backup folder or select image files to start.
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[120px_1fr_96px_160px] border-b border-border bg-surface px-3 py-2 text-xs font-medium uppercase text-text-secondary">
              <span>Status</span>
              <span>File</span>
              <span>Uploaded</span>
              <span>Result</span>
            </div>
            <div className="max-h-[420px] overflow-auto">
              {recentRows.map(item => (
                <div key={item.id} className="grid grid-cols-[120px_1fr_96px_160px] gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-b-0">
                  <StatusBadge status={item.status} />
                  <span className="truncate text-text-primary" title={(item.file as File & { webkitRelativePath?: string }).webkitRelativePath || item.file.name}>
                    {(item.file as File & { webkitRelativePath?: string }).webkitRelativePath || item.file.name}
                  </span>
                  <span className="truncate text-text-secondary" title={new Date(item.file.lastModified).toLocaleString()}>
                    {toDateInput(item.file.lastModified)}
                  </span>
                  <span className="truncate text-text-secondary" title={item.message}>{item.message}</span>
                </div>
              ))}
            </div>
          </section>

          <IssuePanel items={issueRows} />
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="mt-1 text-lg font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: BulkStatus }) {
  const iconClass = 'h-4 w-4';
  if (status === 'processing') {
    return <span className="inline-flex items-center gap-2 text-text-secondary"><Loader2 className={`${iconClass} animate-spin`} />Processing</span>;
  }
  if (status === 'submitted') {
    return <span className="inline-flex items-center gap-2 text-green-500"><CheckCircle2 className={iconClass} />Submitted</span>;
  }
  if (status === 'skipped') {
    return <span className="inline-flex items-center gap-2 text-yellow-500"><AlertTriangle className={iconClass} />Skipped</span>;
  }
  if (status === 'failed') {
    return <span className="inline-flex items-center gap-2 text-red-500"><XCircle className={iconClass} />Failed</span>;
  }
  return <span className="text-text-secondary">Pending</span>;
}

function IssuePanel({ items }: { items: BulkItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items : items.slice(0, 24);

  if (items.length === 0) {
    return null;
  }

  const exportIssues = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      count: items.length,
      issues: items.map(item => ({
        file: (item.file as File & { webkitRelativePath?: string }).webkitRelativePath || item.file.name,
        name: item.file.name,
        size: item.file.size,
        lastModified: item.file.lastModified,
        status: item.status,
        message: item.message,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bulk-import-issues-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-surface/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Issues</h2>
          <p className="text-xs text-text-secondary">{items.length} failed or skipped images</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportIssues}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover"
          >
            Export JSON
          </button>
          {items.length > 24 && (
          <button
            type="button"
            onClick={() => setExpanded(value => !value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover"
          >
            {expanded ? 'Show fewer' : `Show all ${items.length}`}
          </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {visibleItems.map(item => (
          <IssueCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function IssueCard({ item }: { item: BulkItem }) {
  const fileName = (item.file as File & { webkitRelativePath?: string }).webkitRelativePath || item.file.name;
  const previewUrl = useMemo(() => URL.createObjectURL(item.file), [item.file]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <article className="grid grid-cols-[112px_1fr] gap-3 rounded-md border border-border bg-background p-2">
      <div className="aspect-video overflow-hidden rounded border border-border bg-surface">
        <img src={previewUrl} alt="" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <StatusBadge status={item.status} />
        </div>
        <div className="mt-1 truncate text-sm text-text-primary" title={fileName}>{fileName}</div>
        <p className="mt-1 wrap-break-word text-xs leading-5 text-text-secondary">{item.message || 'No message'}</p>
      </div>
    </article>
  );
}
