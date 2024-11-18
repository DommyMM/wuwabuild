import { useState, useEffect } from 'react';

interface MainStatData {
  [key: string]: {
    default: [string, number, number],
    mainStats: {
      [statName: string]: [number, number]
    }
  }
}

interface MainStatsHook {
  mainStatsData: MainStatData | null;
  loading: boolean;
  error: string | null;
  calculateValue: (min: number, max: number, level: number) => number;
  getMainStatsByCost: (cost: number | null) => { [statName: string]: [number, number] };
  getAllMainStats: () => { [statName: string]: [number, number] };
}

export const useMain = (): MainStatsHook => {
  const [mainStatsData, setMainStatsData] = useState<MainStatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('Data/Mainstat.json');
        if (!response.ok) throw new Error('Failed to fetch main stats');
        const data = await response.json();
        setMainStatsData(data);
      } catch (err) {
        setError('Error loading main stats data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const calculateValue = (min: number, max: number, level: number): number => {
    return min + ((max - min) * level / 25);
  };

  const getMainStatsByCost = (cost: number | null) => {
    if (!mainStatsData || !cost) return {};
    return mainStatsData[`${cost}cost`]?.mainStats || {};
  };

  const getAllMainStats = () => {
    if (!mainStatsData) return {};
    return Object.values(mainStatsData).reduce((acc, { mainStats }) => ({
      ...acc,
      ...mainStats
    }), {});
  };

  return { 
    mainStatsData,
    loading,
    error,
    calculateValue,
    getMainStatsByCost,
    getAllMainStats
  };
};