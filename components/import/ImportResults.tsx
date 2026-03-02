'use client';

import { useState } from 'react';
import type { AnalysisData, EchoOCRData } from '@/lib/import/types';
import type { RegionKey } from '@/lib/import/regions';
import { useGameData } from '@/contexts/GameDataContext';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface ImportResultsProps {
  data: AnalysisData;
  isProcessing: boolean;
  progress: Record<RegionKey, 'pending' | 'done' | 'error'>;
  onImport: (watermarkOverride: { username: string; uid: string }) => void;
}

function ProgressDot({ status }: { status: 'pending' | 'done' | 'error' }) {
  if (status === 'done')  return <CheckCircle className="w-4 h-4 text-green-400" />;
  if (status === 'error') return <XCircle className="w-4 h-4 text-red-400" />;
  return <Loader2 className="w-4 h-4 text-text-primary/40 animate-spin" />;
}


function EchoCard({ echo }: { echo?: EchoOCRData }) {
  const { getEcho } = useGameData();

  if (!echo) {
    return (
      <div className="bg-background-secondary rounded-lg p-2 flex flex-col items-center justify-center opacity-40 border border-border min-h-[160px]">
        <span className="text-xs text-text-primary/40">—</span>
      </div>
    );
  }

  const echoObj = echo.name?.id ? getEcho(echo.name.id) : null;
  const iconSrc = getEchoPaths(echoObj);

  return (
    <div className="bg-background-secondary rounded-lg p-2 flex flex-col border border-border text-[11px] overflow-hidden">
      {/* Icon */}
      <div className="flex justify-center mb-1.5">
        <img
          src={iconSrc}
          alt={echo.name?.name ?? 'echo'}
          className="w-10 h-10 object-contain rounded"
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      {/* Echo name */}
      <p className="font-semibold text-text-primary truncate mb-1">
        {echo.name?.name ?? '—'}
      </p>

      {/* Main stat */}
      {echo.main && (
        <p className="truncate text-accent mb-1">
          {echo.main.name}: {echo.main.value}
        </p>
      )}

      {/* Substats */}
      {(echo.substats ?? []).slice(0, 5).map((sub, i) => (
        <p key={i} className="truncate text-text-primary/60">
          {sub?.name ?? ''}: {sub?.value ?? ''}
        </p>
      ))}
    </div>
  );
}

export function ImportResults({ data, isProcessing, progress, onImport }: ImportResultsProps) {
  const { getCharacterByName, weaponList } = useGameData();

  const [username, setUsername] = useState(data.watermark?.username ?? '');
  const [uid, setUid]           = useState(String(data.watermark?.uid ?? ''));

  const char   = data.character;
  const weapon = data.weapon;
  const forte  = data.forte;
  const seq    = data.sequences?.sequence ?? 0;
  const echoKeys = ['echo1', 'echo2', 'echo3', 'echo4', 'echo5'] as const;

  const canImport = !isProcessing && (
    progress.character === 'done' || progress.character === 'error'
  );

  const charObj   = char?.name   ? getCharacterByName(char.name) : null;
  const weaponObj = weapon?.name ? (weaponList.find(w => w.name === weapon.name) ?? null) : null;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">

      {/* Scan progress */}
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
        <div className="bg-background-secondary rounded-xl p-4 border border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-text-primary/50 mb-1">Character</p>
            <p className="font-semibold text-text-primary truncate">{char?.name ?? '—'}</p>
            <p className="text-sm text-accent">Lv. {char?.level ?? '?'}</p>
          </div>
          {charObj?.iconRound && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={charObj.iconRound}
              alt={char?.name ?? ''}
              className="w-12 h-12 rounded-full object-cover shrink-0 border border-border"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="bg-background-secondary rounded-xl p-4 border border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-text-primary/50 mb-1">Weapon</p>
            <p className="font-semibold text-text-primary truncate">{weapon?.name ?? '—'}</p>
            <p className="text-sm text-accent">Lv. {weapon?.level ?? '?'}</p>
          </div>
          {weaponObj && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getWeaponPaths(weaponObj)}
              alt={weapon?.name ?? ''}
              className="w-12 h-12 object-contain shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>
      </div>

      {/* Sequence + Forte — two columns */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-background-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-primary/50 mb-3">Sequence</p>
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
        </div>

        <div className="bg-background-secondary rounded-xl p-4 border border-border">
          <p className="text-xs text-text-primary/50 mb-3">Forte levels</p>
          {forte ? (
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

      {/* Echoes — 5 equal columns */}
      <div>
        <p className="text-xs text-text-primary/50 mb-2">Echoes</p>
        <div className="grid grid-cols-5 gap-2">
          {echoKeys.map(k => (
            <EchoCard key={k} echo={data[k]} />
          ))}
        </div>
      </div>

      {/* Player info */}
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
