'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { Modal } from '@/components/ui/Modal';
import { Echo, ElementType, ELEMENT_SETS, COST_SECTIONS } from '@/types/echo';
import { getEchoPaths } from '@/lib/paths';

interface EchoSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (echo: Echo) => void;
  selectedEchoId?: string | null;
}

// Active filter chip styling per element/set
const SET_CHIP_ACTIVE: Record<string, string> = {
  'Aero': 'bg-aero/20 border-aero/50 text-aero',
  'Glacio': 'bg-blue-400/20 border-blue-400/50 text-blue-400',
  'Electro': 'bg-purple-400/20 border-purple-400/50 text-purple-400',
  'Fusion': 'bg-orange-400/20 border-orange-400/50 text-orange-400',
  'Havoc': 'bg-pink-400/20 border-pink-400/50 text-pink-400',
  'Spectro': 'bg-spectro/20 border-spectro/50 text-spectro',
  'ER': 'bg-green-400/20 border-green-400/50 text-green-400',
  'Attack': 'bg-red-400/20 border-red-400/50 text-red-400',
  'Healing': 'bg-emerald-400/20 border-emerald-400/50 text-emerald-400',
  'Empyrean': 'bg-cyan-400/20 border-cyan-400/50 text-cyan-400',
  'Frosty': 'bg-sky-400/20 border-sky-400/50 text-sky-400',
  'Midnight': 'bg-indigo-400/20 border-indigo-400/50 text-indigo-400',
  'Radiance': 'bg-yellow-300/20 border-yellow-300/50 text-yellow-300',
  'Tidebreaking': 'bg-teal-400/20 border-teal-400/50 text-teal-400',
  'Gust': 'bg-lime-400/20 border-lime-400/50 text-lime-400',
  'Windward': 'bg-emerald-300/20 border-emerald-300/50 text-emerald-300',
  'Flaming': 'bg-rose-500/20 border-rose-500/50 text-rose-500',
  'Dream': 'bg-violet-400/20 border-violet-400/50 text-violet-400',
  'Crown': 'bg-amber-400/20 border-amber-400/50 text-amber-400',
  'Law': 'bg-slate-400/20 border-slate-400/50 text-slate-400',
  'Flamewing': 'bg-orange-500/20 border-orange-500/50 text-orange-500',
  'Thread': 'bg-gray-500/20 border-gray-500/50 text-gray-400',
  'Pact': 'bg-yellow-400/20 border-yellow-400/50 text-yellow-400',
  'Halo': 'bg-cyan-300/20 border-cyan-300/50 text-cyan-300',
  'Rite': 'bg-amber-300/20 border-amber-300/50 text-amber-300',
  'Trailblazing': 'bg-red-500/20 border-red-500/50 text-red-500',
  'Chromatic': 'bg-pink-300/20 border-pink-300/50 text-pink-300',
  'Sound': 'bg-teal-300/20 border-teal-300/50 text-teal-300'
};

// Cost to border/accent color
const COST_BORDER_COLORS: Record<number, string> = {
  4: 'border-yellow-500',
  3: 'border-purple-500',
  1: 'border-blue-400'
};

const COST_TEXT_COLORS: Record<number, string> = {
  4: 'text-yellow-500',
  3: 'text-purple-400',
  1: 'text-blue-400'
};

const COST_LABELS: Record<number, string> = {
  4: '4-Cost',
  3: '3-Cost',
  1: '1-Cost'
};

// Ordered set types for filter chips
const SET_FILTER_ORDER: ElementType[] = [
  // Elemental
  'Glacio', 'Fusion', 'Electro', 'Aero', 'Spectro', 'Havoc',
  // Utility
  'ER', 'Attack', 'Healing',
  // Enhanced
  'Empyrean', 'Frosty', 'Midnight', 'Radiance', 'Tidebreaking',
  // Newer
  'Gust', 'Windward', 'Flaming', 'Dream', 'Crown', 'Law',
  'Flamewing', 'Thread', 'Pact', 'Halo', 'Rite',
  'Trailblazing', 'Chromatic', 'Sound'
];

