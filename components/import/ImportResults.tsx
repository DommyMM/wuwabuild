'use client';

import { useState } from 'react';
import type { AnalysisData, EchoOCRData } from '@/lib/import/types';
import type { RegionKey } from '@/lib/import/regions';
import { useGameData } from '@/contexts/GameDataContext';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { getEchoSubstatShortLabel } from '@/lib/echoStatLabels';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ImportResultsProps {
  data: AnalysisData;
  isProcessing: boolean;
  progress: Record<RegionKey, 'pending' | 'done' | 'error'>;
  onImport: (watermarkOverride: { username: string; uid: string }) => void;
}

/** Single pulsing skeleton block. */
function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-text-primary/10 ${className}`} />;
}

function ImageWithSkeleton({
  src,
  alt,
  imgClassName,
  skeletonClassName,
}: {
  src?: string | null;
  alt: string;
  imgClassName: string;
  skeletonClassName: string;
}) {
  const [isLoaded, setIsLoaded] = useState(() => !src);
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <Sk className={skeletonClassName} />;
  }

  return (
    <div className="relative">
      {!isLoaded && (
        <Sk className={`absolute inset-0 ${skeletonClassName}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${imgClassName} transition-opacity duration-200 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function ProgressDot({ status }: { status: 'pending' | 'done' | 'error' }) {
  if (status === 'done')  return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === 'error') return <XCircle className="w-4 h-4 text-red-400" />;
  return <Loader2 className="w-4 h-4 text-text-primary/40 animate-spin" />;
}

function EchoCard({ echo, pending, className }: { echo?: EchoOCRData; pending?: boolean; className?: string }) {
  const { getEcho } = useGameData();
  const rootClass = `bg-background-secondary rounded-lg p-2 flex flex-col border border-border text-[11px] overflow-hidden ${className ?? ''}`;

  if (pending) {
    return (
      <div className={rootClass}>
        <div className="flex justify-center mb-1.5">
          <Sk className="w-10 h-10" />
        </div>
        <Sk className="h-3 w-full mb-1.5" />
        <Sk className="h-2.5 w-3/4 mb-1" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Sk key={i} className="h-2.5 w-full mb-0.5" />
        ))}
      </div>
    );
  }

  if (!echo) {
    return (
      <div className={`${rootClass} items-center justify-center opacity-40 min-h-[160px]`}>
        <span className="text-xs text-text-primary/40">—</span>
      </div>
    );
  }

  const echoObj = echo.name?.id ? getEcho(echo.name.id) : null;
  const iconSrc = getEchoPaths(echoObj);

  return (
    <div className={rootClass}>
      <div className="flex justify-center mb-1.5">
        <ImageWithSkeleton
          key={iconSrc ?? 'echo-icon'}
          src={iconSrc}
          alt={echo.name?.name ?? 'echo'}
          imgClassName="w-10 h-10 object-contain rounded"
          skeletonClassName="w-10 h-10 rounded"
        />
      </div>
      <p className="font-semibold text-text-primary truncate mb-1">
        {echo.name?.name ?? '—'}
      </p>
      {echo.main && (
        <div className="flex justify-between gap-1 mb-1">
          <span className="truncate text-accent">{echo.main.name}</span>
          <span className="shrink-0 text-accent">{echo.main.value}</span>
        </div>
      )}
      {(echo.substats ?? []).slice(0, 5).map((sub, i) => (
        <div key={i} className="flex justify-between gap-1">
          <span className="truncate text-text-primary/60">
            {getEchoSubstatShortLabel(sub?.name ?? '')}
          </span>
          <span className="shrink-0 text-text-primary/60">{sub?.value ?? ''}</span>
        </div>
      ))}
    </div>
  );
}

