'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ImagePreview, ImageUploader } from './ImageComponents';
import { useOCRContext } from '@/providers';
import type { OCRResponse, OCRAnalysis, CharacterAnalysis, WeaponAnalysis } from '@/types/ocr';
import { cachedCharacters } from '@/hooks/useCharacters';
import { performOCR } from './OCR';
import '@/styles/Scan.css';

interface ImageData {
  id: string;
  file: File;
  preview: string;
  base64?: string;
  isLoading: boolean;
  error?: string;
  category?: string;
  details?: string;
  status: 'uploading' | 'ready' | 'processing' | 'queued' | 'complete' | 'error';
}

interface PendingResult {
  image: ImageData;
  result: OCRResponse;
}

interface ScanProps {
  onOCRComplete: (result: OCRResponse) => void;
  currentCharacterType?: string;
}

const MAX_IMAGES = 10;
const TIMEOUT_MS = 60000;
const MAX_FILE_SIZE = 40 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(new Error('File reading failed: ' + error));
    reader.readAsDataURL(file);
  });
};

const validateFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Invalid file type. Only JPEG and PNG files are allowed.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'File too large. Maximum size is 40MB.';
  }
  return null;
};

const getAnalysisDetails = (analysis?: OCRAnalysis): string | undefined => {
  if (!analysis) return undefined;
  
  switch (analysis.type) {
    case 'Character':
      return analysis.name?.includes('Rover') 
          ? `Lv.${analysis.characterLevel} ${analysis.name} (${analysis.element?.charAt(0).toUpperCase()}${analysis.element?.slice(1)})`
          : `Lv.${analysis.characterLevel} ${analysis.name}`;
    case 'Weapon':
      return `${analysis.weaponType}: ${analysis.name}\nLv.${analysis.weaponLevel} R${analysis.rank}`;
    case 'Sequences':
      return `Sequence ${analysis.sequence}`;
    case 'Forte':
      return 'Forte Tree';
    case 'Echo':
      return `Lv.${analysis.echoLevel} ${analysis.name}\n${analysis.element.charAt(0).toUpperCase() + analysis.element.slice(1)} | ${analysis.main.name}: ${analysis.main.value}`;
    default:
      return undefined;
  }
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface OCRError extends Error {
  status?: number;
  retryAfter?: number;
}
const fetchOCRResult = async (base64: string, type: string): Promise<OCRResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, type: `char-${type.toLowerCase()}` }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error() as OCRError;
      error.status = response.status;
      
      if (response.status === 429) {
        throw error;
      }
      throw error;
    }

    return await response.json();
  } catch (e) {
    const error = e as OCRError;
    return {
      success: false,
      error: error.message || 'Request failed'
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const wakeupServer = async () => {
  try {
    await fetch(`${API_URL}/health`, { 
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
  }
};

export const Scan: React.FC<ScanProps> = ({ onOCRComplete, currentCharacterType }) => {
  const { setOCRResult, isLocked } = useOCRContext();
  const [images, setImages] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const pendingResultsRef = useRef<PendingResult[]>([]);
  const blobUrlsRef = useRef<string[]>([]);
  const [showNotice, setShowNotice] = useState(true);

  const processResult = useCallback(
    async ({ image, result }: PendingResult) => {
      try {
        if (!result.success) {
          throw new Error(result.error || 'OCR processing failed');
        }

        if (result.analysis?.type === 'Character') {
          const characterAnalysis = result.analysis as CharacterAnalysis;
          const matchedCharacter = cachedCharacters?.find(
            (char) => char.name.toLowerCase() === characterAnalysis.name.toLowerCase()
          );
          if (!matchedCharacter) {
            setErrorMessages(['Character not found']);
            return;
          }
        } else if (result.analysis?.type === 'Weapon' && currentCharacterType) {
          const weaponAnalysis = result.analysis as WeaponAnalysis;
          const normalizedWeaponType = weaponAnalysis.weaponType.replace(/s$/, '');

          if (normalizedWeaponType !== currentCharacterType) {
            setErrorMessages((prev) => [
              ...prev,
              `Weapon mismatch\nExpected: ${currentCharacterType}\nScanned: ${weaponAnalysis.weaponType}`
            ]);
          }
        }

        setOCRResult(result);
        onOCRComplete(result);

        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  category: result.analysis?.type,
                  details: result.analysis ? getAnalysisDetails(result.analysis) : undefined,
                  isLoading: false,
                  status: 'complete'
                }
              : img
          )
        );
      } catch (error) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  isLoading: false,
                  status: 'error'
                }
              : img
          )
        );
      }
    },
    [currentCharacterType, onOCRComplete, setOCRResult]
  );

  const processQueue = useCallback(async () => {
    if (!isLocked && pendingResultsRef.current.length > 0) {
      const queuedResults = [...pendingResultsRef.current];
      pendingResultsRef.current = [];
      
      for (const result of queuedResults) {
        await processResult(result);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }, [isLocked, processResult]);

  const processImages = async () => {
    if (images.length === 0) return;
    setErrorMessages([]);
    setIsProcessing(true);
  
    try {
      const readyImages = images.filter(img => 
        img.base64 && img.status === 'ready' && img.category && img.category !== 'unknown'
      );

      setImages(prev => prev.map(i => 
        readyImages.find(e => e.id === i.id) 
            ? { ...i, status: 'processing' } 
            : i
      ));

      const apiResults = await Promise.all(
        readyImages.map(async img => {
            const ocrResult = await performOCR({ imageData: img.base64! });
            if (!ocrResult.image) throw new Error('No cropped image available');
            
            const result = await fetchOCRResult(ocrResult.image, img.category!);
            return { image: img, result };
        })
      );

      const characterResults = apiResults.filter(
        item => item.result.success && item.result.analysis?.type === 'Character'
      );
      const otherResults = apiResults.filter(
        item => !characterResults.includes(item)
      );

      for (const item of characterResults) {
        await processResult(item);
      }

      for (const item of otherResults) {
        if (isLocked) {
          pendingResultsRef.current.push(item);
          setImages(prev => prev.map(i => 
            i.id === item.image.id ? { ...i, status: 'queued' } : i
          ));
        } else {
          await processResult(item);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }
  
    setErrorMessages([]);
    setShowNotice(false);
    setIsProcessing(true);
  
    try {
      const validFiles = files.filter((file) => {
        const err = validateFile(file);
        if (err) {
          setErrorMessages((prev) => [...prev, `${file.name}: ${err}`]);
          return false;
        }
        return true;
      });
      if (validFiles.length === 0) return;
  
      const newImages: ImageData[] = validFiles.map((file) => ({
        id: Math.random().toString(36).substring(2),
        file,
        preview: URL.createObjectURL(file),
        base64: undefined,
        isLoading: true,
        status: 'uploading'
      }));
  
      setImages((prev) => [...prev, ...newImages]);
  
      for (const img of newImages) {
        try {
          const base64 = await fileToBase64(img.file);
          const localType = await performOCR({ imageData: base64 });
          
          setImages((prev) =>
            prev.map((p) =>
              p.id === img.id
                ? {
                    ...p,
                    base64,
                    status: 'ready',
                    category: localType.type !== 'unknown' ? localType.type : undefined
                  }
                : p
            )
          );
        } catch (error) {
          setImages((prev) =>
            prev.map((p) =>
              p.id === img.id
                ? { ...p, error: 'Processing failed', status: 'error' }
                : p
            )
          );
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    if (!isLocked) {
      processQueue();
    }
  }, [isLocked, processQueue]);

  const deleteImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const newImages = prev.filter((img) => img.id !== id);
        if (newImages.length === 0) {
          setShowNotice(true);
        }
        return newImages;
      });

      const imageToDelete = images.find((img) => img.id === id);
      if (imageToDelete?.preview) {
        URL.revokeObjectURL(imageToDelete.preview);
        blobUrlsRef.current = blobUrlsRef.current.filter(
          (url) => url !== imageToDelete.preview
        );
      }
    },
    [images]
  );

  return (
    <div className="scan-component">
      {showNotice && (
        <div className="scan-notice">
          ⚠️ Important: Use FULL SCREEN screenshots only
          <span className="scan-notice-detail">
            OCR scans for specific sections of the screen and will not work with cropped images
          </span>
        </div>
      )}
      <div className="scan-controls">
        <ImageUploader onFilesSelected={handleFiles} disabled={isProcessing} />
        {images.length > 0 && (
          <button
            className="process-button"
            onClick={processImages}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process Images'}
          </button>
        )}
        {images.length > 0 && (
          <button
            className="clear-button"
            onClick={() => {
              blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
              blobUrlsRef.current = [];
              setImages([]);
              setErrorMessages([]);
              setShowNotice(true);
            }}
            disabled={isProcessing}
          >
            Clear Images
          </button>
        )}
      </div>
      {errorMessages.length > 0 && (
        <div className="scan-errors">
          {errorMessages.map((message, index) => (
            <div key={index} className="error-message">
              {message}
            </div>
          ))}
        </div>
      )}
      <div className="file-preview">
        {images.map((image) => (
          <ImagePreview key={image.id}
            src={image.preview}
            category={image.category}
            details={image.details}
            status={image.status}
            error={!!image.error}
            errorMessage={image.error}
            onDelete={() => deleteImage(image.id)}
          />
        ))}
      </div>
    </div>
  );
};
