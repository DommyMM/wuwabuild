'use client';

import { useState, useCallback } from 'react';
import type { AnalysisData } from '@/lib/import/types';
import type { RegionKey } from '@/lib/import/regions';
import { IMPORT_REGIONS } from '@/lib/import/regions';
import { unwrapOcrAnalysisPayload } from '@/lib/import/ocrPayload';
import { OCR_POST_URL } from '@/lib/apiEndpoints';
import type { RegionStatus } from '@/lib/import/report';

interface UseOcrImportReturn {
  isProcessing: boolean;
  progress: Record<RegionKey, RegionStatus>;
  analysisData: AnalysisData;
  error: string | null;
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
}

const INITIAL_PROGRESS = Object.fromEntries(
  Object.keys(IMPORT_REGIONS).map(k => [k, 'pending' as RegionStatus])
) as Record<RegionKey, RegionStatus>;

interface FullOcrResponse {
  success?: boolean;
  error?: string;
  analysis?: AnalysisData;
  progress?: Partial<Record<RegionKey, RegionStatus>>;
  timings?: Record<string, unknown>;
  trainingImageKey?: string | null;
}

export function useOcrImport(): UseOcrImportReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress]         = useState<Record<RegionKey, RegionStatus>>(INITIAL_PROGRESS);
  const [analysisData, setAnalysisData] = useState<AnalysisData>({});
  const [error, setError]               = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress(INITIAL_PROGRESS);
    setAnalysisData({});
    setError(null);
  }, []);

  const processImage = useCallback(async (file: File): Promise<OcrProcessSummary> => {
    const startedAt = Date.now();
    reset();
    setIsProcessing(true);
    let nextAnalysisData: AnalysisData = {};
    let nextProgress: Record<RegionKey, RegionStatus> = INITIAL_PROGRESS;
    let timings: Record<string, unknown> | undefined;

    try {
      const formData = new FormData();
      formData.append('image', file, file.name || 'card.jpg');

      const attempt = async () => {
        const res = await fetch(OCR_POST_URL, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error(`OCR failed: ${res.status}`);
        return res.json() as Promise<FullOcrResponse>;
      };

      let data: FullOcrResponse;
      try {
        data = await attempt();
      } catch {
        data = await attempt(); // one automatic retry
      }

      nextAnalysisData = unwrapOcrAnalysisPayload(data, 'OCR') as AnalysisData;
      timings = data.timings;
      nextProgress = Object.fromEntries(
        (Object.keys(IMPORT_REGIONS) as RegionKey[]).map((key) => {
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
      setError(err instanceof Error ? err.message : 'Failed to process image');
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
    };
  }, [reset]);

  return { isProcessing, progress, analysisData, error, processImage, reset };
}
