'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGameData } from '@/contexts/GameDataContext';
import { useToast } from '@/contexts/ToastContext';
import { useOcrImport } from '@/hooks/useOcrImport';
import { loadImage } from '@/lib/import/imageFile';
import { convertAnalysisToSavedState } from '@/lib/import/convert';
import { linkBuildImage, submitBuild } from '@/lib/lb';
import { MAX_OCR_IMAGE_BYTES } from '@/lib/ingestIdentity';
import { isDraftBuildEdited, loadDraftBuild, saveBuild, saveDraftBuild, snapshotBuildToSaves } from '@/lib/storage';
import { OCR_HEALTH_URL, OCR_REPORT_URL } from '@/lib/apiEndpoints';
import { ImportUploader } from './ImportUploader';
import { ImportResults } from './ImportResults';
import { ImportComplete, type ImportDestination } from './ImportComplete';
import { ReportIssueModal } from './ReportIssueModal';
import type { AnalysisData } from '@/lib/import/types';
import type { SavedState } from '@/lib/build';
import { getDefaultReportReason, type OcrIssueReason } from '@/lib/import/report';
import { RotateCcw } from 'lucide-react';
import posthog from 'posthog-js';
import { validateImportedEchoPanels } from '@/lib/import/validateEchoPanels';
import { useResolvedLeaderboardLinkState } from '@/hooks/useResolvedLeaderboardLink';
import { buildOcrIssueReportForm } from '@/lib/import/issueReport';

type ImportStep = 'upload' | 'results';

/** Settled leaderboard outcome of one import, driving the completion panel. */
interface ImportOutcome {
  uploaded: boolean;
  buildId: string | null;
  lbAction: 'created' | 'updated' | null;
  localReason: string | null;
}

const ILLEGAL_ECHO_UPLOAD_MESSAGE =
  'Import saved locally, but leaderboard upload was skipped. OCR may have misread one or more echo stats, such as a duplicate substat or wrong set assignment.';

const formatIllegalEchoUploadError = (detail?: string) => (
  'OCR may have misread one or more echo stats (e.g. a duplicate substat or wrong set assignment). ' +
  `${detail ? `${detail} ` : ''}` +
  'The build was saved locally for manual correction but was not submitted to the leaderboard.'
);

