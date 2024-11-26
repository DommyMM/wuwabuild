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

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(new Error('File reading failed: ' + error));
    reader.readAsDataURL(file);
  });
};

const getAnalysisDetails = (analysis?: OCRAnalysis): string | undefined => {
  if (!analysis) return undefined;
  
  switch (analysis.type) {
    case 'Character':
      return `Lv.${analysis.characterLevel} ${analysis.name}`;
    case 'Weapon':
      return `${analysis.weaponType}: ${analysis.name}\nLv.${analysis.weaponLevel} R${analysis.rank}`;
    case 'Sequences':
      return `Sequence ${analysis.sequence}`;
    case 'Forte':
      return 'Forte Tree';
    case 'Echo':
      const subStats = analysis.subs.map(sub => `${sub.name}: ${sub.value}`).join(', ');
      return `Lv.${analysis.echoLevel} ${analysis.name}\n${
        analysis.element.charAt(0).toUpperCase() + analysis.element.slice(1)} | ${analysis.main.name}: ${analysis.main.value}\n${
        subStats}`;
    default:
      return undefined;
  }
};

export const Scan: React.FC<ScanProps> = ({ onOCRComplete, currentCharacterType }) => {
  const { setOCRResult, isLocked } = useOCRContext();
  const [images, setImages] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const blobUrlsRef = useRef<string[]>([]);
  const { characters } = useCharacters();
  const processingQueueRef = useRef<ImageData[]>([]);
  const [hasQueueMessage, setHasQueueMessage] = useState(false);

  const clearImages = () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setImages([]);
    setErrorMessages([]);
    setHasQueueMessage(false);
  };

  const processImage = async (image: ImageData) => {
    try {
      setErrorMessages([]);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch('http://localhost:5000/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: await fileToBase64(image.file) }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const result: OCRResponse = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'OCR processing failed');
      }

      if (result.analysis?.type === 'Character') {
        const characterAnalysis = result.analysis as CharacterAnalysis;
        
        if (characterAnalysis.name === 'Rover') {
          setErrorMessages(['Rover detected\nSelect gender --->']);
          setTimeout(() => {
            setErrorMessages([]);
          }, 5000);
          characterAnalysis.name = 'Rover (F)';
        }
        const matchedCharacter = characters.find(
          char => char.name.toLowerCase() === characterAnalysis.name.toLowerCase()
        );
        if (!matchedCharacter) {
          setErrorMessages(['Character not found']);
          return;
        }
      }
      else if (isLocked) {
        processingQueueRef.current.push(image);
        setHasQueueMessage(true);
        setErrorMessages(['Select character first']);
        return;
      }
      else if (result.analysis?.type === 'Weapon' && currentCharacterType) {
        const weaponAnalysis = result.analysis as WeaponAnalysis;
        const normalizedWeaponType = weaponAnalysis.weaponType.replace(/s$/, '');
        
        if (normalizedWeaponType !== currentCharacterType) {
          setErrorMessages([
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
  };

  const processQueue = useCallback(async () => {
    if (!isLocked && processingQueueRef.current.length > 0) {
      const queuedImages = [...processingQueueRef.current];
      processingQueueRef.current = [];
      
      try {
        await Promise.all(queuedImages.map(async (image) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

          const response = await fetch('http://localhost:5000/api/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: await fileToBase64(image.file) }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          const result: OCRResponse = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'OCR processing failed');
          }

          if (result.analysis?.type === 'Weapon' && currentCharacterType) {
            const weaponAnalysis = result.analysis as WeaponAnalysis;
            const normalizedWeaponType = weaponAnalysis.weaponType.replace(/s$/, '');
            
            if (normalizedWeaponType !== currentCharacterType) {
              setErrorMessages(prev => [...prev, 
                `Weapon type mismatch:\nExpected: ${currentCharacterType}\nScanned: ${weaponAnalysis.weaponType}`
              ]);
            }
          }

          setOCRResult(result);

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
        }));
      } catch (error) {
        setImages(prev => prev.map(img => ({
          ...img,
          error: error instanceof Error ? error.message : 'Unknown error',
          isLoading: false
        })));
      }
    }
  }, [isLocked, currentCharacterType, setOCRResult, setErrorMessages]);

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

  const handleFiles = async (files: File[]) => {
    if (images.length + files.length > MAX_IMAGES) {
      alert(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    setErrorMessages([]);
    setIsProcessing(true);

    try {
      const newImages: ImageData[] = [];
      const newBlobUrls: string[] = [];
    
      for (const file of files) {
        const blobUrl = URL.createObjectURL(file);
        newBlobUrls.push(blobUrl);
        const imageData: ImageData = {
          id: Math.random().toString(36).substring(2),
          file,
          preview: blobUrl,
          isLoading: true
        };
        newImages.push(imageData);
      }
    
      blobUrlsRef.current = [...blobUrlsRef.current, ...newBlobUrls];
      setImages(prev => [...prev, ...newImages]);
    
      await Promise.all(newImages.map(processImage));
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="scan-component">
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
          />
        ))}
      </div>
    </div>
  );
};