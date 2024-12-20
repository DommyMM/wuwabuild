import { useState, useEffect } from 'react';

let cachedSubstatsData: SubstatData | null = null;
let loadError: string | null = null;

interface SubstatData {
  [statName: string]: number[];
}

interface PanelSelections {
  [panelId: string]: Set<string>;
}

interface SubstatsHook {
  substatsData: SubstatData | null;
  loading: boolean;
  error: string | null;
  panelSelections: PanelSelections;
  selectStatForPanel: (panelId: string, stat: string, previousStat?: string) => void;
  unselectStatForPanel: (panelId: string, stat: string) => void;
  isStatAvailableForPanel: (panelId: string, stat: string, currentStat?: string) => boolean;
  getAvailableStats: () => string[];
  getStatValues: (stat: string) => number[] | null;
  getLowestValue: (stat: string) => number | null;
}

export const useSubstats = (): SubstatsHook => {
  const [substatsData, setSubstatsData] = useState<SubstatData | null>(cachedSubstatsData);
  const [loading, setLoading] = useState(!cachedSubstatsData);
  const [error, setError] = useState<string | null>(loadError);
  const [panelSelections, setPanelSelections] = useState<PanelSelections>({});

  useEffect(() => {
    if (cachedSubstatsData) return;

    const fetchData = async () => {
      try {
        const response = await fetch('Data/Substats.json');
        if (!response.ok) throw new Error('Failed to fetch substats');
        const data = await response.json();
        cachedSubstatsData = data.subStats;
        setSubstatsData(data.subStats);
      } catch (err) {
        const errorMsg = 'Error loading substats data';
        loadError = errorMsg;
        setError(errorMsg);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectStatForPanel = (panelId: string, stat: string, previousStat?: string) => {
    setPanelSelections(prev => {
      const panelStats = new Set(prev[panelId] || []);
      if (previousStat) panelStats.delete(previousStat);
      panelStats.add(stat);
      return { ...prev, [panelId]: panelStats };
    });
  };

  const unselectStatForPanel = (panelId: string, stat: string) => {
    setPanelSelections(prev => {
      const panelStats = new Set(prev[panelId] || []);
      panelStats.delete(stat);
      return { ...prev, [panelId]: panelStats };
    });
  };

  const isStatAvailableForPanel = (panelId: string, stat: string, currentStat?: string) => {
    const panelStats = panelSelections[panelId];
    if (!panelStats) return true;
    if (currentStat === stat) return true;
    return !panelStats.has(stat);
  };

  const getAvailableStats = () => {
    return substatsData ? Object.keys(substatsData) : [];
  };

  const getStatValues = (stat: string) => {
    return substatsData?.[stat] || null;
  };

  const getLowestValue = (stat: string): number | null => {
    return substatsData?.[stat]?.[0] ?? null;
  };

  return {
    substatsData,
    loading,
    error,
    panelSelections,
    selectStatForPanel,
    unselectStatForPanel,
    isStatAvailableForPanel,
    getAvailableStats,
    getStatValues,
    getLowestValue
  };
};