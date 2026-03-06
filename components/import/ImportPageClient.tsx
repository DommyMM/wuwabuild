'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useOcrImport } from '@/hooks/useOcrImport';
import { loadImage } from '@/lib/import/cropImage';
import { convertAnalysisToSavedState } from '@/lib/import/convert';
import { saveBuild } from '@/lib/storage';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImportUploader } from './ImportUploader';
import { ImportResults } from './ImportResults';
import type { AnalysisData } from '@/lib/import/types';
import { AlertTriangle, RotateCcw } from 'lucide-react';

type ImportStep = 'upload' | 'results';

export function ImportPageClient() {
  const router = useRouter();
  const { loadState, state: buildState } = useBuild();
  const gameData = useGameData();
  const { success, error: notifyError } = useToast();
  const { isProcessing, progress, analysisData, error, processImage, reset } = useOcrImport();

  const [step, setStep]                       = useState<ImportStep>('upload');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadToLb, setUploadToLb]           = useState(true);
  const [pendingWm, setPendingWm]             = useState<{ username: string; uid: string } | null>(null);

  // Silent wake-up ping so Railway auto-starts the server if sleeping
  useEffect(() => { fetch('/api/ocr').catch(() => {}); }, []);

  const handleFile = async (f: File) => {
    setValidationError(null);

    const img = await loadImage(f);
    if (img.naturalWidth !== 1920 || img.naturalHeight !== 1080) {
      setValidationError(
        `Image should be 1920×1080, got ${img.naturalWidth}×${img.naturalHeight}. ` +
        `For best results, download the image from Discord instead of screenshotting`
      );
      return;
    }

    reset();
    setStep('results');
    processImage(f);
  };

  const handleReset = () => {
    reset();
    setStep('upload');
    setValidationError(null);
  };

  const buildImportedState = (wm: { username: string; uid: string }) => {
    const mergedData: AnalysisData = {
      ...analysisData,
      watermark: { username: wm.username, uid: Number(wm.uid) || 0 },
    };

    return convertAnalysisToSavedState(mergedData, {
      characters: gameData.characters,
      weapons:    gameData.weapons,
      echoes:     gameData.echoes,
    });
  };

  const doImport = (wm: { username: string; uid: string }) => {
    const importedState = buildImportedState(wm);
    loadState(importedState);
    router.push('/edit');
  };

  const saveImportToSaves = (wm: { username: string; uid: string }) => {
    try {
      const importedState = buildImportedState(wm);
      const characterName =
        gameData.getCharacter(importedState.characterId)?.name ??
        analysisData.character?.name ??
        'Imported Build';

      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const saved = saveBuild({
        name: `${characterName} Import ${stamp}`,
        state: importedState,
      });

      success(`Saved "${saved.name}".`);
      router.push('/saves');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to save imported build.');
    }
  };

  const handleImport = (wm: { username: string; uid: string }) => {
    if (buildState.characterId) {
      setPendingWm(wm); // show confirmation modal
    } else {
      doImport(wm);
    }
  };

  return (
    <main className="bg-background p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Import Build</h1>
            <p className="text-sm text-text-primary/50">
              Import a build from a wuwa-bot screenshot —{' '}
              <a
                href="https://discord.com/channels/963760374543450182/1323199091072569479"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover underline underline-offset-2 transition-colors"
              >
                get yours in the Discord
              </a>
            </p>
          </div>

          {step === 'results' && (
            <div className="flex items-center gap-3 shrink-0 self-end">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={uploadToLb}
                  onChange={e => setUploadToLb(e.target.checked)}
                  className="w-4 h-4 accent-(--color-accent) cursor-pointer"
                />
                <span className="text-sm text-text-primary/70">Upload to Leaderboard</span>
              </label>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-text-primary/60 hover:text-text-primary hover:bg-background-secondary border border-border transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {validationError}
          </div>
        )}

        {/* OCR error */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {step === 'upload' && <ImportUploader onFile={handleFile} />}

        {step === 'results' && (
          <ImportResults
            data={analysisData}
            isProcessing={isProcessing}
            progress={progress}
            onImport={handleImport}
          />
        )}

      </div>

      {/* Override confirmation modal */}
      <ConfirmDialog
        isOpen={Boolean(pendingWm)}
        onClose={() => setPendingWm(null)}
        title="Replace current build?"
        icon={<AlertTriangle className="h-5 w-5" />}
        description={
          <>
            You have{' '}
            <span className="font-medium text-text-primary">
              {gameData.getCharacter(buildState.characterId)?.name ?? 'a build'}
            </span>{' '}
            loaded. You can overwrite it, or save this import as a build to the{' '}
            <Link
              href="/saves"
              className="text-accent underline underline-offset-2 transition-colors hover:text-accent-hover"
            >
              Saves page
            </Link>
            .
          </>
        }
        actions={(
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                if (!pendingWm) return;
                saveImportToSaves(pendingWm);
                setPendingWm(null);
              }}
              className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              Save Build
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPendingWm(null)}
                className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-text-primary/70 transition-colors hover:border-text-primary/30 hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!pendingWm) return;
                  doImport(pendingWm);
                  setPendingWm(null);
                }}
                className="w-full rounded-xl border border-red-500/45 bg-red-500/15 py-2 text-sm font-semibold text-red-300 transition-colors hover:border-red-500/70 hover:bg-red-500/25"
              >
                Override Current
              </button>
            </div>
          </div>
        )}
      />

    </main>
  );
}
