import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImagePreview, ImageUploader } from './ImageComponents';
import { useOCRContext } from '../contexts/OCRContext';
import { OCRResponse, OCRAnalysis, CharacterAnalysis, WeaponAnalysis } from '../types/ocr';
import { useCharacters } from '../hooks/useCharacters';
import '../styles/Scan.css';

interface ImageData {
  id: string;
  file: File;
  preview: string;
  isLoading: boolean;
  error?: string;
  category?: string;
  details?: string;
}

interface ScanProps {
  onOCRComplete: (result: OCRResponse) => void;
  currentCharacterType?: string;
}

const MAX_IMAGES = 10;
const TIMEOUT_MS = 30000;
const MAX_FILE_SIZE = 40 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

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
      return `Lv.${analysis.characterLevel} ${analysis.name}\nUID: ${analysis.uid}`;
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

interface PendingResult {
  image: ImageData;
  result: OCRResponse;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface OCRError extends Error {
  status?: number;
  retryAfter?: number;
}

const fetchOCRResult = async (image: ImageData, retries = 3): Promise<PendingResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: await fileToBase64(image.file) }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error() as OCRError;
      error.status = response.status;
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return fetchOCRResult(image, retries - 1);
        }
        error.message = 'Rate limit exceeded';
      } else {
        error.message = 'OCR request failed';
      }
      throw error;
    }

    const result: OCRResponse = await response.json();
    return { image, result };
  } catch (e) {
    const error = e as OCRError;
    return {
      image,
      result: {
        success: false,
        error: error.message || 'Request failed'
      }
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const Scan: React.FC<ScanProps> = ({ onOCRComplete, currentCharacterType }) => {
  const { setOCRResult, isLocked } = useOCRContext();
  const [images, setImages] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const blobUrlsRef = useRef<string[]>([]);
  const { characters } = useCharacters();
  const [hasQueueMessage, setHasQueueMessage] = useState(false);
  const pendingResultsRef = useRef<PendingResult[]>([]);
  const [showNotice, setShowNotice] = useState(true);

  const clearImages = () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setImages([]);
    setErrorMessages([]);
    setHasQueueMessage(false);
    setShowNotice(true);
  };

  const processResult = useCallback(async ({ image, result }: PendingResult) => {
    try {
      if (!result.success) {
        throw new Error(result.error || 'OCR processing failed');
      }
  
      if (result.analysis?.type === 'Character') {
        const characterAnalysis = result.analysis as CharacterAnalysis;
        const matchedCharacter = characters.find(char => 
          char.name.toLowerCase() === characterAnalysis.name.toLowerCase()
        );
        if (!matchedCharacter) {
          setErrorMessages(['Character not found']);
          return;
        }
      }
      else if (result.analysis?.type === 'Weapon' && currentCharacterType) {
        const weaponAnalysis = result.analysis as WeaponAnalysis;
        const normalizedWeaponType = weaponAnalysis.weaponType.replace(/s$/, '');
        
        if (normalizedWeaponType !== currentCharacterType) {
          setErrorMessages(prev => [...prev, 
            `Weapon mismatch:\nExpected: ${currentCharacterType}\nScanned: ${weaponAnalysis.weaponType}`
          ]);
        }
      }
  
      setOCRResult(result);
      onOCRComplete(result);
  
      setImages(prev => prev.map(img => 
        img.id === image.id ? 
          { 
            ...img, 
            category: result.analysis?.type,
            details: result.analysis ? getAnalysisDetails(result.analysis) : undefined,
            isLoading: false 
          } : 
          img
      ));
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? 
          { ...img, error: error instanceof Error ? error.message : 'Unknown error', isLoading: false } : 
          img
      ));
    }
  }, [characters, currentCharacterType, onOCRComplete, setOCRResult]);

  const processResults = useCallback(async (results: PendingResult[]) => {
    const characterResults = results.filter(r => 
      r.result.success && r.result.analysis?.type === 'Character'
    );
  
    if (characterResults.length === 0 && isLocked) {
      pendingResultsRef.current.push(...results);
      setHasQueueMessage(true);
      setErrorMessages(['Select character first']);
      return;
    }
  
    for (const charResult of characterResults) {
      await processResult(charResult);
    }
  
    await new Promise(resolve => setTimeout(resolve, 100));
  
    const remainingResults = results.filter(r => !characterResults.includes(r));
    if (remainingResults.length > 0) {
      const weaponResults = remainingResults.filter(r => 
        r.result.analysis?.type === 'Weapon'
      );
      const otherResults = remainingResults.filter(r => 
        r.result.analysis?.type !== 'Weapon'
      );
  
      await Promise.all(otherResults.map(processResult));
      for (const weaponResult of weaponResults) {
        await processResult(weaponResult);
      }
    }
  }, [isLocked, processResult]); 
  
  const handleFiles = async (files: File[]) => {
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }
  
    setIsProcessing(true);
    setErrorMessages([]);
    setShowNotice(false);
  
    try {
      const validFiles = files.filter(file => {
        const error = validateFile(file);
        if (error) {
          setErrorMessages(prev => [...prev, `${file.name}: ${error}`]);
          return false;
        }
        return true;
      });
  
      if (validFiles.length === 0) {
        return;
      }
  
      const newImages = validFiles.map(file => {
        const blobUrl = URL.createObjectURL(file);
        blobUrlsRef.current.push(blobUrl);
        return {
          id: Math.random().toString(36).substring(2),
          file,
          preview: blobUrl,
          isLoading: true
        };
      });
  
      setImages(prev => [...prev, ...newImages]);
  
      const results = await Promise.all(
        newImages.map(img => fetchOCRResult(img))
      );
  
      await processResults(results);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const processQueue = useCallback(async () => {
    if (!isLocked && pendingResultsRef.current.length > 0) {
      const queuedResults = [...pendingResultsRef.current];
      pendingResultsRef.current = [];
      
      try {
        await processResults(queuedResults);
      } catch (error) {
        setImages(prev => prev.map(img => ({
          ...img,
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false
        })));
      }
    }
  }, [isLocked, processResults]);

  useEffect(() => {
    if (!isLocked) {
      processQueue();
    }
  }, [isLocked, processQueue]);

  useEffect(() => {
    if (!isLocked && hasQueueMessage) {
      setHasQueueMessage(false);
      setErrorMessages(prev => prev.filter(msg => msg !== 'Select character first'));
    }
  }, [isLocked, hasQueueMessage]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="scan-component">
      {showNotice && (
        <div className="scan-notice">
          ⚠️ Important: Use FULL SCREEN screenshots only
          <span className="scan-notice-detail">
            Cropped or partial screenshots will not be recognized
          </span>
        </div>
      )}
      <div className="scan-controls">
        <ImageUploader 
          onFilesSelected={handleFiles} 
          disabled={isProcessing} 
        />
        {errorMessages.length > 0 && (
          <div className="scan-errors">
            {errorMessages.map((message, index) => (
              <div key={index} className="error-message">
                {message}
              </div>
            ))}
          </div>
        )}
        {images.length > 0 && (
          <button 
            className="clear-button"
            onClick={clearImages}
            disabled={isProcessing}
          >
            Clear Images
          </button>
        )}
      </div>
      {isProcessing && (
        <div className="processing-status">
          Processing images...
        </div>
      )}
      <div className="file-preview">
        {images.map(image => (
          <ImagePreview
            key={image.id}
            src={image.preview}
            category={image.category}
            details={image.details}
            isLoading={image.isLoading}
            error={!!image.error}
            errorMessage={image.error}
          />
        ))}
      </div>
    </div>
  );
};