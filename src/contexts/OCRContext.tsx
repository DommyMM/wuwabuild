import React, { createContext, useContext, useState } from 'react';
import type { 
  OCRResponse, 
  OCRContextType
} from '../types/ocr';
import { 
  isCharacterAnalysis, 
  isWeaponAnalysis,
  validateLevel,
  validateRank 
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
  
  const setValidatedOCRResult = (result: OCRResponse) => {
    if (!result.success || !result.analysis) {
      setOCRResult(result);
      return;
    }

    if (isCharacterAnalysis(result.analysis)) {
      const validatedLevel = validateLevel(result.analysis.level);
      setOCRResult({
        ...result,
        analysis: {
          ...result.analysis,
          level: validatedLevel
        }
      });
    } 
    else if (isWeaponAnalysis(result.analysis)) {
      const validatedLevel = validateLevel(result.analysis.level);
      const validatedRank = validateRank(result.analysis.rank);
      setOCRResult({
        ...result,
        analysis: {
          ...result.analysis,
          level: validatedLevel,
          rank: validatedRank
        }
      });
    }
    else {
      setOCRResult(result);
    }
  };

  const clearOCRResult = () => setOCRResult(null);

  return (
    <OCRContext.Provider value={{ 
      ocrResult, 
      setOCRResult: setValidatedOCRResult, 
      clearOCRResult 
    }}>
      {children}
    </OCRContext.Provider>
  );
};