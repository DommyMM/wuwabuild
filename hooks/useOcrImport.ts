'use client';

import { useState, useCallback } from 'react';
import type { AnalysisData } from '@/lib/import/types';
import { IMPORT_REGION_KEYS, type RegionKey } from '@/lib/import/regions';
import { unwrapOcrAnalysisPayload } from '@/lib/import/ocrPayload';
import { readOcrStreamResponse, type FullOcrResponse } from '@/lib/import/ocrStream';
import { OCR_POST_URL } from '@/lib/apiEndpoints';
import type { RegionStatus } from '@/lib/import/report';
import { canonicalScanIdOrNull, canonicalSourceImageKeyOrNull } from '@/lib/ingestIdentity';

interface UseOcrImportReturn {
  isProcessing: boolean;
  progress: Record<RegionKey, RegionStatus>;
  analysisData: AnalysisData;
  error: string | null;
  unsupportedLanguage: boolean;
  processImage: (file: File) => Promise<OcrProcessSummary>;
  reset: () => void;
}

interface OcrProcessSummary {
  durationMs: number;
  scanId: string | null;
  failedRegions: RegionKey[];
  failedRegionsCount: number;
  hasCharacter: boolean;
  hasWeapon: boolean;
  hasUid: boolean;
  characterId: string | null;
  timings?: Record<string, unknown>;
  trainingImageKey: string | null;
  storage?: FullOcrResponse['storage'];
  unsupportedLanguage: boolean;
  analysisData: AnalysisData;
}

const INITIAL_PROGRESS = Object.fromEntries(
  IMPORT_REGION_KEYS.map(k => [k, 'pending' as RegionStatus])
) as Record<RegionKey, RegionStatus>;

class OcrHttpError extends Error {
  constructor(readonly status: number) {
    super(`OCR failed: ${status}`);
    this.name = 'OcrHttpError';
  }
}

export function useOcrImport(): UseOcrImportReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]         = useState<Record<RegionKey, RegionStatus>>(INITIAL_PROGRESS);
  const [analysisData, setAnalysisData] = useState<AnalysisData>({});
  const [error, setError]               = useState<string | null>(null);
  const [unsupportedLanguage, setUnsupportedLanguage] = useState(false);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(INITIAL_PROGRESS);
    setAnalysisData({});
    setError(null);
    setUnsupportedLanguage(false);
  }, []);

  const processImage = useCallback(async (file: File): Promise<OcrProcessSummary> => {
    const startedAt = Date.now();
    reset();
    setIsProcessing(true);
    let nextAnalysisData: AnalysisData = {};
    let nextProgress: Record<RegionKey, RegionStatus> = INITIAL_PROGRESS;
    let timings: Record<string, unknown> | undefined;
    let trainingImageKey: string | null = null;
    let scanId: string | null = null;
    let storage: FullOcrResponse['storage'];
    let isUnsupportedLanguage = false;

    try {
      const attempt = async () => {
        const formData = new FormData();
        formData.append('image', file, file.name || 'card.jpg');

        const res = await fetch(OCR_POST_URL, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new OcrHttpError(res.status);
        return readOcrStreamResponse(res, {
          onRegion: (event) => {
            const progress = {
              ...nextProgress,
              [event.region]: event.status,
            };
            nextProgress = progress;
            setProgress(progress);

            if (event.status === 'done' && event.analysis !== undefined) {
              const analysis = {
                ...nextAnalysisData,
                [event.region]: event.analysis,
              } as AnalysisData;
              nextAnalysisData = analysis;
              setAnalysisData(analysis);
            }
          },
        });
      };

      let data: FullOcrResponse;
      try {
        data = await attempt();
      } catch (firstError) {
        // Retrying a deterministic client rejection (especially 413/429)
        // only burns another edge attempt. Keep the one retry for network and
        // transient upstream failures.
        if (firstError instanceof OcrHttpError && firstError.status < 500) {
          throw firstError;
        }
        nextAnalysisData = {};
        nextProgress = INITIAL_PROGRESS;
        setAnalysisData(nextAnalysisData);
        setProgress(nextProgress);
        data = await attempt(); // one automatic retry
      }

      nextAnalysisData = unwrapOcrAnalysisPayload(data, 'OCR') as AnalysisData;
      timings = data.timings;
      scanId = canonicalScanIdOrNull(data.scanId);
      if (data.scanId != null && !scanId) {
        console.warn('OCR returned a non-canonical scan ID; ignoring it.');
      }
      storage = data.storage;
      trainingImageKey = canonicalSourceImageKeyOrNull(data.trainingImageKey);
      if (data.trainingImageKey != null && !trainingImageKey) {
        console.warn('OCR returned a non-canonical source image key; ignoring it.');
      }
      isUnsupportedLanguage = Boolean(data.unsupportedLanguage);
      setUnsupportedLanguage(isUnsupportedLanguage);
      nextProgress = Object.fromEntries(
        IMPORT_REGION_KEYS.map((key) => {
          const status = data.progress?.[key] ?? (nextAnalysisData[key] ? 'done' : 'error');
          return [key, status];
        }),
      ) as Record<RegionKey, RegionStatus>;

      setProgress(nextProgress);
      setAnalysisData(nextAnalysisData);

      if (timings) {
        console.info('OCR timings', timings);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to process image';
      nextProgress = Object.fromEntries(
        IMPORT_REGION_KEYS.map((key) => [key, 'error' as RegionStatus]),
      ) as Record<RegionKey, RegionStatus>;
      setProgress(nextProgress);
      setError(message);
      throw new Error(message);
    } finally {
      setIsProcessing(false);
    }

    const failedRegions = (Object.entries(nextProgress) as [RegionKey, RegionStatus][])
      .filter(([, status]) => status === 'error')
      .map(([key]) => key);
    const watermarkData = nextAnalysisData.watermark as { uid?: number | string } | undefined;
    const uidNumber = Number(watermarkData?.uid ?? 0);
    const characterData = nextAnalysisData.character as { id?: string; name?: string } | undefined;
    const weaponData = nextAnalysisData.weapon as { id?: string; name?: string } | undefined;
    const hasCharacter = Boolean(characterData?.id?.trim() || characterData?.name?.trim());
    const hasWeapon = Boolean(weaponData?.id?.trim() || weaponData?.name?.trim());

    return {
      durationMs: Date.now() - startedAt,
      scanId,
      failedRegions,
      failedRegionsCount: failedRegions.length,
      hasCharacter,
      hasWeapon,
      hasUid: Number.isFinite(uidNumber) && uidNumber > 0,
      characterId: characterData?.id ?? null,
      timings,
      trainingImageKey,
      storage,
      unsupportedLanguage: isUnsupportedLanguage,
      analysisData: nextAnalysisData,
    };
  }, [reset]);

  return { isProcessing, progress, analysisData, error, unsupportedLanguage, processImage, reset };
}
