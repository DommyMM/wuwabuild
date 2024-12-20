import { useState, useEffect } from 'react';

let cachedMainStats: MainStatData | null = null;
let loadError: string | null = null;

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
  const [mainStatsData, setMainStatsData] = useState<MainStatData | null>(cachedMainStats);
  const [loading, setLoading] = useState(!cachedMainStats);
  const [error, setError] = useState<string | null>(loadError);

  useEffect(() => {
    if (cachedMainStats) return;

    const fetchData = async () => {
      try {
        const response = await fetch('Data/Mainstat.json');
        if (!response.ok) throw new Error('Failed to fetch main stats');
        const data = await response.json();
        cachedMainStats = data;
        setMainStatsData(data);
      } catch (err) {
        const errorMsg = 'Error loading main stats data';
        loadError = errorMsg;
        setError(errorMsg);
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