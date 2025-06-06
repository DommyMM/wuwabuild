'use client';

import { useState, useEffect, useCallback } from 'react';
import { Weapon, WeaponType, WeaponState } from '@/types/weapon';

interface UseWeaponsProps {
  weaponType: WeaponType;
  preloadedWeapons?: Weapon[];
}

export const weaponCache = new Map<WeaponType, Weapon[]>();
export const weaponList: Weapon[] = [];

export const getCachedWeapon = (id: string | null): Weapon | null => {
  if (!id) return null;
  return weaponList.find(w => w.id === id) ?? null;
};

export const useWeapons = ({ weaponType, preloadedWeapons }: UseWeaponsProps) => {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processWeapons = useCallback((data: Omit<Weapon, 'type'>[], type: WeaponType): Weapon[] => {
    const processed = data.map(weapon => ({
      ...weapon,
      type: type,
      ATK: Number(weapon.ATK),
      base_main: Number(weapon.base_main),
      passive_stat: weapon.passive_stat ? Number(weapon.passive_stat) : undefined,
      passive_stat2: weapon.passive_stat2 ? Number(weapon.passive_stat2) : undefined,
    }));
    weaponList.push(...processed);
    return processed;
  }, []);

  useEffect(() => {
    if (!weaponType) {
      setWeapons([]);
      setLoading(false);
      return;
    }

    if (weaponCache.has(weaponType)) {
      setWeapons(weaponCache.get(weaponType)!);
      setLoading(false);
      return;
    }

    if (preloadedWeapons) {
      const processed = processWeapons(preloadedWeapons, weaponType);
      setWeapons(processed);
      setLoading(false);
      return;
    }

    const loadWeapons = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/Data/Weapons.json');
        if (!response.ok) throw new Error('Failed to load weapons');
        
        const data = await response.json();
        
        Object.entries(data).forEach(([key, weapons]) => {
          const type = key.slice(0, -1) as WeaponType;
          const processed = processWeapons(weapons as Omit<Weapon, 'type'>[], type);
          weaponCache.set(type, processed);
        });
        setWeapons(weaponCache.get(weaponType)!);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load weapons');
        setWeapons([]);
      } finally {
        setLoading(false);
      }
    };

    loadWeapons();
  }, [weaponType, preloadedWeapons, processWeapons]);

  const getWeaponState = (weapon: Weapon): WeaponState => ({
    id: weapon.id,
    level: 1,
    rank: 1
  });

  const getCachedWeapons = (type: WeaponType) => weaponCache.get(type);

  return {
    weapons,
    loading,
    error,
    getWeaponState,
    getCachedWeapons,
    getCachedWeapon
  };
};