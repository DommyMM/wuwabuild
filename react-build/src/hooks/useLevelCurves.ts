import { useState, useEffect } from 'react';

interface LevelCurves {
  ATK_CURVE: { [key: string]: number };
  STAT_CURVE: { [key: string]: number };
}

export const useLevelCurves = () => {
  const [curves, setCurves] = useState<LevelCurves | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadCurves = async () => {
      try {
        setLoading(true);
        const response = await fetch('/Data/LevelCurve.json');
        if (!response.ok) {
          throw new Error('Failed to load level curves');
        }
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

  const getLevelKey = (level: number): string => {
    if (level <= 20) return level === 20 ? "20/20" : "1/20";
    else if (level <= 40) return level === 40 ? "40/40" : "20/40";
    else if (level <= 50) return level === 50 ? "50/50" : "40/50";
    else if (level <= 60) return level === 60 ? "60/60" : "50/60";
    else if (level <= 70) return level === 70 ? "70/70" : "60/70";
    else if (level <= 80) return level === 80 ? "80/80" : "70/80";
    else return level === 90 ? "90/90" : "80/90";
  };

  const scaleAtk = (baseAtk: number, level: number): number => {
    if (!curves) return baseAtk;
    const key = getLevelKey(level);
    return parseFloat((baseAtk * curves.ATK_CURVE[key]).toFixed(1));
  };

  const scaleStat = (baseStat: number, level: number): number => {
    if (!curves) return baseStat;
    const key = getLevelKey(level);
    return parseFloat((baseStat * curves.STAT_CURVE[key]).toFixed(1));
  };

  return { curves, loading, error, scaleAtk, scaleStat };
};