export const EchoSelector: React.FC<EchoSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedEchoId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [setFilter, setSetFilter] = useState<Set<string>>(new Set());
  const { echoesByCost, loading, error } = useGameData();

  // Filter echoes by search query + set filter
  const filteredEchoesByCost = useMemo(() => {
    const result: Record<number, Echo[]> = {};
    const query = searchQuery.toLowerCase().trim();

    COST_SECTIONS.forEach(cost => {
      let echoes = echoesByCost[cost] || [];

      // Apply set filter
      if (setFilter.size > 0) {
        echoes = echoes.filter(echo =>
          echo.elements.some(el => setFilter.has(el))
        );
      }

      // Apply search filter
      if (query) {
        echoes = echoes.filter(echo =>
          echo.name.toLowerCase().includes(query) ||
          echo.elements.some(el =>
            el.toLowerCase().includes(query) ||
            ELEMENT_SETS[el as ElementType]?.toLowerCase().includes(query)
          )
        );
      }

      result[cost] = echoes;
    });

    return result;
  }, [echoesByCost, searchQuery, setFilter]);

  const handleEchoSelect = useCallback((echo: Echo) => {
    onSelect(echo);
    onClose();
    setSearchQuery('');
    setSetFilter(new Set());
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    onClose();
    setSearchQuery('');
    setSetFilter(new Set());
  }, [onClose]);

  const toggleSetFilter = useCallback((el: string) => {
    setSetFilter(prev => {
      const next = new Set(prev);
      next.has(el) ? next.delete(el) : next.add(el);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSetFilter(new Set());
    setSearchQuery('');
  }, []);

  const hasFilters = setFilter.size > 0 || searchQuery.length > 0;

  const totalFiltered = (filteredEchoesByCost[4]?.length ?? 0) +
    (filteredEchoesByCost[3]?.length ?? 0) +
    (filteredEchoesByCost[1]?.length ?? 0);

  // Render a single echo card
  const renderEchoCard = (echo: Echo) => {
    const isSelected = selectedEchoId === echo.id;

    return (
      <button
        key={echo.id}
        onClick={() => handleEchoSelect(echo)}
        className={`group flex flex-col items-center gap-1 rounded-lg border-2 bg-background p-1.5 transition-all hover:scale-105 hover:border-accent ${
          COST_BORDER_COLORS[echo.cost]
        } ${isSelected ? 'ring-2 ring-accent' : ''}`}
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
          <img
            src={getEchoPaths(echo)}
            alt={echo.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
            loading="lazy"
          />
        </div>

        <span className="w-full truncate text-center text-[10px] leading-tight text-text-primary">
          {echo.name}
        </span>
      </button>
    );
  };

  // Render a cost column
  const renderCostColumn = (cost: number) => {
    const echoes = filteredEchoesByCost[cost] || [];

    return (
      <div key={cost} className="flex min-w-0 flex-1 flex-col">
        {/* Column header */}
        <div className={`mb-2 border-b-2 pb-1.5 ${COST_BORDER_COLORS[cost]}`}>
          <span className={`text-sm font-semibold ${COST_TEXT_COLORS[cost]}`}>
            {COST_LABELS[cost]}
          </span>
          <span className="ml-1.5 text-xs text-text-primary/50">
            ({echoes.length})
          </span>
        </div>

        {/* Echo grid */}
        {echoes.length > 0 ? (
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {echoes.map(renderEchoCard)}
          </div>
        ) : (
          <div className="flex items-center justify-center py-6 text-xs text-text-primary/40">
            No echoes
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Select Echo"
      contentClassName="w-full mx-4 lg:mx-16 max-h-[90vh]"
    >
      <div className="flex h-full flex-col gap-3">
        {/* Search + Filters (pinned) */}
        <div className="flex shrink-0 flex-col gap-2">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search echoes by name or set..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-primary placeholder:text-text-primary/50 focus:border-accent focus:outline-none"
            autoFocus
          />

          {/* Set filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {SET_FILTER_ORDER.map(el => (
              <button
                key={el}
                onClick={() => toggleSetFilter(el)}
                className={`rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                  setFilter.has(el)
                    ? SET_CHIP_ACTIVE[el]
                    : 'border-border text-text-primary/50 hover:border-text-primary/30'
                }`}
              >
                {ELEMENT_SETS[el]}
              </button>
            ))}

            {hasFilters && (
              <>
                <span className="mx-1 h-4 w-px bg-border" />
                <button
                  onClick={clearFilters}
                  className="rounded-md px-2 py-0.5 text-xs text-text-primary/40 hover:text-text-primary"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            {totalFiltered === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-text-primary/60">
                  No echoes found{searchQuery ? ` matching "${searchQuery}"` : ''}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 overflow-hidden md:grid-cols-3">
                {COST_SECTIONS.map(renderCostColumn)}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default EchoSelector;
