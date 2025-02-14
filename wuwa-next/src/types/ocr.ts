export type OCRData = 
  | { type: 'Character'; name: string; characterLevel: number; uid: string}
  | { type: 'Weapon'; name: string; weaponType: string; weaponLevel: number; rank: number }
  | { type: 'Sequences'; sequence: number }
  | { 
      type: 'Forte'; 
      nodeStates: Record<string, { top: boolean; middle: boolean }>; 
      levels: Record<string, number> 
    }
  | { 
      type: 'Echo'; 
      element: string;
      name: string; 
      echoLevel: number;
      main: {
        name: string; 
        value: string
      };
      subs: Array<{
        name: string;
        value: string
      }> 
    };

export interface BaseAnalysis {
  type: 'Character' | 'Weapon' | 'Sequences' | 'Forte' | 'Echo' | 'unknown';
}

export interface CharacterAnalysis extends BaseAnalysis {
  type: 'Character';
  name: string;
  characterLevel: number;
  element: string;
  uid?: string;
}

export interface WeaponAnalysis extends BaseAnalysis {
  type: 'Weapon';
  name: string;
  weaponType: string;
  weaponLevel: number;
  rank: number;
}

export interface SequenceAnalysis extends BaseAnalysis {
  type: 'Sequences';
  sequence: number;
}

export interface ForteAnalysis extends BaseAnalysis {
  type: 'Forte';
  normal: [number, number, number];
  skill: [number, number, number];
  circuit: [number, number, number];
  liberation: [number, number, number];
  intro: [number, number, number];
}

export interface EchoAnalysis extends BaseAnalysis {
  type: 'Echo';
  element: string;
  name: string;
  echoLevel: number;
  main: {
    name: string;
    value: string;
  };
  subs: Array<{
    name: string;
    value: string;
  }>;
}

export interface UnknownAnalysis extends BaseAnalysis {
  type: 'unknown';
}

export type OCRAnalysis = 
  CharacterAnalysis 
  | WeaponAnalysis 
  | SequenceAnalysis 
  | ForteAnalysis
  | EchoAnalysis
  | UnknownAnalysis;

export interface OCRResponse {
  success: boolean;
  error?: string;
  analysis?: OCRAnalysis;
}

export interface OCRContextType {
  ocrResult: OCRResponse | null;
  setOCRResult: (result: OCRResponse) => void;
  clearOCRResult: () => void;
  isLocked: boolean;
  unlock: () => void;
}

export const validateUID = (uid: string | undefined): string | undefined => {
  if (!uid) return undefined;
  const cleaned = uid.replace(/\D/g, '');
  return /^\d{9}$/.test(cleaned) ? cleaned : undefined;
};

export const validateLevel = (level: string | number | undefined): number => {
  if (!level) return 1;
  const parsed = typeof level === 'string' ? parseInt(level, 10) : level;
  return isNaN(parsed) || parsed < 1 || parsed > 90 ? 1 : parsed;
};

export const validateRank = (rank: string | number | undefined): number => {
  if (!rank) return 1;
  const parsed = typeof rank === 'string' ? parseInt(rank, 10) : rank;
  return isNaN(parsed) || parsed < 1 || parsed > 5 ? 1 : parsed;
};

export const validateSequence = (sequence: number | undefined): number => {
  if (!sequence) return 0;
  const parsed = typeof sequence === 'string' ? parseInt(sequence, 10) : sequence;
  return isNaN(parsed) || parsed < 0 || parsed > 6 ? 0 : parsed;
};

export const validateForteLevel = (level: number | undefined): number => {
  if (!level) return 1;
  return level < 1 || level > 10 ? 1 : level;
};

export const validateForteNode = (state: number | undefined): number => {
  if (state === undefined) return 0;
  return state === 0 || state === 1 ? state : 0;
};

export const validateElement = (element: string | undefined): string => {
  const validElements = ['Havoc', 'Spectro', 'Electro', 'Fusion', 'Glacio', 'Aero'];
  return validElements.includes(element || '') ? element! : 'Unknown';
};

