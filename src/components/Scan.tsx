import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ImagePreview, ImageUploader } from './ImageComponents';
import { useOCRContext } from '../contexts/OCRContext';
import { OCRResponse, OCRAnalysis, CharacterAnalysis, WeaponAnalysis } from '../types/ocr';
import { useCharacters } from '../hooks/useCharacters';
import { performOCR } from './OCR';
import '../styles/Scan.css';

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

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

interface OCRError extends Error {
  status?: number;
  retryAfter?: number;
}

const fetchOCRResult = async (base64: string, retries = 3): Promise<OCRResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}/api/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
      signal: controller.signal
    });

    if (!response.ok) {
      const error = new Error() as OCRError;
      error.status = response.status;
      
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return fetchOCRResult(base64, retries - 1);
        }
        error.message = 'Rate limit exceeded';
      } else {
        error.message = 'OCR request failed';
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

const wakeupServer = async () => {
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
  const { characters } = useCharacters();
  const [showNotice, setShowNotice] = useState(true);

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
            isLoading: false,
            status: 'complete'
          } : 
          img
      ));
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? 
          { 
            ...img, 
            error: error instanceof Error ? error.message : 'Unknown error', 
            isLoading: false,
            status: 'error'
          } : 
          img
      ));
    }
  }, [characters, currentCharacterType, onOCRComplete, setOCRResult]);

  const processQueue = useCallback(async () => {
    if (pendingResultsRef.current.length === 0) return;
    
    const queuedResults = [...pendingResultsRef.current];
    pendingResultsRef.current = [];
    
    await Promise.all(queuedResults.map(result => {
      setImages(prev => prev.map(img => 
        img.id === result.image.id ? { ...img, status: 'processing' } : img
      ));
      return processResult(result);
    }));
  }, [processResult]);

  const processRemoteQueue = async () => {
    if (images.length === 0) return;
    
    setErrorMessages([]);
    setIsProcessing(true);
    try {
      // Get all Echo/Unknown images that are ready
      const remoteImages = images.filter(img => 
        img.base64 && 
        img.status === 'ready' && 
        (!img.category || ['Echo', 'unknown'].includes(img.category))
      );
      
      // Update status to processing
      setImages(prev => prev.map(img => 
        remoteImages.find(ri => ri.id === img.id) 
          ? { ...img, status: 'processing' } 
          : img
      ));
  
      // Process through backend
      const results = await Promise.all(
        remoteImages.map(async img => {
          const result = await fetchOCRResult(img.base64!);
          return { image: img, result };
        })
      );
      
      // Queue or process based on lock
      for (const pendingResult of results) {
        if (isLocked) {
          pendingResultsRef.current.push(pendingResult);
          setImages(prev => prev.map(img => 
            img.id === pendingResult.image.id ? { ...img, status: 'queued' } : img
          ));
        } else {
          await processResult(pendingResult);
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
      await Promise.all(files.map(async file => {
        const error = validateFile(file);
        if (error) {
          setErrorMessages(prev => [...prev, `${file.name}: ${error}`]);
          return;
        }
  
        const base64 = await fileToBase64(file);
        const newImage: ImageData = {
          id: Math.random().toString(36).substring(2),
          file,
          preview: URL.createObjectURL(file),
          base64,
          isLoading: true,
          status: 'uploading'
        };
        blobUrlsRef.current.push(newImage.preview);
        setImages(prev => [...prev, newImage]);
  
        try {
          const localResult = await performOCR({ imageData: base64, characters });
          const response: OCRResponse = {
            success: true,
            analysis: {
              ...localResult,
              type: localResult.type
            } as OCRAnalysis
          };
  
          switch(localResult.type) {
            case 'Character':
              await processResult({ image: newImage, result: response });
              await processQueue();
              break;
  
            case 'Weapon':
            case 'Forte':
            case 'Sequences':
              if (isLocked) {
                pendingResultsRef.current.push({ image: newImage, result: response });
                setImages(prev => prev.map(img => 
                  img.id === newImage.id ? { ...img, status: 'queued' } : img
                ));
              } else {
                await processResult({ image: newImage, result: response });
              }
              break;
  
            default:
              setImages(prev => prev.map(img => 
                img.id === newImage.id ? { 
                  ...img, 
                  status: 'ready',
                  category: localResult.type 
                } : img
              ));
          }
        } catch (error) {
          setImages(prev => prev.map(img =>
            img.id === newImage.id ? {
              ...img,
              error: 'Processing failed',
              status: 'error'
            } : img
          ));
        }
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    wakeupServer();
  }, []);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const deleteImage = useCallback((id: string) => {
    setImages(prev => {
      const newImages = prev.filter(img => img.id !== id);
      if (newImages.length === 0) {
        setShowNotice(true);
      }
      return newImages;
    });
    
    const imageToDelete = images.find(img => img.id === id);
    if (imageToDelete?.preview) {
      URL.revokeObjectURL(imageToDelete.preview);
      blobUrlsRef.current = blobUrlsRef.current.filter(url => url !== imageToDelete.preview);
    }
  }, [images]);

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
        {images.some(img => 
          img.status === 'ready' && 
          ['Echo', 'unknown'].includes(img.category || '')
        ) && (
          <button
            className="process-button"
            onClick={processRemoteQueue}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Process Images'}
          </button>
        )}
        {images.length > 0 && (
          <button 
            className="clear-button"
            onClick={() => {
              blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
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
        {images.map(image => (
          <ImagePreview
            key={image.id}
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