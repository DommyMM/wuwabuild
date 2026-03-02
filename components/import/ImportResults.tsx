'use client';

import { useState } from 'react';
import type { AnalysisData, EchoOCRData } from '@/lib/import/types';
import type { RegionKey } from '@/lib/import/regions';
import { useGameData } from '@/contexts/GameDataContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ImportResultsProps {
  data: AnalysisData;
  isProcessing: boolean;
  progress: Record<RegionKey, 'pending' | 'done' | 'error'>;
  onImport: (watermarkOverride: { username: string; uid: string }) => void;
}

function ProgressDot({ status }: { status: 'pending' | 'done' | 'error' }) {
  if (status === 'done')    return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === 'error')   return <XCircle className="w-4 h-4 text-red-400" />;
  return <Loader2 className="w-4 h-4 text-text-primary/40 animate-spin" />;
}

function EchoCard({ echo }: { echo?: EchoOCRData }) {
  if (!echo) {
    return (
      <div className="bg-background-secondary rounded-lg p-3 flex-1 opacity-40 border border-border">
        <p className="text-xs text-center">—</p>
      </div>
    );
  }
  return (
    <div className="bg-background-secondary rounded-lg p-3 flex-1 border border-border text-xs">
      <p className="font-semibold text-text-primary truncate" title={echo.name.name}>
        {echo.name.name}
      </p>
      <p className="text-accent mt-1 truncate">
        {echo.main.name}: {echo.main.value}
      </p>
      {echo.substats.slice(0, 5).map((sub, i) => (
        <p key={i} className="text-text-primary/60 truncate">
          {sub.name}: {sub.value}
        </p>
      ))}
    </div>
  );
}

export function ImportResults({ data, isProcessing, progress, onImport }: ImportResultsProps) {
  const { getCharacter, getWeapon } = useGameData();

  const [username, setUsername] = useState(data.watermark?.username ?? '');
  const [uid, setUid]           = useState(String(data.watermark?.uid ?? ''));

  const char    = data.character;
  const weapon  = data.weapon;
  const forte   = data.forte;
  const seq     = data.sequences?.sequence ?? 0;
  const echoKeys = ['echo1', 'echo2', 'echo3', 'echo4', 'echo5'] as const;

  const canImport = !isProcessing && (
    progress.character === 'done' || progress.character === 'error'
  );

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">

      {/* Processing progress */}
      <div className="bg-background-secondary rounded-xl p-4 border border-border">
        <p className="text-sm font-semibold mb-3 text-text-primary/70">Scan progress</p>
        <div className="grid grid-cols-5 gap-2">
          {(Object.entries(progress) as [RegionKey, 'pending' | 'done' | 'error'][]).map(([key, status]) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <ProgressDot status={status} />
              <span className="text-[10px] text-text-primary/50 capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Character + Weapon */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-primary/50 mb-1">Character</p>
          <p className="font-semibold text-text-primary">
            {char?.name ?? '—'}
          </p>
          <p className="text-sm text-accent">Lv. {char?.level ?? '?'}</p>
        </div>
        <div className="bg-background-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-primary/50 mb-1">Weapon</p>
          <p className="font-semibold text-text-primary">
            {weapon?.name ?? '—'}
          </p>
          <p className="text-sm text-accent">Lv. {weapon?.level ?? '?'}</p>
        </div>
      </div>

      {/* Sequence */}
      <div className="bg-background-secondary rounded-xl p-4 border border-border">
        <p className="text-xs text-text-primary/50 mb-2">Sequence</p>
        <div className="flex gap-2">
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
      </div>

      {/* Forte */}
      {forte && (
        <div className="bg-background-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-primary/50 mb-2">Forte levels</p>
          <div className="flex gap-3">
            {['Normal', 'Skill', 'Circuit', 'Intro', 'Lib'].map((label, i) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <span className="text-accent font-bold text-sm">{forte.levels[i] ?? 0}</span>
                <span className="text-[10px] text-text-primary/50">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Echoes */}
      <div>
        <p className="text-xs text-text-primary/50 mb-2">Echoes</p>
        <div className="flex gap-2">
          {echoKeys.map(k => (
            <EchoCard key={k} echo={data[k]} />
          ))}
        </div>
      </div>

      {/* Player info (editable) */}
      <div className="bg-background-secondary rounded-xl p-4 border border-border">
        <p className="text-xs text-text-primary/50 mb-3">Player info</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-primary/60">Username</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-text-primary/60">UID</span>
            <input
              type="text"
              value={uid}
              onChange={e => setUid(e.target.value.replace(/\D/g, ''))}
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
