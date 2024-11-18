import { useState, useEffect } from 'react';
import { Weapon, WeaponType } from '../types/weapon';

export const useWeapons = (weaponType: WeaponType | null) => {
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortWeaponsByRarity = (weapons: Weapon[]) => {
    const rarityOrder = ["5-star", "4-star", "3-star", "2-star", "1-star"];
    return [...weapons].sort((a, b) => 
      rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity)
    );
  };

  useEffect(() => {
    const loadWeapons = async () => {
      if (!weaponType) {
        setWeapons([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/Data/${weaponType}s.json`);
        if (!response.ok) {
          throw new Error(`Failed to load ${weaponType} weapons (${response.status})`);
        }
        const data = await response.json();
        setWeapons(sortWeaponsByRarity(data));
      } catch (err) {
        console.error("Error loading weapons:", err);
        setError(err instanceof Error ? err.message : 'Failed to load weapons');
        setWeapons([]);
      } finally {
        setLoading(false);
      }
    };

    loadWeapons();
  }, [weaponType]);

  return { weapons, loading, error };
};