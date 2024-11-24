import React, { useState, useRef, useEffect } from 'react';
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

export const Scan: React.FC = () => {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const blobUrlsRef = useRef<string[]>([]);
  const { setOCRResult } = useOCRContext();
  const [currentCharacterType, setCurrentCharacterType] = useState<string | null>(null);
  const { characters } = useCharacters();

  const clearImages = () => {
    blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    blobUrlsRef.current = [];
    setImages([]);
    setErrorMessages([]);
  };

  const getAnalysisDetails = (analysis?: OCRAnalysis): string | undefined => {
    if (!analysis) return undefined;
    switch (analysis.type) {
      case 'Character':
        return `Lv.${analysis.level} ${analysis.name}`;
      case 'Weapon':
        return `${analysis.weaponType}: ${analysis.name}\nLv.${analysis.level} R${analysis.rank}`;
      case 'Sequences':
        return `Sequence ${analysis.sequence}`;
      case 'Forte':
        return 'Forte Tree';
      case 'Echo':
        const level = analysis.raw_texts.level.replace('+', '');
        const capitalizedElement = analysis.element.charAt(0).toUpperCase() + analysis.element.slice(1);
        return `Lv.${level} ${analysis.raw_texts.name}\n${capitalizedElement}`;
      default:
        return undefined;
    }
  };

  const processImage = async (image: ImageData) => {
    try {
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
          setErrorMessages(prev => [...prev,
            `Rover detected\nSelect gender --->`
          ]);
          characterAnalysis.name = 'Rover (F)';
        }
      
        const matchedCharacter = characters.find(
          char => char.name.toLowerCase() === characterAnalysis.name.toLowerCase()
        );
        if (matchedCharacter) {
          setCurrentCharacterType(matchedCharacter.weaponType.replace(/s$/, ''));
        }
      }
      else if (result.analysis?.type === 'Weapon' && currentCharacterType) {
        const weaponAnalysis = result.analysis as WeaponAnalysis;
        const normalizedWeaponType = weaponAnalysis.weaponType.replace(/s$/, '');
        
        if (normalizedWeaponType !== currentCharacterType) {
          setErrorMessages(prev => [...prev, 
            `Weapon type mismatch:\nExpected: ${currentCharacterType}\n Scanned: ${weaponAnalysis.weaponType}`
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
    } catch (error) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? 
          { ...img, error: error instanceof Error ? error.message : 'Unknown error', isLoading: false } : 
          img
      ));
    }
  };

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
    
      for (const image of newImages) {
        await processImage(image);
      }
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