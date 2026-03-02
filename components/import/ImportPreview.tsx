'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { BuildProvider } from '@/contexts/BuildContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { BuildCard } from '@/components/build/BuildCard';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { convertAnalysisToSavedState } from '@/lib/import/convert';
import type { AnalysisData } from '@/lib/import/types';
import type { SavedState } from '@/lib/build';

interface ImportPreviewInnerProps {
  onConfirm: (state: SavedState) => void;
  onCancel: () => void;
  savedState: SavedState;
}

function ImportPreviewInner({ onConfirm, onCancel, savedState }: ImportPreviewInnerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="font-semibold text-text-primary">Preview Import</h2>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-text-primary/60 hover:text-text-primary hover:bg-background-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Build card preview */}
        <div className="p-4">
          <BuildCard />
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-border sticky bottom-0 bg-background">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-primary/70 hover:text-text-primary hover:border-text-primary/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(savedState)}
            className="flex-1 py-2.5 rounded-xl bg-accent text-background text-sm font-semibold hover:bg-accent-hover transition-colors"
          >
            Confirm Import
          </button>
        </div>
      </div>
    </div>
  );
}

interface ImportPreviewProps {
  data: AnalysisData;
  watermarkOverride?: { username: string; uid: string };
  onConfirm: (state: SavedState) => void;
  onCancel: () => void;
}

export function ImportPreview({ data, watermarkOverride, onConfirm, onCancel }: ImportPreviewProps) {
  const gameData = useGameData();

  const savedState = useMemo(() => {
    const mainStatsArg: Record<string, Record<string, [number, number]>> = {};
    if (gameData.mainStats) {
      for (const [cost, costData] of Object.entries(gameData.mainStats)) {
        mainStatsArg[cost] = costData.mainStats;
      }
    }

    const subStatsArg: Record<string, number[]> = {};
    if (gameData.substats) {
      for (const [stat, values] of Object.entries(gameData.substats)) {
        subStatsArg[stat] = values;
      }
    }

    const mergedData: AnalysisData = {
      ...data,
      watermark: watermarkOverride
        ? { username: watermarkOverride.username, uid: Number(watermarkOverride.uid) || 0 }
        : data.watermark,
    };

    return convertAnalysisToSavedState(mergedData, {
      characters: gameData.characters,
      weapons: gameData.weapons,
      echoes: gameData.echoes,
      mainStats: mainStatsArg,
      substats: subStatsArg,
    });
  }, [data, watermarkOverride, gameData]);

  return (
    <BuildProvider persistDraft={false} initialState={savedState}>
      <StatsProvider>
        <ImportPreviewInner
          onConfirm={onConfirm}
          onCancel={onCancel}
          savedState={savedState}
        />
      </StatsProvider>
    </BuildProvider>
  );
}
