'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useOcrImport } from '@/hooks/useOcrImport';
import { loadImage, getImageDpi } from '@/lib/import/cropImage';
import { convertAnalysisToSavedState } from '@/lib/import/convert';
import { ImportUploader } from './ImportUploader';
import { ImportResults } from './ImportResults';
import type { AnalysisData } from '@/lib/import/types';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

type ImportStep = 'upload' | 'process' | 'results';

export function ImportPageClient() {
  const router = useRouter();
  const { loadState } = useBuild();
  const gameData = useGameData();
  const { isProcessing, progress, analysisData, error, processImage, reset } = useOcrImport();

  const [file, setFile]                       = useState<File | null>(null);
  const [step, setStep]                       = useState<ImportStep>('upload');
  const [previewUrl, setPreviewUrl]           = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dpiWarning, setDpiWarning]           = useState(false);

  // Silent wake-up ping so Railway auto-starts the server if sleeping
  useEffect(() => { fetch('/api/ocr').catch(() => {}); }, []);

  // Generate preview thumbnail URL
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = async (f: File) => {
    setValidationError(null);
    setDpiWarning(false);

    const img = await loadImage(f);
    if (img.naturalWidth !== 1920 || img.naturalHeight !== 1080) {
      setValidationError(
        `Image should be 1920×1080, got ${img.naturalWidth}×${img.naturalHeight}. ` +
        `For best results, download the image from Discord instead of screenshotting`
      );
      return;
    }

    const dpi = await getImageDpi(f);
    if (dpi !== null && dpi !== 96) setDpiWarning(true);

    setFile(f);
    setStep('process');
    reset();
  };

  const handleProcess = async () => {
    if (!file) return;
    setStep('results');       // Show results immediately so progress updates stream live
    await processImage(file);
  };

  const handleBack = () => {
    if (step === 'results') {
      setStep('process');
    } else if (step === 'process') {
      setStep('upload');
      setFile(null);
      setDpiWarning(false);
      reset();
    }
  };

  const handleImport = (wm: { username: string; uid: string }) => {
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
      ...analysisData,
      watermark: { username: wm.username, uid: Number(wm.uid) || 0 },
    };

    const state = convertAnalysisToSavedState(mergedData, {
      characters: gameData.characters,
      weapons:    gameData.weapons,
      echoes:     gameData.echoes,
      mainStats:  mainStatsArg,
      substats:   subStatsArg,
    });

    loadState(state);
    router.push('/edit');
  };

  return (
    <main className="bg-background p-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {step !== 'upload' && (
            <button
              onClick={handleBack}
              className="p-1.5 rounded-lg text-text-primary/60 hover:text-text-primary hover:bg-background-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
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
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {validationError}
          </div>
        )}

        {/* DPI warning */}
        {dpiWarning && (
          <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              This image doesn&apos;t appear to be the original 96 DPI file.
              For best results, download the image directly from Discord rather than screenshotting it.
            </span>
          </div>
        )}

        {/* OCR error */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && <ImportUploader onFile={handleFile} />}

        {/* Step: Process — show screenshot preview + scan button */}
        {step === 'process' && file && (
          <div className="flex flex-col items-center gap-6">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Screenshot preview"
                className="w-full max-w-xl rounded-xl border border-border"
              />
            )}
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className={[
                'px-8 py-3 rounded-xl font-semibold text-sm transition-all',
                isProcessing
                  ? 'bg-border text-text-primary/30 cursor-not-allowed'
                  : 'bg-accent text-background hover:bg-accent-hover cursor-pointer',
              ].join(' ')}
            >
              {isProcessing ? 'Processing…' : 'Process Screenshot'}
            </button>
          </div>
        )}

        {/* Step: Results — shows live as regions complete */}
        {step === 'results' && (
          <ImportResults
            data={analysisData}
            isProcessing={isProcessing}
            progress={progress}
            onImport={handleImport}
          />
        )}

      </div>
    </main>
  );
}
