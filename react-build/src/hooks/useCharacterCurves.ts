import { useState, useEffect, useCallback } from 'react';

export interface CurveStats {
  HP: number;
  ATK: number;
  DEF: number;
}

export interface CharacterCurve {
  CHARACTER_CURVE: {
    [level: string]: CurveStats;
  }
}

export const useCharacterCurves = () => {
  const [curves, setCurves] = useState<CharacterCurve | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCurves = async () => {
      try {
        const response = await fetch('/Data/CharacterCurve.json');
        if (!response.ok) throw new Error('Failed to load character curves');
        const data = await response.json();
        setCurves(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load curves');
      } finally {
        setLoading(false);
      }
    };
    loadCurves();
  }, []);

  const scaleStat = useCallback((
    baseStat: number, 
    level: number, 
    statType: keyof CurveStats
  ): number => {
    if (!curves) return baseStat;
    if (level < 1 || level > 90) return baseStat;
    
    const levelKey = level === 20 || level === 40 || level === 50 || 
                    level === 60 || level === 70 || level === 80 ? 
                    `${level}/${level}` : level.toString();
                    
    const curve = curves.CHARACTER_CURVE[levelKey];
    if (!curve) return baseStat;

    return baseStat * (curve[statType] / 10000);
  }, [curves]);

  return {
    curves,
    loading,
    error,
    scaleStat
  };
};