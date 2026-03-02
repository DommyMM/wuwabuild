'use client';

import { useState, useCallback } from 'react';
import type { AnalysisData } from '@/lib/import/types';
import type { RegionKey } from '@/lib/import/regions';
import { IMPORT_REGIONS } from '@/lib/import/regions';
import { loadImage, cropImageToRegion } from '@/lib/import/cropImage';

type RegionStatus = 'pending' | 'done' | 'error';

interface UseOcrImportReturn {
  isProcessing: boolean;
  progress: Record<RegionKey, RegionStatus>;
  analysisData: AnalysisData;
  error: string | null;
  processImage: (file: File) => Promise<void>;
  reset: () => void;
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

  const processImage = useCallback(async (file: File) => {
    reset();
    setIsProcessing(true);

    try {
      const img = await loadImage(file);
      const regions = Object.entries(IMPORT_REGIONS) as [RegionKey, typeof IMPORT_REGIONS[RegionKey]][];

      // Fire-and-forget training upload if 1920×1080
      if (img.naturalWidth === 1920 && img.naturalHeight === 1080) {
        const fullBase64 = await cropImageToRegion(img, { x1: 0, x2: 1, y1: 0, y2: 1 });
        fetch('/api/upload-training', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: fullBase64 }),
        }).catch(() => {});
      }

      // Crop all regions and fire OCR in parallel
      const tasks = regions.map(async ([key, region]) => {
        try {
          const base64 = await cropImageToRegion(img, region);
          const res = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-OCR-Region': key,
            },
            body: JSON.stringify({ image: base64 }),
          });

          if (!res.ok) throw new Error(`OCR failed for ${key}: ${res.status}`);

          const data = await res.json();
          // Backend wraps results in { success, analysis }, unwrap it
          const analysis = data?.analysis ?? data;
          setProgress(prev => ({ ...prev, [key]: 'done' }));
          setAnalysisData(prev => ({ ...prev, [key]: analysis }));
        } catch {
          setProgress(prev => ({ ...prev, [key]: 'error' }));
        }
      });

      await Promise.all(tasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, [reset]);

  return { isProcessing, progress, analysisData, error, processImage, reset };
}
