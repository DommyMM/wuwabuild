'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { loadImage, cropImageToRegion } from '@/lib/import/cropImage';
import { IMPORT_REGIONS, type RegionKey } from '@/lib/import/regions';
import { convertAnalysisToSavedState } from '@/lib/import/convert';
import { unwrapOcrAnalysisPayload } from '@/lib/import/ocrPayload';
import type { AnalysisData } from '@/lib/import/types';
import { submitBuild } from '@/lib/lb';
import { AlertTriangle, CheckCircle2, FolderOpen, Loader2, Pause, Play, RotateCcw, UploadCloud, XCircle } from 'lucide-react';

type BulkStatus = 'pending' | 'processing' | 'submitted' | 'skipped' | 'failed';

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

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const REGION_KEYS = Object.keys(IMPORT_REGIONS) as RegionKey[];

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

function normalizeFiles(fileList: FileList | File[]) {
  const seen = new Set<string>();
  const files = Array.from(fileList)
    .filter(file => ACCEPTED_IMAGE_TYPES.has(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name))
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

async function postRegion(file: File, image: HTMLImageElement, regionKey: RegionKey) {
  const base64 = await cropImageToRegion(image, IMPORT_REGIONS[regionKey]);
  const response = await fetch('/api/ocr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-Region': regionKey,
    },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) {
    throw new Error(`${regionKey} OCR failed (${response.status}) for ${file.name}`);
  }

  const payload = await response.json();
  return unwrapOcrAnalysisPayload(payload, `${regionKey} OCR for ${file.name}`);
}

export function BulkImportPageClient() {
  const gameData = useGameData();
  const [allItems, setAllItems] = useState<BulkItem[]>([]);
  const [items, setItems] = useState<BulkItem[]>([]);
  const [counters, setCounters] = useState<Counters>(() => createInitialCounters(0));
  const [imageConcurrency, setImageConcurrency] = useState(2);
  const [selectionLimit, setSelectionLimit] = useState<number | null>(null);
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

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const nextItems = normalizeFiles(fileList);
    const queuedItems = applyLimit(nextItems, selectionLimit);
    setAllItems(nextItems);
    setItems(queuedItems);
    setCounters(createInitialCounters(queuedItems.length));
    setIsPaused(false);
    pauseRef.current = false;
    stopRef.current = false;
  };

  const applyQueuedLimit = (limit: number | null) => {
    if (isRunning) return;
    setSelectionLimit(limit);
    const queuedItems = applyLimit(allItems, limit);
    setItems(queuedItems);
    setCounters(createInitialCounters(queuedItems.length));
    setIsPaused(false);
    pauseRef.current = false;
    stopRef.current = false;
  };

  const processOne = async (item: BulkItem) => {
    setItem(item.id, { status: 'processing', message: 'OCR running' });

    try {
      const image = await loadImage(item.file);
      if (image.naturalWidth !== 1920 || image.naturalHeight !== 1080) {
        setItem(item.id, {
          status: 'skipped',
          message: `Skipped ${image.naturalWidth}x${image.naturalHeight}`,
        });
        addCounter({ processed: 1, skipped: 1 });
        return;
      }

      const analysisEntries = await Promise.all(
        REGION_KEYS.map(async regionKey => [regionKey, await postRegion(item.file, image, regionKey)] as const),
      );
      const analysisData = Object.fromEntries(analysisEntries) as AnalysisData;

      const savedState = convertAnalysisToSavedState(analysisData, {
        characters: gameData.characters,
        weapons: gameData.weapons,
        echoes: gameData.echoes,
      });

      const trimmedUid = savedState.watermark.uid.trim();
      if (!savedState.characterId || !savedState.weaponId || !trimmedUid || trimmedUid === '0') {
        setItem(item.id, { status: 'skipped', message: 'Missing character, weapon, or UID' });
        addCounter({ processed: 1, skipped: 1 });
        return;
      }

      const result = await submitBuild(savedState);
      setItem(item.id, {
        status: 'submitted',
        message: `${result.action}${result.damageComputed ? '' : ' without damage calc'}`,
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
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-surface-hover">
              <FolderOpen className="h-4 w-4" />
              Folder
              <input
                type="file"
                multiple
                accept="image/*"
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
                accept="image/*"
                className="hidden"
                onChange={event => handleFiles(event.target.files)}
              />
            </label>
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
                setSelectionLimit(value ? Math.max(1, Math.min(10000, Number(value) || 1)) : null);
              }}
              className="w-20 rounded-md border border-border bg-surface px-2 py-1 text-text-primary"
            />
          </label>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applyQueuedLimit(null)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            All
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => applyQueuedLimit(100)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            100
          </button>
          <button
            type="button"
            disabled={isRunning || allItems.length === 0}
            onClick={() => applyQueuedLimit(selectionLimit)}
            className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply limit
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
          <span>{pendingCount} pending · {items.length} queued / {allItems.length} loaded · {selectionLimit ? `first ${selectionLimit}` : 'all'} selected</span>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-border text-sm text-text-secondary">
          Choose the local r2-backup folder or select image files to start.
        </section>
      ) : (
        <>
          <section className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[120px_1fr_160px] border-b border-border bg-surface px-3 py-2 text-xs font-medium uppercase text-text-secondary">
              <span>Status</span>
              <span>File</span>
              <span>Result</span>
            </div>
            <div className="max-h-[420px] overflow-auto">
              {recentRows.map(item => (
                <div key={item.id} className="grid grid-cols-[120px_1fr_160px] gap-3 border-b border-border/60 px-3 py-2 text-sm last:border-b-0">
                  <StatusBadge status={item.status} />
                  <span className="truncate text-text-primary" title={(item.file as File & { webkitRelativePath?: string }).webkitRelativePath || item.file.name}>
                    {(item.file as File & { webkitRelativePath?: string }).webkitRelativePath || item.file.name}
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
