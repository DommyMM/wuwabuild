'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useOcrImport } from '@/hooks/useOcrImport';
import { encodeImageFileAsBase64, loadImage } from '@/lib/import/imageFile';
import { convertAnalysisToSavedState } from '@/lib/import/convert';
import { linkBuildImage, submitBuild } from '@/lib/lb';
import { MAX_OCR_IMAGE_BYTES } from '@/lib/ingestIdentity';
import { loadDraftBuild, saveBuild, saveDraftBuild } from '@/lib/storage';
import { OCR_HEALTH_URL } from '@/lib/apiEndpoints';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ImportUploader } from './ImportUploader';
import { ImportResults } from './ImportResults';
import { ReportIssueModal } from './ReportIssueModal';
import type { AnalysisData } from '@/lib/import/types';
import type { SavedState } from '@/lib/build';
import { getDefaultReportReason, type OcrIssueReason } from '@/lib/import/report';
import { AlertTriangle, ExternalLink, RotateCcw } from 'lucide-react';
import posthog from 'posthog-js';
import { validateImportedEchoPanels } from '@/lib/import/validateEchoPanels';
import { useResolvedLeaderboardLinkState } from '@/hooks/useResolvedLeaderboardLink';

type ImportStep = 'upload' | 'results';

const ILLEGAL_ECHO_UPLOAD_MESSAGE =
  'Import saved locally, but leaderboard upload was skipped. OCR may have misread one or more echo stats, such as a duplicate substat or wrong set assignment.';

const formatIllegalEchoUploadError = (detail?: string) => (
  'OCR may have misread one or more echo stats (e.g. a duplicate substat or wrong set assignment). ' +
  `${detail ? `${detail} ` : ''}` +
  'The build was saved locally for manual correction but was not submitted to the leaderboard.'
);