const formatSaveStamp = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

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
  const [importOutcome, setImportOutcome]     = useState<ImportOutcome | null>(null);
  const [completedState, setCompletedState]   = useState<SavedState | null>(null);
  const [savedCopyName, setSavedCopyName]     = useState<string | null>(null);
  const [draftBuildState, setDraftBuildState] = useState<SavedState | null>(() => loadDraftBuild());
  const [selectedFile, setSelectedFile]       = useState<File | null>(null);
  const [sourceImageKey, setSourceImageKey] = useState<string | null>(null);
  const [confirmedTrainingImageKey, setConfirmedTrainingImageKey] = useState<string | null>(null);
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
    setConfirmedTrainingImageKey(null);
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

    let img: HTMLImageElement;
    try {
      img = await loadImage(f);
    } catch {
      const errorMsg = 'The selected file could not be decoded as an image. Try downloading it again.';
      setSelectedFile(null);
      setValidationError(errorMsg);
      notifyError(errorMsg);
      posthog.capture('import_validation_fail', {
        reason: 'decode_failed',
        file_type: f.type || null,
      });
      return;
    }
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
      const optimisticSourceImageKey = summary.sourceImageKey ?? summary.trainingImageKey ?? null;
      setSourceImageKey(optimisticSourceImageKey);
      setConfirmedTrainingImageKey(summary.trainingImageKey ?? null);
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
        has_source_image_key: Boolean(optimisticSourceImageKey),
        has_confirmed_training_image_key: Boolean(summary.trainingImageKey),
        scan_id: summary.scanId,
        r2_result: summary.storage?.result ?? null,
        r2_ms: summary.storage?.elapsedMs ?? null,
        timings: summary.timings ?? null,
      });
      if (optimisticSourceImageKey && !summary.unsupportedLanguage && summary.hasCharacter && summary.hasWeapon) {
        void linkScannedImage(summary.analysisData, optimisticSourceImageKey, summary.scanId);
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
    setConfirmedTrainingImageKey(null);
    setScanId(null);
    setLastImportWatermark(null);
    setImportOutcome(null);
    setCompletedState(null);
    setSavedCopyName(null);
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
  const linkSourceState = completedState ?? importedPreviewState;
  const { link: importedLeaderboardLink, isLoading: isLeaderboardAvailabilityLoading } = useResolvedLeaderboardLinkState({
    characterId: linkSourceState?.characterId,
    weaponId: linkSourceState?.weaponId,
    sequence: linkSourceState?.sequence,
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

  const uploadImportedState = async (importedState: SavedState): Promise<ImportOutcome> => {
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
    const skipped = (localReason: string): ImportOutcome => ({
      uploaded: false,
      buildId: null,
      lbAction: null,
      localReason,
    });

    if (!uploadToLb) {
      captureSubmitResult('skipped', 'upload_disabled');
      return skipped('Leaderboard upload was turned off.');
    }

    if (lbUploadError) {
      warning(ILLEGAL_ECHO_UPLOAD_MESSAGE, 12000);
      captureSubmitResult('skipped', 'client_echo_preflight');
      return skipped('Leaderboard upload was skipped, check the notice above.');
    }

    if (!importedState.characterId || !importedState.weaponId) {
      warning('Leaderboard skipped: character or weapon was not recognized.');
      captureSubmitResult('skipped', 'missing_character_or_weapon');
      return skipped('Character or weapon was not recognized, so the leaderboard was skipped.');
    }

    if (!importedState.watermark.uid.trim()) {
      warning('Leaderboard skipped: UID is required.');
      captureSubmitResult('skipped', 'uid_missing');
      return skipped('A UID is required for the leaderboard, so the upload was skipped.');
    }

    try {
      const result = await submitBuild(importedState, { sourceImageKey, scanId });
      const lbAction = result.action === 'created' ? 'created' : 'updated';

      captureSubmitResult(lbAction, 'success', result.damageComputed);
      if (!result.damageComputed) {
        info('Saved without fresh damage data for this character.');
      }
      return { uploaded: true, buildId: result.id || null, lbAction, localReason: null };
    } catch (err) {
      posthog.captureException(err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('illegal echo')) {
        setLbUploadError(formatIllegalEchoUploadError());
        warning(ILLEGAL_ECHO_UPLOAD_MESSAGE, 12000);
        captureSubmitResult('error', 'illegal_echo');
        return skipped('Leaderboard upload was skipped, check the notice above.');
      }
      notifyError(msg ? `Leaderboard upload failed: ${msg}` : 'Leaderboard upload failed.');
      captureSubmitResult('error', 'submit_failed');
      return skipped('Leaderboard upload failed.');
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

  // Import = upload immediately (when enabled), then land on the completion
  // panel. The draft slot is claimed without prompting: a draft carrying
  // manual /edit work is auto-snapshotted into saves first, so nothing is lost.
  const handleImport = async (wm: { username: string; uid: string }) => {
    setLastImportWatermark(wm);

    let importedState: SavedState;
    try {
      importedState = buildImportedState(wm);
    } catch (err) {
      posthog.captureException(err);
      notifyError(err instanceof Error ? err.message : 'Failed to import build.');
      return;
    }

    setIsSubmitting(true);
    try {
      const outcome = await uploadImportedState(importedState);

      try {
        const displacedDraft = loadDraftBuild();
        if (displacedDraft?.characterId && isDraftBuildEdited(displacedDraft)) {
          const displacedName = gameData.getCharacter(displacedDraft.characterId)?.name ?? 'Draft';
          const snapshot = snapshotBuildToSaves(displacedDraft, `${displacedName} Draft ${formatSaveStamp()}`);
          if (snapshot) info(`Your edited ${displacedName} draft was saved to Saves.`);
        }
      } catch {
        // Snapshot is best-effort; never block the import on it.
      }

      saveDraftBuild(importedState);
      setDraftBuildState(importedState);
      setCompletedState(importedState);
      setImportOutcome(outcome);
      setSavedCopyName(null);
      posthog.capture('import_complete', {
        character_id: importedState.characterId,
        uploaded_to_lb: outcome.uploaded,
        lb_action: outcome.lbAction,
        has_source_image_key: Boolean(sourceImageKey),
        scan_id: scanId,
      });
    } catch (err) {
      posthog.captureException(err);
      notifyError(err instanceof Error ? err.message : 'Failed to import build.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const appendBuildId = (href: string, buildId: string | null) => {
    if (!buildId) return href;
    const separator = href.includes('?') ? '&' : '?';
    return `${href}${separator}buildId=${encodeURIComponent(buildId)}`;
  };

  const completedUid = completedState?.watermark.uid.trim() ?? '';
  const completedLeaderboardHref = importedLeaderboardLink
    ? appendBuildId(importedLeaderboardLink.href, importOutcome?.buildId ?? null)
    : null;
  const completedProfileHref = completedUid
    ? appendBuildId(`/profile/${encodeURIComponent(completedUid)}`, importOutcome?.buildId ?? null)
    : null;

  const captureDestinationClick = (destination: ImportDestination | 'import_another' | 'save_copy') => {
    posthog.capture('import_destination_click', {
      destination,
      character_id: completedState?.characterId ?? null,
      uploaded_to_lb: importOutcome?.uploaded ?? false,
    });
  };

  const handleDestinationClick = (destination: ImportDestination) => {
    const href = destination === 'leaderboard'
      ? completedLeaderboardHref
      : destination === 'profile'
        ? completedProfileHref
        : '/edit';
    if (!href) return;
    captureDestinationClick(destination);
    router.push(href);
  };

  const handleImportAnother = () => {
    captureDestinationClick('import_another');
    handleReset();
  };

  // Closing the completion dialog returns to the scan results; the upload
  // already happened, so re-importing just updates the same entry.
  const handleDismissComplete = () => {
    setImportOutcome(null);
    setCompletedState(null);
    setSavedCopyName(null);
  };

  const handleSaveCopy = () => {
    if (!completedState) return;
    try {
      const saved = saveBuild({
        name: `${getImportedCharacterName(completedState)} Import ${formatSaveStamp()}`,
        state: completedState,
      });
      setSavedCopyName(saved.name);
      captureDestinationClick('save_copy');
      success(`Saved "${saved.name}".`);
    } catch (err) {
      posthog.captureException(err);
      notifyError(err instanceof Error ? err.message : 'Failed to save imported build.');
    }
  };

  const submitIssueReport = async (note: string) => {
    try {
      const activeWatermark = getActiveWatermark();
      let fallbackImage: File | null = null;

      if (!confirmedTrainingImageKey) {
        if (!selectedFile) {
          notifyError('No screenshot is available to attach to this report.');
          return;
        }
        fallbackImage = selectedFile;
      }

      setIsSubmittingReport(true);

      const reportBody = buildOcrIssueReportForm({
        note,
        route: '/import',
        reason: reportReason,
        scanId: scanId ?? undefined,
        trainingImageKey: confirmedTrainingImageKey ?? undefined,
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
      }, fallbackImage);

      const res = await fetch(OCR_REPORT_URL, {
        method: 'POST',
        body: reportBody,
      });

      const payload = await res.json() as { success?: boolean; reason?: string; trainingImageKey?: string | null };
      if (!res.ok || !payload.success) {
        throw new Error(payload.reason || 'Failed to submit issue report.');
      }

      if (!confirmedTrainingImageKey && typeof payload.trainingImageKey === 'string' && payload.trainingImageKey) {
        setConfirmedTrainingImageKey(payload.trainingImageKey);
        if (!sourceImageKey) setSourceImageKey(payload.trainingImageKey);
      }

      posthog.capture('ocr_issue_report_submit', {
        reason: reportReason,
        has_note: note.trim().length > 0,
        has_training_image_key: Boolean(confirmedTrainingImageKey || payload.trainingImageKey),
        character_id: getReportImportedState()?.characterId ?? null,
        scan_id: scanId,
      });
      success('Reported.');
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
            uploadToLb={uploadToLb}
            progress={progress}
            onImport={(wm) => { void handleImport(wm); }}
            onReportIssue={() => openReportModal()}
          />
        )}

      </div>

      {importOutcome && completedState && (
        <ImportComplete
          isOpen
          onClose={handleDismissComplete}
          characterName={getImportedCharacterName(completedState)}
          uploaded={importOutcome.uploaded}
          lbAction={importOutcome.lbAction}
          localReason={importOutcome.localReason}
          leaderboardHref={completedLeaderboardHref}
          isLeaderboardLinkLoading={isLeaderboardAvailabilityLoading}
          profileHref={completedProfileHref}
          savedCopyName={savedCopyName}
          onNavigate={handleDestinationClick}
          onImportAnother={handleImportAnother}
          onSaveCopy={handleSaveCopy}
        />
      )}

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