export function ImportResults({ data, isProcessing, progress, onImport }: ImportResultsProps) {
  const { getCharacterByName, weaponList } = useGameData();

  const [watermarkOverride, setWatermarkOverride] = useState<{ username?: string; uid?: string }>({});
  const username = watermarkOverride.username ?? data.watermark?.username ?? '';
  const uid = watermarkOverride.uid ?? String(data.watermark?.uid ?? '');

  const char   = data.character;
  const weapon = data.weapon;
  const forte  = data.forte;
  const seq    = data.sequences?.sequence ?? 0;
  const echoKeys = ['echo1', 'echo2', 'echo3', 'echo4', 'echo5'] as const;
  const progressEntries = Object.entries(progress) as [RegionKey, 'pending' | 'done' | 'error'][];

  const canImport = !isProcessing && (
    progress.character === 'done' || progress.character === 'error'
  );

  const charPending   = progress.character  === 'pending';
  const weaponPending = progress.weapon     === 'pending';
  const seqPending    = progress.sequences  === 'pending';
  const fortePending  = progress.forte      === 'pending';

  const charObj   = char?.name   ? getCharacterByName(char.name) : null;
  const weaponObj = weapon?.name ? (weaponList.find(w => w.name === weapon.name) ?? null) : null;

  return (
    <div className="w-full mx-auto flex flex-col gap-4 sm:gap-6">

      {/* Scan progress */}
      <div className="bg-background-secondary rounded-xl p-4 border border-border">
        <p className="text-sm font-semibold mb-3 text-text-primary/70">Scan progress</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {progressEntries.map(([key, status], index) => (
            <div
              key={key}
              className={[
                'flex flex-col items-center gap-1',
                index === progressEntries.length - 1 ? 'col-start-2 sm:col-start-auto' : '',
              ].join(' ')}
            >
              <ProgressDot status={status} />
              <span className="text-[10px] text-text-primary/50 capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Character + Weapon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-background-secondary rounded-xl p-4 border border-border flex items-center justify-between gap-3">
          {charPending ? (
            <>
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <Sk className="h-3 w-16" />
                <Sk className="h-4 w-28" />
                <Sk className="h-3 w-10" />
              </div>
              <Sk className="w-12 h-12 shrink-0" />
            </>
          ) : (
            <>
              <div className="min-w-0">
                <p className="text-xs text-text-primary/50 mb-1">Character</p>
                <p className="font-semibold text-text-primary truncate">{char?.name ?? '—'}</p>
                <p className="text-sm text-accent">Lv. {char?.level ?? '?'}</p>
              </div>
              {charObj?.head && (
                <ImageWithSkeleton
                  key={charObj.head}
                  src={charObj.head}
                  alt={char?.name ?? ''}
                  imgClassName="w-12 h-12 object-cover shrink-0 rounded"
                  skeletonClassName="w-12 h-12 shrink-0 rounded"
                />
              )}
            </>
          )}
        </div>

        <div className="bg-background-secondary rounded-xl p-4 border border-border flex items-center justify-between gap-3">
          {weaponPending ? (
            <>
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <Sk className="h-3 w-16" />
                <Sk className="h-4 w-32" />
                <Sk className="h-3 w-10" />
              </div>
              <Sk className="w-12 h-12 shrink-0" />
            </>
          ) : (
            <>
              <div className="min-w-0">
                <p className="text-xs text-text-primary/50 mb-1">Weapon</p>
                <p className="font-semibold text-text-primary truncate">{weapon?.name ?? '—'}</p>
                <p className="text-sm text-accent">Lv. {weapon?.level ?? '?'}</p>
              </div>
              {weaponObj && (
                <ImageWithSkeleton
                  key={weaponObj.name}
                  src={getWeaponPaths(weaponObj)}
                  alt={weapon?.name ?? ''}
                  imgClassName="w-12 h-12 object-contain shrink-0"
                  skeletonClassName="w-12 h-12 shrink-0 rounded"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Sequence + Forte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-background-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-primary/50 mb-3">Sequence</p>
          {seqPending ? (
            <div className="flex justify-between">
              {Array.from({ length: 6 }).map((_, i) => (
                <Sk key={i} className="w-7 h-7 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex justify-between">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={[
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold',
                    i < seq
                      ? 'border-accent bg-accent/20 text-accent'
                      : 'border-border text-text-primary/30',
                  ].join(' ')}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-background-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-primary/50 mb-3">Forte levels</p>
          {fortePending ? (
            <div className="flex justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <Sk className="h-4 w-5" />
                  <Sk className="h-2.5 w-8" />
                </div>
              ))}
            </div>
          ) : forte ? (
            <div className="flex justify-between">
              {['Normal', 'Skill', 'Circuit', 'Intro', 'Liberation'].map((label, i) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-accent font-bold text-sm">{forte?.levels?.[i] ?? 0}</span>
                  <span className="text-[9px] text-text-primary/50 text-center">{label}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-primary/30">—</p>
          )}
        </div>
      </div>

      {/* 5 equal Echoes columns */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {echoKeys.map((k, index) => (
            <EchoCard
              key={k}
              echo={data[k]}
              pending={progress[k] === 'pending'}
              className={index === echoKeys.length - 1
                ? 'col-span-2 w-[calc(50%-0.25rem)] justify-self-center sm:col-span-1 sm:w-auto sm:justify-self-auto'
                : undefined}
            />
          ))}
        </div>
      </div>

      {/* Player info */}
      <div className="bg-background-secondary rounded-xl p-4 border border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-primary/60">Username</span>
            <input
              type="text"
              value={username}
              onChange={e => setWatermarkOverride(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Username"
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-primary/60">UID</span>
            <input
              type="text"
              value={uid}
              onChange={e => setWatermarkOverride(prev => ({ ...prev, uid: e.target.value.replace(/\D/g, '') }))}
              placeholder="UID"
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
            />
          </label>
        </div>
      </div>

      {/* Import button */}
      <button
        onClick={() => onImport({ username, uid })}
        disabled={!canImport}
        className={[
          'w-full py-3 rounded-xl font-semibold text-sm transition-all',
          canImport
            ? 'bg-accent text-background hover:bg-accent-hover cursor-pointer'
            : 'bg-border text-text-primary/30 cursor-not-allowed',
        ].join(' ')}
      >
        {isProcessing ? 'Processing…' : 'Import Build'}
      </button>
    </div>
  );
}
