'use client';

import { useState, useCallback } from 'react';
import type { AnalysisData } from '@/lib/import/types';
import { IMPORT_REGION_KEYS, type RegionKey } from '@/lib/import/regions';
import { unwrapOcrAnalysisPayload } from '@/lib/import/ocrPayload';
import { readOcrStreamResponse, type FullOcrResponse } from '@/lib/import/ocrStream';
import { OCR_POST_URL } from '@/lib/apiEndpoints';
import type { RegionStatus } from '@/lib/import/report';

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
  failedRegions: RegionKey[];
  failedRegionsCount: number;
  hasCharacter: boolean;
  hasWeapon: boolean;
  hasUid: boolean;
  characterId: string | null;
  timings?: Record<string, unknown>;
  trainingImageKey?: string | null;
  unsupportedLanguage: boolean;
}

const INITIAL_PROGRESS = Object.fromEntries(
  IMPORT_REGION_KEYS.map(k => [k, 'pending' as RegionStatus])
) as Record<RegionKey, RegionStatus>;

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
    let trainingImageKey: string | null | undefined;
    let isUnsupportedLanguage = false;

    try {
      const attempt = async () => {
        const formData = new FormData();
        formData.append('image', file, file.name || 'card.jpg');

        const res = await fetch(OCR_POST_URL, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
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
      } catch {
        nextAnalysisData = {};
        nextProgress = INITIAL_PROGRESS;
        setAnalysisData(nextAnalysisData);
        setProgress(nextProgress);
        data = await attempt(); // one automatic retry
      }

      nextAnalysisData = unwrapOcrAnalysisPayload(data, 'OCR') as AnalysisData;
      timings = data.timings;
      trainingImageKey = data.trainingImageKey;
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
    const characterData = nextAnalysisData.character as { id?: string } | undefined;

    return {
      durationMs: Date.now() - startedAt,
      failedRegions,
      failedRegionsCount: failedRegions.length,
      hasCharacter: Boolean(characterData?.id || characterData),
      hasWeapon: Boolean(nextAnalysisData.weapon),
      hasUid: Number.isFinite(uidNumber) && uidNumber > 0,
      characterId: characterData?.id ?? null,
      timings,
      trainingImageKey,
      unsupportedLanguage: isUnsupportedLanguage,
    };
  }, [reset]);

  return { isProcessing, progress, analysisData, error, unsupportedLanguage, processImage, reset };
}
