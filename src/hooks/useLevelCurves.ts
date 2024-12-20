import { useState, useEffect } from 'react';
import { Weapon, ScaledWeaponStats, WeaponConfig } from '../types/weapon';

interface LevelCurves {
  ATK_CURVE: { [key: string]: number };
  STAT_CURVE: { [key: string]: number };
}

let cachedCurves: LevelCurves | null = null;
let loadError: string | null = null;

export const useLevelCurves = () => {
  const [curves, setCurves] = useState<LevelCurves | null>(cachedCurves);
  const [loading, setLoading] = useState(!cachedCurves);
  const [error, setError] = useState<string | null>(loadError);
  
  useEffect(() => {
    if (cachedCurves) return;

    const loadCurves = async () => {
      try {
        const response = await fetch('/Data/LevelCurve.json');
        if (!response.ok) {
          throw new Error('Failed to load level curves');
        }
        const data = await response.json();
        cachedCurves = data;
        setCurves(data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load curves';
        loadError = errorMsg;
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    loadCurves();
  }, []);

  const getLevelKey = (level: number): string => {
    if (level <= 20) {
      if (level === 1) return "1/20";
      return level === 20 ? "20/20" : level.toString();
    }
    
    if (level === 40) return "40/40";
    if (level === 50) return "50/50";
    if (level === 60) return "60/60";
    if (level === 70) return "70/70";
    if (level === 80) return "80/80";
    if (level === 90) return "90/90";
    
    if (level > 20 && level < 40) return level.toString();
    if (level > 40 && level < 50) return level.toString();
    if (level > 50 && level < 60) return level.toString();
    if (level > 60 && level < 70) return level.toString();
    if (level > 70 && level < 80) return level.toString();
    if (level > 80 && level < 90) return level.toString();
    return "90/90";
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

  const scaleWeaponStats = (weapon: Weapon, config: WeaponConfig): ScaledWeaponStats => {
    const rankMultiplier = 1 + ((config.rank - 1) * 0.25);
    
    return {
      scaledAtk: scaleAtk(weapon.ATK, config.level),
      scaledMainStat: scaleStat(weapon.base_main, config.level),
      scaledPassive: weapon.passive_stat 
        ? Math.floor(weapon.passive_stat * rankMultiplier) 
        : undefined,
      scaledPassive2: weapon.passive_stat2 
        ? Math.floor(weapon.passive_stat2 * rankMultiplier) 
        : undefined
    };
  };

  return { 
    curves, 
    loading, 
    error, 
    scaleAtk, 
    scaleStat,
    scaleWeaponStats 
  };
};