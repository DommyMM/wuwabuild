'use client';

import { useState, useCallback } from 'react';
import type { AnalysisData } from '@/lib/import/types';
import type { RegionKey } from '@/lib/import/regions';
import { IMPORT_REGIONS } from '@/lib/import/regions';
import { loadImage, cropImageToRegion } from '@/lib/import/cropImage';
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
}

const INITIAL_PROGRESS = Object.fromEntries(
  Object.keys(IMPORT_REGIONS).map(k => [k, 'pending' as RegionStatus])
) as Record<RegionKey, RegionStatus>;

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

    try {
      const img = await loadImage(file);
      const regions = Object.entries(IMPORT_REGIONS) as [RegionKey, typeof IMPORT_REGIONS[RegionKey]][];

      // Crop all regions and fire OCR in parallel
      const tasks = regions.map(async ([key, region]) => {
        const base64 = await cropImageToRegion(img, region);
        const attempt = async () => {
          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-OCR-Region': key,
            },
            body: JSON.stringify({ image: base64 }),
          });
          if (!res.ok) throw new Error(`OCR failed for ${key}: ${res.status}`);
          return res.json();
        };

        try {
          let data: unknown;
          try {
            data = await attempt();
          } catch {
            data = await attempt(); // one automatic retry
          }
          // Backend wraps results in { success, analysis }, unwrap it
          const analysis = (data as Record<string, unknown>)?.analysis ?? data;
          nextProgress = { ...nextProgress, [key]: 'done' };
          nextAnalysisData = { ...nextAnalysisData, [key]: analysis };
          setProgress(nextProgress);
          setAnalysisData(nextAnalysisData);
        } catch {
          nextProgress = { ...nextProgress, [key]: 'error' };
          setProgress(nextProgress);
        }
      });

      await Promise.all(tasks);
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
    };
  }, [reset]);

  return { isProcessing, progress, analysisData, error, processImage, reset };
}
