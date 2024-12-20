import { useState, useEffect, useMemo } from 'react';
import { Echo, COST_SECTIONS } from '../types/echo';

let cachedEchoes: Echo[] | null = null;
let loadError: string | null = null;

interface EchoesData {
  echoesByCost: Record<number, Echo[]>;
  loading: boolean;
  error: string | null;
}

export const useEchoes = (): EchoesData => {
  const [echoes, setEchoes] = useState<Echo[]>(cachedEchoes || []);
  const [loading, setLoading] = useState(!cachedEchoes);
  const [error, setError] = useState<string | null>(loadError);

  useEffect(() => {
    if (cachedEchoes) return;

    const fetchEchoes = async () => {
      try {
        const response = await fetch('Data/Echoes.json');
        if (!response.ok) throw new Error('Failed to fetch echoes');
        const data = await response.json();
        cachedEchoes = data;
        setEchoes(data);
      } catch (err) {
        const errorMsg = 'Error loading echo data';
        loadError = errorMsg;
        setError(errorMsg);
        console.error('Error fetching echoes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEchoes();
  }, []);

  const echoesByCost = useMemo(() => {
    const grouped: Record<number, Echo[]> = {};
    COST_SECTIONS.forEach(cost => {
      grouped[cost] = echoes
        .filter(echo => echo.cost === cost)
        .sort((a, b) => a.name.localeCompare(b.name));
    });
    return grouped;
  }, [echoes]);

  return { echoesByCost, loading, error };
};