export function ImportPageClient() {
  const router = useRouter();
  const gameData = useGameData();
  const { success, error: notifyError, warning, info } = useToast();
  const { isProcessing, progress, analysisData, error, unsupportedLanguage, processImage, reset } = useOcrImport();

  const [step, setStep]                       = useState<ImportStep>('upload');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lbUploadError, setLbUploadError]     = useState<string | null>(null);
  const [uploadToLb, setUploadToLb]           = useState(true);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [pendingWm, setPendingWm]             = useState<{ username: string; uid: string } | null>(null);
  const [draftBuildState, setDraftBuildState] = useState<SavedState | null>(() => loadDraftBuild());
  const [selectedFile, setSelectedFile]       = useState<File | null>(null);
  const [sourceImageKey, setSourceImageKey] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [lastImportWatermark, setLastImportWatermark] = useState<{ username: string; uid: string } | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportReason, setReportReason] = useState<OcrIssueReason>('manual_report');
  const preflightSignatureRef = useRef<string | null>(null);

  // Silent wake-up ping so Railway auto-starts the server if sleeping
  useEffect(() => { fetch(OCR_HEALTH_URL).catch(() => {}); }, []);

  // Passive image linking: hand the LB service the raw scan plus the
  // screenshot's R2 key so it can attach the image to the build row with this
  // exact echo content. Fill-only server-side and independent of whether the
  // user goes on to import or submit.
  const linkScannedImage = async (
    scan: AnalysisData,
    sourceImageKey: string,
    correlationScanId: string | null,
  ) => {
    try {
      const rawState = convertAnalysisToSavedState({
        ...scan,
        watermark: {
          username: scan.watermark?.username ?? '',
          uid: Number(scan.watermark?.uid) || 0,
        },
      }, {
        characters: gameData.characters,
        weapons:    gameData.weapons,
        echoes:     gameData.echoes,
      });
      const result = await linkBuildImage(rawState, sourceImageKey, correlationScanId);
      // Expected misses and already-linked rows are routine, not useful analytics.
      if ((result.linked && result.reason !== 'already_linked') || result.reason === 'ambiguous') {
        posthog.capture('build_image_link', {
          linked: result.linked,
          method: result.method ?? null,
          reason: result.reason ?? null,
          character_id: rawState.characterId ?? null,
          scan_id: correlationScanId,
        });
      }
    } catch {
      // Best-effort only; linking never affects the import flow.
    }
  };

  const handleFile = async (f: File, method: 'drop' | 'browse' | 'paste') => {
    setValidationError(null);
    setLbUploadError(null);
    setSelectedFile(null);
    setSourceImageKey(null);
    setScanId(null);
    setLastImportWatermark(null);
    preflightSignatureRef.current = null;
    if (f.size > MAX_OCR_IMAGE_BYTES) {
      const errorMsg = 'Image exceeds the 5 MiB upload limit.';
      setValidationError(errorMsg);
      setSelectedFile(null);
      notifyError(errorMsg);
      posthog.capture('import_validation_fail', {
        reason: 'file_too_large',
        file_size: f.size,
        max_file_size: MAX_OCR_IMAGE_BYTES,
      });
      return;
    }
    setSelectedFile(f);

    const img = await loadImage(f);
    if (img.naturalWidth !== 1920 || img.naturalHeight !== 1080) {
      const errorMsg = `Image should be 1920×1080, got ${img.naturalWidth}×${img.naturalHeight}. ` +
        `For best results, download the image from Discord instead of screenshotting`;
      setValidationError(errorMsg);
      notifyError('Image must be 1920x1080. Download it from Discord instead of screenshotting.');
      posthog.capture('import_validation_fail', {
        reason: 'bad_dimensions',
        width: img.naturalWidth,
        height: img.naturalHeight,
        file_type: f.type || null,
      });
      return;
    }

    posthog.capture('import_start', {
      method,
      has_existing_draft: Boolean(draftBuildState?.characterId),
    });
    reset();
    setStep('results');
    void processImage(f).then((summary) => {
      const confirmedSourceImageKey = summary.trainingImageKey ?? null;
      setSourceImageKey(confirmedSourceImageKey);
      setScanId(summary.scanId);
      if (summary.failedRegionsCount > 0) {
        warning(`Scan finished with ${summary.failedRegionsCount} unread section(s). Review the build before importing.`);
      }
      if (summary.unsupportedLanguage) {
        warning('Non-English card detected, please re-upload');
        posthog.capture('import_non_english', { character_id: summary.characterId });
      }
      posthog.capture('ocr_complete', {
        duration_ms: summary.durationMs,
        failed_regions_count: summary.failedRegionsCount,
        failed_regions: summary.failedRegions,
        has_character: summary.hasCharacter,
        has_weapon: summary.hasWeapon,
        has_uid: summary.hasUid,
        character_id: summary.characterId,
        unsupported_language: summary.unsupportedLanguage,
        has_source_image_key: Boolean(confirmedSourceImageKey),
        scan_id: summary.scanId,
        r2_result: summary.storage?.result ?? null,
        r2_ms: summary.storage?.elapsedMs ?? null,
        timings: summary.timings ?? null,
      });
      if (confirmedSourceImageKey && !summary.unsupportedLanguage && summary.hasCharacter && summary.hasWeapon) {
        void linkScannedImage(summary.analysisData, confirmedSourceImageKey, summary.scanId);
      }
    }).catch((err) => {
      posthog.captureException(err);
    });
  };

  const handleInvalidFile = (payload: { reason: 'bad_file_type'; fileType: string | null }) => {
    notifyError('Unsupported file type. Use PNG or JPG.');
    posthog.capture('import_validation_fail', {
      reason: payload.reason,
      file_type: payload.fileType,
    });
  };

  const handleReset = () => {
    reset();
    setStep('upload');
    setValidationError(null);
    setLbUploadError(null);
    setSelectedFile(null);
    setSourceImageKey(null);
    setScanId(null);
    setLastImportWatermark(null);
    setPendingWm(null);
    preflightSignatureRef.current = null;
    setIsReportModalOpen(false);
    setReportReason('manual_report');
  };

  const buildImportedState = useCallback((wm: { username: string; uid: string }) => {
    const mergedData: AnalysisData = {
      ...analysisData,
      watermark: { username: wm.username, uid: Number(wm.uid) || 0 },
    };

    return convertAnalysisToSavedState(mergedData, {
      characters: gameData.characters,
      weapons:    gameData.weapons,
      echoes:     gameData.echoes,
    });
  }, [analysisData, gameData.characters, gameData.echoes, gameData.weapons]);

  const getImportedCharacterName = (importedState: SavedState) => (
    gameData.getCharacter(importedState.characterId)?.name ??
    analysisData.character?.name ??
    'Imported Build'
  );

  const getActiveWatermark = useCallback(() => (
    lastImportWatermark ?? {
      username: analysisData.watermark?.username ?? '',
      uid: String(analysisData.watermark?.uid ?? ''),
    }
  ), [analysisData.watermark?.uid, analysisData.watermark?.username, lastImportWatermark]);

  const getReportImportedState = () => {
    const activeWatermark = getActiveWatermark();
    try {
      return buildImportedState(activeWatermark);
    } catch {
      return null;
    }
  };

  const importedPreviewState = getReportImportedState();
  const { link: importedLeaderboardLink, isLoading: isLeaderboardAvailabilityLoading } = useResolvedLeaderboardLinkState({
    characterId: importedPreviewState?.characterId,
    weaponId: importedPreviewState?.weaponId,
    sequence: importedPreviewState?.sequence,
    getWeapon: gameData.getWeapon,
  });

  const openReportModal = (reason: OcrIssueReason = getDefaultReportReason({
    validationError,
    ocrError: error,
    lbUploadError,
  })) => {
    setReportReason(reason);
    setIsReportModalOpen(true);
  };

  const uploadImportedState = async (importedState: SavedState): Promise<string | null> => {
    const captureSubmitResult = (result: 'created' | 'updated' | 'warning' | 'skipped' | 'error', reason: string, damageComputed?: boolean) => {
      posthog.capture('leaderboard_submit_result', {
        result,
        reason,
        damage_computed: damageComputed ?? false,
        character_id: importedState.characterId ?? null,
        has_source_image_key: Boolean(sourceImageKey),
        scan_id: scanId,
      });
    };
    if (!uploadToLb) {
      captureSubmitResult('skipped', 'upload_disabled');
      return null;
    }

    if (lbUploadError) {
      warning(ILLEGAL_ECHO_UPLOAD_MESSAGE, 12000);
      captureSubmitResult('skipped', 'client_echo_preflight');
      return null;
    }

    if (!importedState.characterId || !importedState.weaponId) {
      warning('Leaderboard skipped: character or weapon was not recognized.');
      captureSubmitResult('skipped', 'missing_character_or_weapon');
      return null;
    }

    if (!importedState.watermark.uid.trim()) {
      warning('Leaderboard skipped: UID is required.');
      captureSubmitResult('skipped', 'uid_missing');
      return null;
    }

    try {
      const result = await submitBuild(importedState, { sourceImageKey, scanId });
      const actionLabel = result.action === 'created' ? 'created' : 'updated';

      success(`Leaderboard entry ${actionLabel}.`);
      captureSubmitResult(result.action === 'created' ? 'created' : 'updated', 'success', result.damageComputed);
      if (!result.damageComputed) {
        info('Saved without fresh damage data for this character.');
      }
      return result.id || null;
    } catch (err) {
      posthog.captureException(err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('illegal echo')) {
        setLbUploadError(formatIllegalEchoUploadError());
        warning(ILLEGAL_ECHO_UPLOAD_MESSAGE, 12000);
        captureSubmitResult('error', 'illegal_echo');
      } else {
        notifyError(msg ? `Leaderboard upload failed: ${msg}` : 'Leaderboard upload failed.');
        captureSubmitResult('error', 'submit_failed');
      }
      return null;
    }
  };

  useEffect(() => {
    if (step !== 'results' || isProcessing || !uploadToLb) return;
    if (!analysisData.character && !analysisData.echo1 && !analysisData.echo2 && !analysisData.echo3 && !analysisData.echo4 && !analysisData.echo5) return;

    const signature = JSON.stringify({
      character: analysisData.character ?? null,
      weapon: analysisData.weapon ?? null,
      echoes: [analysisData.echo1, analysisData.echo2, analysisData.echo3, analysisData.echo4, analysisData.echo5],
      watermark: analysisData.watermark ?? null,
    });
    if (preflightSignatureRef.current === signature) return;
    preflightSignatureRef.current = signature;
    let cancelled = false;

    try {
      const importedState = buildImportedState(getActiveWatermark());
      const violations = validateImportedEchoPanels({
        echoPanels: importedState.echoPanels,
        getEcho: gameData.getEcho,
        getMainStatsByCost: gameData.getMainStatsByCost,
        getSubstatValues: gameData.getSubstatValues,
      });
      if (violations.length > 0) {
        const detail = violations[0];
        queueMicrotask(() => {
          if (!cancelled) setLbUploadError(formatIllegalEchoUploadError(detail));
        });
        posthog.capture('leaderboard_submit_result', {
          result: 'skipped',
          reason: 'client_echo_preflight',
          character_id: importedState.characterId ?? null,
          violation_count: violations.length,
          first_violation: detail,
        });
      } else {
        queueMicrotask(() => {
          if (!cancelled) setLbUploadError(null);
        });
      }
    } catch {
      // Incomplete OCR results are handled by the regular import validation path.
    }

    return () => { cancelled = true; };
  }, [
    analysisData,
    buildImportedState,
    gameData.getEcho,
    gameData.getMainStatsByCost,
    gameData.getSubstatValues,
    getActiveWatermark,
    isProcessing,
    step,
    uploadToLb,
  ]);

  const doImport = async (wm: { username: string; uid: string }) => {
    const importedState = buildImportedState(wm);
    const shouldUpload = uploadToLb;

    try {
      if (shouldUpload) setIsSubmitting(true);
      await uploadImportedState(importedState);
      saveDraftBuild(importedState);
      setDraftBuildState(importedState);
      posthog.capture('import_complete', {
        action: 'load_to_editor',
        character_id: importedState.characterId,
        uploaded_to_lb: shouldUpload,
        has_source_image_key: Boolean(sourceImageKey),
        scan_id: scanId,
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
      posthog.capture('import_complete', {
        action: 'save_to_saves',
        character_id: importedState.characterId,
        uploaded_to_lb: shouldUpload,
        has_source_image_key: Boolean(sourceImageKey),
        scan_id: scanId,
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

  const goToImportedDestination = async (wm: { username: string; uid: string }) => {
    const importedState = buildImportedState(wm);
    const shouldUpload = uploadToLb;

    try {
      if (shouldUpload) setIsSubmitting(true);
      const buildId = await uploadImportedState(importedState);
      saveDraftBuild(importedState);
      setDraftBuildState(importedState);
      posthog.capture('import_complete', {
        action: importedLeaderboardLink ? 'go_to_leaderboard' : 'go_to_profile_build',
        character_id: importedState.characterId,
        uploaded_to_lb: shouldUpload,
        has_build_id: Boolean(buildId),
        has_source_image_key: Boolean(sourceImageKey),
        scan_id: scanId,
      });
      if (importedLeaderboardLink) {
        const separator = importedLeaderboardLink.href.includes('?') ? '&' : '?';
        router.push(buildId
          ? `${importedLeaderboardLink.href}${separator}buildId=${encodeURIComponent(buildId)}`
          : importedLeaderboardLink.href);
      } else {
        const profileHref = `/profile/${encodeURIComponent(importedState.watermark.uid)}`;
        router.push(buildId ? `${profileHref}?buildId=${encodeURIComponent(buildId)}` : profileHref);
      }
    } catch (err) {
      posthog.captureException(err);
      notifyError(err instanceof Error ? err.message : 'Failed to open imported build.');
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

      if (!sourceImageKey) {
        if (!selectedFile) {
          notifyError('No screenshot is available to attach to this report.');
          return;
        }
        fallbackImage = await encodeImageFileAsBase64(selectedFile);
      }

      setIsSubmittingReport(true);

      const res = await fetch('/api/report-ocr-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          route: '/import',
          reason: reportReason,
          scanId: scanId ?? undefined,
          trainingImageKey: sourceImageKey ?? undefined,
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

      if (!sourceImageKey && typeof payload.trainingImageKey === 'string' && payload.trainingImageKey) {
        setSourceImageKey(payload.trainingImageKey);
      }

      posthog.capture('ocr_issue_report_submit', {
        reason: reportReason,
        has_note: note.trim().length > 0,
        has_training_image_key: Boolean(sourceImageKey || payload.trainingImageKey),
        character_id: getReportImportedState()?.characterId ?? null,
        scan_id: scanId,
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
              Import a build from wuwa-bot —{' '}
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
                  onChange={e => {
                    setUploadToLb(e.target.checked);
                    preflightSignatureRef.current = null;
                  }}
                  className="w-4 h-4 accent-(--color-accent) cursor-pointer"
                />
                <span className="text-sm text-text-primary/70">Upload to Leaderboard</span>
              </label>
              <button
                onClick={handleReset}
                disabled={isProcessing || isSubmitting}
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
            <div className="flex items-center justify-between">
              {validationError}
              <button
                type="button"
                onClick={() => openReportModal('validation_error')}
                className="text-sm font-medium text-red-200 underline underline-offset-2 transition-colors hover:text-red-100"
              >
                Report this issue
              </button>
            </div>
          </div>
        )}

        {/* Non-English screenshot: import only supports English cards for now */}
        {unsupportedLanguage && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            This screenshot looks like a non-English card. Import only reads English screenshots for now,
            please switch wuwa-bot to the English language and reupload.
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

        {/* LB upload error: illegal echo data from OCR misread */}
        {uploadToLb && lbUploadError && (
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

        {step === 'upload' && <ImportUploader onFile={handleFile} onInvalidFile={handleInvalidFile} />}

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
            loaded. You can overwrite it, save it, or open the imported build after uploading.
          </>
        }
        actions={(
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                if (!pendingWm) return;
                await goToImportedDestination(pendingWm);
                setPendingWm(null);
              }}
              disabled={isSubmitting || isLeaderboardAvailabilityLoading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
            >
              <ExternalLink className="h-4 w-4" />
              {importedLeaderboardLink ? 'Go to Leaderboard' : 'View on Profile'}
            </button>
            <button
              onClick={async () => {
                if (!pendingWm) return;
                await saveImportToSaves(pendingWm);
                setPendingWm(null);
              }}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-text-primary/70 transition-colors hover:border-text-primary/30 hover:text-text-primary"
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