export const validateEchoLevel = (level: string | number | undefined): number => {
  if (!level) return 0;
  const parsed = typeof level === 'string' ? parseInt(level.replace(/^\+/, ''), 10) : level;
  return isNaN(parsed) || parsed < 0 || parsed > 25 ? 0 : parsed;
};

export const validateEchoElement = (element: string | undefined): string => {
  const validElements = ['healing', 'attack', 'electro', 'er', 'fusion', 'glacio', 'havoc', 'aero', 'spectro'];
  return validElements.includes(element?.toLowerCase() || '') ? element! : 'unknown';
};

export const validateEchoStatValue = (value: string): string | null => {
  const isPercent = value.endsWith('%');
  const numStr = isPercent ? value.slice(0, -1) : value;
  const num = parseFloat(numStr);
  
  if (isNaN(num) || num < 0) {
    return null;
  }
  
  return isPercent ? `${num}%` : `${num}`;
};

export const validateCharacterLevel = (level: string | number | undefined): number => {
  if (!level) return 1;
  const parsed = typeof level === 'string' ? parseInt(level, 10) : level;
  return isNaN(parsed) || parsed < 1 || parsed > 90 ? 1 : parsed;
};

export const validateWeaponLevel = validateCharacterLevel;

export const isCharacterAnalysis = (analysis: OCRAnalysis): analysis is CharacterAnalysis => 
  analysis.type === 'Character' &&  typeof analysis.name === 'string' && typeof analysis.element === 'string' &&
  (!analysis.characterLevel || (typeof analysis.characterLevel === 'number' && analysis.characterLevel >= 1 && analysis.characterLevel <= 90)) &&
  (!analysis.uid || /^\d{9}$/.test(analysis.uid));

export const isWeaponAnalysis = (analysis: OCRAnalysis): analysis is WeaponAnalysis =>
  analysis.type === 'Weapon' &&
  typeof analysis.name === 'string' && typeof analysis.weaponType === 'string' &&
  (!analysis.weaponLevel || (typeof analysis.weaponLevel === 'number' && analysis.weaponLevel >= 1 && analysis.weaponLevel <= 90)) &&
  (!analysis.rank || (typeof analysis.rank === 'number' && analysis.rank >= 1 && analysis.rank <= 5));

export const isSequenceAnalysis = (analysis: OCRAnalysis): analysis is SequenceAnalysis =>
  analysis.type === 'Sequences' && 
  (!analysis.sequence || (typeof analysis.sequence === 'number' && analysis.sequence >= 0 && analysis.sequence <= 6));

export const isForteAnalysis = (analysis: OCRAnalysis): analysis is ForteAnalysis => {
  if (analysis.type !== 'Forte') return false;

  const skillBranches = ['normal', 'skill', 'circuit', 'liberation', 'intro'] as const;
  
  return skillBranches.every(branch => {
    const values = analysis[branch];
    return (
      Array.isArray(values) && 
      values.length === 3 &&
      typeof values[0] === 'number' && values[0] >= 1 && values[0] <= 10 &&
      typeof values[1] === 'number' && (values[1] === 0 || values[1] === 1) &&
      typeof values[2] === 'number' && (values[2] === 0 || values[2] === 1)
    );
  });
};

export const isEchoAnalysis = (analysis: OCRAnalysis): analysis is EchoAnalysis => {
  if (analysis.type !== 'Echo') return false;

  const mainValue = validateEchoStatValue(analysis.main?.value);
  const validEchoLevel = typeof analysis.echoLevel === 'number' && analysis.echoLevel >= 0 && analysis.echoLevel <= 25;
  
  return (
    typeof analysis.element === 'string' &&
    typeof analysis.name === 'string' &&
    validEchoLevel &&
    typeof analysis.main?.name === 'string' &&
    mainValue !== null &&
    Array.isArray(analysis.subs) &&
    analysis.subs.every(sub => 
      typeof sub?.name === 'string' &&
      validateEchoStatValue(sub.value) !== null
    )
  );
};

export const isUnknownAnalysis = (analysis: OCRAnalysis): analysis is UnknownAnalysis =>
  analysis.type === 'unknown';