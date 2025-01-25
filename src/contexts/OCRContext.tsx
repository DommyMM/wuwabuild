import React, { createContext, useContext, useState } from 'react';
import type { OCRResponse, OCRContextType } from '../types/ocr';
import { 
  isCharacterAnalysis, 
  isWeaponAnalysis,
  isEchoAnalysis,
  validateCharacterLevel,
  validateWeaponLevel,
  validateRank,
  validateEchoLevel,
  validateEchoElement
} from '../types/ocr';

const OCRContext = createContext<OCRContextType | null>(null);

export const useOCRContext = () => {
  const context = useContext(OCRContext);
  if (!context) {
    throw new Error('useOCRContext must be used within OCRProvider');
  }
  return context;
};

export const OCRProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [ocrResult, setOCRResult] = useState<OCRResponse | null>(null);
  const [isLocked, setIsLocked] = useState(true);
  
  const setValidatedOCRResult = (result: OCRResponse) => {
    if (!result.success || !result.analysis) {
      setOCRResult(result);
      return;
    }

    if (isCharacterAnalysis(result.analysis)) {
      const validatedLevel = validateCharacterLevel(result.analysis.characterLevel);
      setOCRResult({
        ...result,
        analysis: {
          ...result.analysis,
          characterLevel: validatedLevel
        }
      });
    } 
    else if (isWeaponAnalysis(result.analysis)) {
      const validatedLevel = validateWeaponLevel(result.analysis.weaponLevel);
      const validatedRank = validateRank(result.analysis.rank);
      setOCRResult({
        ...result,
        analysis: {
          ...result.analysis,
          weaponLevel: validatedLevel,
          rank: validatedRank
        }
      });
    }
    else if (isEchoAnalysis(result.analysis)) {
      const validatedLevel = validateEchoLevel(result.analysis.echoLevel);
      const validatedElement = validateEchoElement(result.analysis.element);
      setOCRResult({
        ...result,
        analysis: {
          ...result.analysis,
          echoLevel: validatedLevel,
          element: validatedElement
        }
      });
    }
    else {
      setOCRResult(result);
    }
  };

  return (
    <OCRContext.Provider value={{ 
      ocrResult, 
      setOCRResult: setValidatedOCRResult, 
      clearOCRResult: () => setOCRResult(null),
      isLocked,
      unlock: () => setIsLocked(false)
    }}>
      {children}
    </OCRContext.Provider>
  );
};