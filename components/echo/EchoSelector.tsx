'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { Modal } from '@/components/ui';
import { Echo, ElementType, ELEMENT_SETS, COST_SECTIONS } from '@/types/echo';

interface EchoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (echo: Echo) => void;
  selectedEchoId?: string | null;
}

// Element color mapping for badges
const ELEMENT_BADGE_COLORS: Record<string, string> = {
  'Aero': 'bg-aero/80 text-white',
  'Glacio': 'bg-blue-400/80 text-white',
  'Electro': 'bg-purple-400/80 text-white',
  'Fusion': 'bg-orange-400/80 text-white',
  'Havoc': 'bg-pink-400/80 text-white',
  'Spectro': 'bg-spectro/80 text-black',
  'ER': 'bg-green-400/80 text-white',
  'Attack': 'bg-red-400/80 text-white',
  'Healing': 'bg-emerald-400/80 text-white',
  'Empyrean': 'bg-cyan-400/80 text-white',
  'Frosty': 'bg-sky-400/80 text-white',
  'Midnight': 'bg-indigo-400/80 text-white',
  'Radiance': 'bg-yellow-300/80 text-black',
  'Tidebreaking': 'bg-teal-400/80 text-white',
  'Gust': 'bg-lime-400/80 text-black',
  'Windward': 'bg-emerald-300/80 text-black',
  'Flaming': 'bg-rose-500/80 text-white',
  'Dream': 'bg-violet-400/80 text-white',
  'Crown': 'bg-amber-400/80 text-black',
  'Law': 'bg-slate-400/80 text-white',
  'Flamewing': 'bg-orange-500/80 text-white',
  'Thread': 'bg-gray-500/80 text-white',
  'Pact': 'bg-yellow-400/80 text-black',
  'Halo': 'bg-cyan-300/80 text-black',
  'Rite': 'bg-amber-300/80 text-black',
  'Trailblazing': 'bg-red-500/80 text-white',
  'Chromatic': 'bg-pink-300/80 text-black',
  'Sound': 'bg-teal-300/80 text-black'
};

// Cost to border color mapping
const COST_BORDER_COLORS: Record<number, string> = {
  4: 'border-yellow-500',
  3: 'border-purple-500',
  1: 'border-blue-400'
};

export const EchoSelector: React.FC<EchoSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedEchoId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { echoesByCost, loading, error } = useGameData();

  // Get CDN path for echo image
  const getEchoImageUrl = useCallback((echo: Echo): string => {
    return `https://files.wuthery.com/p/GameData/UIResources/Common/Image/IconMonsterHead/${echo.id}.png`;
  }, []);

  // Filter echoes by search query
  const filteredEchoesByCost = useMemo(() => {
    const result: Record<number, Echo[]> = {};
    const query = searchQuery.toLowerCase().trim();

    COST_SECTIONS.forEach(cost => {
      const echoes = echoesByCost[cost] || [];
      if (query) {
        result[cost] = echoes.filter(echo =>
          echo.name.toLowerCase().includes(query) ||
          echo.elements.some(el =>
            el.toLowerCase().includes(query) ||
            ELEMENT_SETS[el as ElementType]?.toLowerCase().includes(query)
          )
        );
      } else {
        result[cost] = echoes;
      }
    });

    return result;
  }, [echoesByCost, searchQuery]);

  const handleEchoSelect = useCallback((echo: Echo) => {
    onSelect(echo);
    onClose();
    setSearchQuery('');
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setSearchQuery('');
  }, [onClose]);

  // Render a single echo card
  const renderEchoCard = (echo: Echo) => {
    const isSelected = selectedEchoId === echo.id;
    const hasMultipleElements = echo.elements.length > 1;

    return (
      <button
        key={echo.id}
        onClick={() => handleEchoSelect(echo)}
        className={`group relative flex flex-col items-center gap-1 rounded-lg border-2 bg-background-secondary p-2 transition-all hover:scale-105 hover:border-accent ${
          COST_BORDER_COLORS[echo.cost]
        } ${isSelected ? 'ring-2 ring-accent' : ''}`}
      >
        {/* Echo Image */}
        <div className="relative h-14 w-14 overflow-hidden rounded-lg">
          <img
            src={getEchoImageUrl(echo)}
            alt={echo.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
          />
        </div>

        {/* Echo Name */}
        <span className="text-center text-xs text-text-primary leading-tight line-clamp-2 min-h-[2rem]">
          {echo.name}
        </span>

        {/* Element Badges for multi-element echoes */}
        {hasMultipleElements && (
          <div className="absolute -top-1 -right-1 flex flex-col gap-0.5">
            {echo.elements.slice(0, 3).map((element) => (
              <span
                key={element}
                className={`px-1 py-0.5 text-[8px] font-medium rounded ${
                  ELEMENT_BADGE_COLORS[element] || 'bg-gray-400 text-white'
                }`}
                title={ELEMENT_SETS[element as ElementType]}
              >
                {element.slice(0, 3)}
              </span>
            ))}
          </div>
        )}
      </button>
    );
  };

  // Render a cost section
  const renderCostSection = (cost: number) => {
    const echoes = filteredEchoesByCost[cost] || [];
    if (echoes.length === 0) return null;

    const costLabels: Record<number, string> = {
      4: '4-Cost Echoes',
      3: '3-Cost Echoes',
      1: '1-Cost Echoes'
    };

    return (
      <div key={cost} className="mb-6">
        <h3 className={`mb-3 text-sm font-semibold border-b-2 pb-1 ${
          COST_BORDER_COLORS[cost]
        } text-text-primary`}>
          {costLabels[cost]} ({echoes.length})
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {echoes.map(renderEchoCard)}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Echo"
      contentClassName="w-[900px] max-w-[95vw] max-h-[85vh]"
    >
      {/* Search Input */}
      <div className="sticky top-0 z-10 -mt-4 -mx-4 px-4 py-3 bg-background-secondary border-b border-border mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search echoes by name or set..."
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-primary placeholder:text-text-primary/50 focus:border-accent focus:outline-none"
          autoFocus
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <span className="text-text-primary/60">Loading echoes...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-center py-8">
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-y-auto">
          {COST_SECTIONS.map(renderCostSection)}

          {/* No results message */}
          {searchQuery &&
           filteredEchoesByCost[4]?.length === 0 &&
           filteredEchoesByCost[3]?.length === 0 &&
           filteredEchoesByCost[1]?.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <span className="text-text-primary/60">No echoes found matching &quot;{searchQuery}&quot;</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default EchoSelector;
