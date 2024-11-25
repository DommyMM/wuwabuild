import { useRef, useCallback, useEffect } from 'react';
import { OCRResponse, OCRAnalysis } from '../types/ocr';
import { useOCRContext } from '../contexts/OCRContext';
import { OCRData } from '../types/ocr';

interface OCRState {
  processOCR: (result: OCRResponse) => void;
  isProcessing: boolean;
  reset: () => void;
}

export const useOCR = (): OCRState => {
  const { isLocked } = useOCRContext();
  const processingRef = useRef(new Set<OCRAnalysis>());
  const queueRef = useRef<OCRAnalysis[]>([]);

  const dispatchOCREvent = useCallback((type: string, data: OCRAnalysis) => {
    document.dispatchEvent(new CustomEvent(`ocr-${type}`, {
      detail: { data, timestamp: Date.now() }
    }));
  }, []);

  const processAnalysis = useCallback(async (analysis: OCRAnalysis) => {
    processingRef.current.add(analysis);

    try {
      switch (analysis.type) {
        case 'Character':
          dispatchOCREvent('character', analysis);
          break;
        case 'Weapon':
          dispatchOCREvent('weapon', analysis);
          break;
        case 'Echo':
          dispatchOCREvent('echo', analysis);
          break;
      }
      await new Promise(r => setTimeout(r, 20));
    } finally {
      processingRef.current.delete(analysis);
    }
  }, [dispatchOCREvent]);

  const processQueue = useCallback(() => {
    if (!isLocked) {
      const items = [...queueRef.current];
      queueRef.current = [];
      items.forEach(analysis => processAnalysis(analysis));
    }
  }, [isLocked, processAnalysis]);

  const processOCR = useCallback((result: OCRResponse) => {
    if (!result.success || !result.analysis) return;

    if (result.analysis.type === 'Character') {
      processAnalysis(result.analysis);
    } else if (isLocked) {
      queueRef.current.push(result.analysis);
    } else {
      processAnalysis(result.analysis);
    }
  }, [isLocked, processAnalysis]);

  const reset = useCallback(() => {
    queueRef.current = [];
    processingRef.current.clear();
  }, []);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  return {
    processOCR,
    isProcessing: processingRef.current.size > 0,
    reset
  };
};