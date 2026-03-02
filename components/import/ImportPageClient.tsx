'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuild } from '@/contexts/BuildContext';
import { useOcrImport } from '@/hooks/useOcrImport';
import { ImportUploader } from './ImportUploader';
import { ImportResults } from './ImportResults';
import { ImportPreview } from './ImportPreview';
import type { SavedState } from '@/lib/build';
import { ArrowLeft } from 'lucide-react';

type ImportStep = 'upload' | 'process' | 'results';

export function ImportPageClient() {
  const router = useRouter();
  const { loadState } = useBuild();
  const { isProcessing, progress, analysisData, error, processImage, reset } = useOcrImport();

  const [file, setFile]                     = useState<File | null>(null);
  const [step, setStep]                     = useState<ImportStep>('upload');
  const [showPreview, setShowPreview]       = useState(false);
  const [watermarkOverride, setWatermark]   = useState<{ username: string; uid: string } | null>(null);
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null);
  // Silent wake-up ping, Railway will auto start server if sleeping
  useEffect(() => { fetch('/api/ocr').catch(() => {}); }, []);

  // Generate preview thumbnail URL
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (f: File) => {
    setFile(f);
    setStep('process');
    reset();
  };

  const handleProcess = async () => {
    if (!file) return;
    await processImage(file);
    setStep('results');
  };

  const handleBack = () => {
    if (step === 'results') {
      setStep('process');
      setShowPreview(false);
    } else if (step === 'process') {
      setStep('upload');
      setFile(null);
      reset();
    }
  };

  const handleImport = (wm: { username: string; uid: string }) => {
    setWatermark(wm);
    setShowPreview(true);
  };

  const handleConfirm = (state: SavedState) => {
    loadState(state);
    router.push('/edit');
  };

  return (
    <main className="min-h-screen bg-background px-4 py-8">
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

        {/* Error banner */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <ImportUploader onFile={handleFile} />
        )}

        {/* Step: Process */}
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

        {/* Step: Results */}
        {step === 'results' && (
          <ImportResults
            data={analysisData}
            isProcessing={isProcessing}
            progress={progress}
            onImport={handleImport}
          />
        )}
      </div>

      {/* Preview modal */}
      {showPreview && (
        <ImportPreview
          data={analysisData}
          watermarkOverride={watermarkOverride ?? undefined}
          onConfirm={handleConfirm}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </main>
  );
}
