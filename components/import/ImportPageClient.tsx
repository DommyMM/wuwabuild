'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useOcrImport } from '@/hooks/useOcrImport';
import { encodeImageFileAsJpegBase64, loadImage } from '@/lib/import/cropImage';
import { convertAnalysisToSavedState } from '@/lib/import/convert';
import { submitBuild } from '@/lib/lb';
import { loadDraftBuild, saveBuild, saveDraftBuild } from '@/lib/storage';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImportUploader } from './ImportUploader';
import { ImportResults } from './ImportResults';
import { ReportIssueModal } from './ReportIssueModal';
import type { AnalysisData } from '@/lib/import/types';
import type { SavedState } from '@/lib/build';
import { getDefaultReportReason, type OcrIssueReason } from '@/lib/import/report';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import posthog from 'posthog-js';
import Link from 'next/link';

type ImportStep = 'upload' | 'results';

export function ImportPageClient() {
  const router = useRouter();
  const gameData = useGameData();
  const { success, error: notifyError, warning, info } = useToast();
  const { isProcessing, progress, analysisData, error, processImage, reset } = useOcrImport();

  const [step, setStep]                       = useState<ImportStep>('upload');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lbUploadError, setLbUploadError]     = useState<string | null>(null);
  const [uploadToLb, setUploadToLb]           = useState(true);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [pendingWm, setPendingWm]             = useState<{ username: string; uid: string } | null>(null);
  const [draftBuildState, setDraftBuildState] = useState<SavedState | null>(() => loadDraftBuild());
  const [selectedFile, setSelectedFile]       = useState<File | null>(null);
  const [trainingImageKey, setTrainingImageKey] = useState<string | null>(null);
  const [lastImportWatermark, setLastImportWatermark] = useState<{ username: string; uid: string } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportReason, setReportReason] = useState<OcrIssueReason>('manual_report');

  // Silent wake-up ping so Railway auto-starts the server if sleeping
  useEffect(() => { fetch('/api/ocr').catch(() => {}); }, []);

  const uploadTrainingImage = async (file: File) => {
    try {
      const image = await encodeImageFileAsJpegBase64(file);
      const res = await fetch('/api/upload-training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      });
      const payload = await res.json() as { success?: boolean; key?: string };
      if (payload.success && typeof payload.key === 'string') {
        setTrainingImageKey(payload.key);
      }
    } catch {
      // Best-effort only; OCR should still continue.
    }
  };

  const handleFile = async (f: File) => {
    setValidationError(null);
    setLbUploadError(null);
    setSelectedFile(f);
    setTrainingImageKey(null);
    setLastImportWatermark(null);

    const img = await loadImage(f);
    if (img.naturalWidth !== 1920 || img.naturalHeight !== 1080) {
      const errorMsg = `Image should be 1920×1080, got ${img.naturalWidth}×${img.naturalHeight}. ` +
        `For best results, download the image from Discord instead of screenshotting`;
      setValidationError(errorMsg);
      return;
    }

    reset();
    setStep('results');
    void uploadTrainingImage(f);
    void processImage(f);
  };

  const handleReset = () => {
    reset();
    setStep('upload');
    setValidationError(null);
    setLbUploadError(null);
    setSelectedFile(null);
    setTrainingImageKey(null);
    setLastImportWatermark(null);
    setPendingWm(null);
    setIsReportModalOpen(false);
    setReportReason('manual_report');
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

  const getImportedCharacterName = (importedState: SavedState) => (
    gameData.getCharacter(importedState.characterId)?.name ??
    analysisData.character?.name ??
    'Imported Build'
  );

  const getActiveWatermark = () => (
    lastImportWatermark ?? {
      username: analysisData.watermark?.username ?? '',
      uid: String(analysisData.watermark?.uid ?? ''),
    }
  );

  const getReportImportedState = () => {
    const activeWatermark = getActiveWatermark();
    try {
      return buildImportedState(activeWatermark);
    } catch {
      return null;
    }
  };

  const openReportModal = (reason: OcrIssueReason = getDefaultReportReason({
    validationError,
    ocrError: error,
    lbUploadError,
  })) => {
    setReportReason(reason);
    setIsReportModalOpen(true);
  };

  const uploadImportedState = async (importedState: SavedState) => {
    if (!uploadToLb) return;

    if (!importedState.characterId || !importedState.weaponId) {
      warning('Leaderboard upload skipped because the imported build is missing a character or weapon match.');
      return;
    }

    if (!importedState.watermark.uid.trim()) {
      warning('Leaderboard upload skipped because UID is required for build submission.');
      return;
    }

    try {
      const result = await submitBuild(importedState);
      const actionLabel = result.action === 'created' ? 'created' : 'updated';

      if (result.warnings.length > 0) {
        warning(`Leaderboard entry ${actionLabel}. ${result.warnings[0]}`);
        return;
      }

      success(`Leaderboard entry ${actionLabel}.`);
      if (!result.damageComputed) {
        info('Build saved without fresh damage data for this character.');
      }
    } catch (err) {
      posthog.captureException(err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('illegal echo')) {
        setLbUploadError(
          'OCR may have misread one or more echo stats (e.g. a duplicate substat or wrong set assignment). ' +
          'The build was loaded to the editor for manual correction but was not submitted to the leaderboard.'
        );
      } else {
        notifyError(`Leaderboard upload failed: ${msg}`);
      }
    }
  };

  const doImport = async (wm: { username: string; uid: string }) => {
    const importedState = buildImportedState(wm);
    const shouldUpload = uploadToLb;

    try {
      if (shouldUpload) setIsSubmitting(true);
      await uploadImportedState(importedState);
      saveDraftBuild(importedState);
      setDraftBuildState(importedState);
      posthog.capture('import_completed', {
        action: 'load_to_editor',
        character_id: importedState.characterId,
      });
      router.push('/edit');
    } catch (err) {
      posthog.captureException(err);
      notifyError(err instanceof Error ? err.message : 'Failed to import build.');
    } finally {
      if (shouldUpload) setIsSubmitting(false);
    }
  };

  const saveImportToSaves = async (wm: { username: string; uid: string }) => {
    const importedState = buildImportedState(wm);
    const shouldUpload = uploadToLb;

    try {
      if (shouldUpload) setIsSubmitting(true);
      const characterName = getImportedCharacterName(importedState);

      const now = new Date();
      const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const saved = saveBuild({
        name: `${characterName} Import ${stamp}`,
        state: importedState,
      });

      await uploadImportedState(importedState);
      posthog.capture('import_completed', {
        action: 'save_to_saves',
        character_id: importedState.characterId,
      });
      success(`Saved "${saved.name}".`);
      router.push('/saves');
    } catch (err) {
      posthog.captureException(err);
      notifyError(err instanceof Error ? err.message : 'Failed to save imported build.');
    } finally {
      if (shouldUpload) setIsSubmitting(false);
    }
  };

  const handleImport = (wm: { username: string; uid: string }) => {
    setLastImportWatermark(wm);
    if (draftBuildState?.characterId) {
      setPendingWm(wm); // show confirmation modal
    } else {
      void doImport(wm);
    }
  };

  const submitIssueReport = async (note: string) => {
    try {
      const activeWatermark = getActiveWatermark();
      let fallbackImage: string | undefined;

      if (!trainingImageKey) {
        if (!selectedFile) {
          notifyError('No screenshot is available to attach to this report.');
          return;
        }
        fallbackImage = await encodeImageFileAsJpegBase64(selectedFile);
      }

      setIsSubmittingReport(true);

      const res = await fetch('/api/report-ocr-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          route: '/import',
          reason: reportReason,
          trainingImageKey: trainingImageKey ?? undefined,
          image: fallbackImage,
          progress,
          analysisData,
          importedState: getReportImportedState() ?? undefined,
          validationError,
          ocrError: error,
          lbUploadError,
          uploadToLb,
          watermark: activeWatermark,
          client: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            submittedAt: new Date().toISOString(),
          },
        }),
      });

      const payload = await res.json() as { success?: boolean; reason?: string; trainingImageKey?: string | null };
      if (!res.ok || !payload.success) {
        throw new Error(payload.reason || 'Failed to submit issue report.');
      }

      if (!trainingImageKey && typeof payload.trainingImageKey === 'string' && payload.trainingImageKey) {
        setTrainingImageKey(payload.trainingImageKey);
      }

      posthog.capture('ocr_issue_report_submitted', {
        reason: reportReason,
        has_note: note.trim().length > 0,
        has_training_image_key: Boolean(trainingImageKey || payload.trainingImageKey),
        character_id: getReportImportedState()?.characterId ?? null,
      });
      success('Report submitted. Thanks.');
      setIsReportModalOpen(false);
    } catch (err) {
      posthog.captureException(err);
      notifyError(err instanceof Error ? err.message : 'Failed to submit issue report.');
    } finally {
      setIsSubmittingReport(false);
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
                  disabled={isSubmitting}
                  onChange={e => setUploadToLb(e.target.checked)}
                  className="w-4 h-4 accent-(--color-accent) cursor-pointer"
                />
                <span className="text-sm text-text-primary/70">Upload to Leaderboard</span>
              </label>
              <button
                onClick={handleReset}
                disabled={isSubmitting}
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
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <div>{validationError}</div>
            <button
              type="button"
              onClick={() => openReportModal('validation_error')}
              className="mt-3 text-sm font-medium text-red-200 underline underline-offset-2 transition-colors hover:text-red-100"
            >
              Report this issue
            </button>
          </div>
        )}

        {/* OCR error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <div>{error}</div>
            <button
              type="button"
              onClick={() => openReportModal('ocr_error')}
              className="mt-3 text-sm font-medium text-red-200 underline underline-offset-2 transition-colors hover:text-red-100"
            >
              Report this issue
            </button>
          </div>
        )}

        {/* LB upload error — illegal echo data from OCR misread */}
        {lbUploadError && (
          <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
            <span className="font-medium">Leaderboard upload skipped.</span>{' '}
            {lbUploadError}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => openReportModal('illegal_echo')}
                className="text-sm font-medium text-yellow-200 underline underline-offset-2 transition-colors hover:text-yellow-100"
              >
                Report this issue
              </button>
            </div>
          </div>
        )}

        {step === 'upload' && <ImportUploader onFile={handleFile} />}

        {step === 'results' && (
          <ImportResults
            data={analysisData}
            isProcessing={isProcessing}
            isSubmitting={isSubmitting}
            progress={progress}
            onImport={handleImport}
            onReportIssue={() => openReportModal()}
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
              {gameData.getCharacter(draftBuildState?.characterId ?? null)?.name ?? 'a build'}
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
              onClick={async () => {
                if (!pendingWm) return;
                await saveImportToSaves(pendingWm);
                setPendingWm(null);
              }}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              Save Build
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPendingWm(null)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-text-primary/70 transition-colors hover:border-text-primary/30 hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!pendingWm) return;
                  await doImport(pendingWm);
                  setPendingWm(null);
                }}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-red-500/45 bg-red-500/15 py-2 text-sm font-semibold text-red-300 transition-colors hover:border-red-500/70 hover:bg-red-500/25"
              >
                Override Current
              </button>
            </div>
          </div>
        )}
      />

      <ReportIssueModal
        key={`${isReportModalOpen ? 'open' : 'closed'}-${reportReason}`}
        isOpen={isReportModalOpen}
        reason={reportReason}
        isSubmitting={isSubmittingReport}
        onClose={() => setIsReportModalOpen(false)}
        onSubmit={submitIssueReport}
      />

    </main>
  );
}
