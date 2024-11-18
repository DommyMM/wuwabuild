import { useState, useEffect, useMemo } from 'react';
import { Echo, COST_SECTIONS } from '../types/echo';

interface EchoesData {
  echoesByCost: Record<number, Echo[]>;
  loading: boolean;
  error: string | null;
}

export const useEchoes = (): EchoesData => {
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEchoes = async () => {
      try {
        const response = await fetch('Data/Echoes.json');
        if (!response.ok) throw new Error('Failed to fetch echoes');
        const data = await response.json();
        setEchoes(data);
      } catch (err) {
        setError('Error loading echo data');
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