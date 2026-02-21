'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui/Modal';
import { Echo, ElementType, ELEMENT_SETS, COST_SECTIONS } from '@/lib/echo';
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

// Cost-based card styling (matches weapon/character rarity pattern)
const COST_BORDER: Record<number, string> = {
  4: 'border-yellow-500/50',
  3: 'border-purple-500/50',
  1: 'border-blue-400/40'
};

const COST_HOVER: Record<number, string> = {
  4: 'hover:border-yellow-500 hover:shadow-[0_0_10px_rgba(234,179,8,0.4)]',
  3: 'hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.4)]',
  1: 'hover:border-blue-400 hover:shadow-[0_0_8px_rgba(96,165,250,0.3)]'
};

const COST_SELECTED: Record<number, string> = {
  4: 'border-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.5)]',
  3: 'border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.5)]',
  1: 'border-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.4)]'
};

const COST_BG: Record<number, string> = {
  4: 'bg-yellow-500/10',
  3: 'bg-purple-500/10',
  1: 'bg-blue-400/8'
};

const COST_DIVIDER: Record<number, string> = {
  4: 'bg-yellow-500/40',
  3: 'bg-purple-500/40',
  1: 'bg-blue-400/30'
};

const COST_TEXT: Record<number, string> = {
  4: 'text-yellow-500',
  3: 'text-purple-400',
  1: 'text-blue-400'
};

const COST_HEADER_BORDER: Record<number, string> = {
  4: 'border-yellow-500',
  3: 'border-purple-500',
  1: 'border-blue-400'
};

const COST_LABELS: Record<number, string> = {
  4: '4-Cost',
  3: '3-Cost',
  1: '1-Cost'
};

// Ordered set types for filter chips
const SET_FILTER_ORDER: ElementType[] = [
  'Glacio', 'Fusion', 'Electro', 'Aero', 'Spectro', 'Havoc',
  'ER', 'Attack', 'Healing',
  'Empyrean', 'Frosty', 'Midnight', 'Radiance', 'Tidebreaking',
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
  const [setFilter, setSetFilter] = useState<Set<string>>(new Set());
  const { echoesByCost, loading, error, getFetterByElement } = useGameData();
  const { t } = useLanguage();

  // Filter echoes by set filter
  const filteredEchoesByCost = useMemo(() => {
    const result: Record<number, Echo[]> = {};

    COST_SECTIONS.forEach(cost => {
      let echoes = echoesByCost[cost] || [];

      if (setFilter.size > 0) {
        echoes = echoes.filter(echo =>
          echo.elements.some(el => setFilter.has(el))
        );
      }

      result[cost] = echoes;
    });

    return result;
  }, [echoesByCost, setFilter]);

  const handleEchoSelect = useCallback((echo: Echo) => {
    onSelect(echo);
    onClose();
    setSetFilter(new Set());
  }, [onSelect, onClose]);

  const handleClose = useCallback(() => {
    onClose();
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
  }, []);

  const hasFilters = setFilter.size > 0;

  const totalFiltered = (filteredEchoesByCost[4]?.length ?? 0) +
    (filteredEchoesByCost[3]?.length ?? 0) +
    (filteredEchoesByCost[1]?.length ?? 0);

  // Render a single echo card — matches weapon/character card pattern
  const renderEchoCard = (echo: Echo) => {
    const isSelected = selectedEchoId === echo.id;

    return (
      <button
        key={echo.id}
        onClick={() => handleEchoSelect(echo)}
        className={`group relative flex flex-col items-center overflow-hidden rounded-lg border-2 transition-all duration-200
          ${COST_BG[echo.cost] ?? ''}
          ${isSelected
            ? COST_SELECTED[echo.cost] ?? 'border-accent'
            : `${COST_BORDER[echo.cost] ?? 'border-border'} ${COST_HOVER[echo.cost] ?? ''}`
          }
        `}
      >
        {/* Image — no padding, fills card width */}
        <div className="relative aspect-square w-full overflow-hidden">
          <img
            src={getEchoPaths(echo)}
            alt={echo.nameI18n ? t(echo.nameI18n) : echo.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        {/* Divider */}
        <div className={`h-0.5 w-full ${COST_DIVIDER[echo.cost] ?? 'bg-border'}`} />

        {/* Name */}
        <span className="max-w-full truncate px-1.5 py-1 text-center text-xs leading-tight text-text-primary/80 group-hover:text-text-primary">
          {echo.nameI18n ? t(echo.nameI18n) : echo.name}
        </span>
      </button>
    );
  };

  // Render a cost column (header pinned, list scrolls independently)
  const renderCostColumn = (cost: number) => {
    const echoes = filteredEchoesByCost[cost] || [];

    return (
      <div key={cost} className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Column header — stays visible */}
        <div className={`shrink-0 border-b-2 pb-1.5 ${COST_HEADER_BORDER[cost]}`}>
          <span className={`text-sm font-semibold ${COST_TEXT[cost]}`}>
            {COST_LABELS[cost]}
          </span>
          <span className="ml-1.5 text-xs text-text-primary/50">
            ({echoes.length})
          </span>
        </div>

        {/* Scrollable echo list — thin scrollbar (Tailwind arbitrary variants) */}
        <div
          className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#444_var(--color-background-secondary)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-background-secondary [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#444]"
        >
          {echoes.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 py-2 sm:grid-cols-4">
              {echoes.map(renderEchoCard)}
            </div>
          ) : (
            <div className="flex items-center justify-center py-6 text-xs text-text-primary/40">
              No echoes
            </div>
          )}
        </div>
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
        {/* Set filter chips */}
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {SET_FILTER_ORDER.map(el => {
            const fetter = getFetterByElement(el);
            return (
              <button
                key={el}
                onClick={() => toggleSetFilter(el)}
                className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  setFilter.has(el)
                    ? SET_CHIP_ACTIVE[el]
                    : 'border-border text-text-primary/50 hover:border-text-primary/30'
                }`}
              >
                <img
                  src={fetter?.icon ?? ''}
                  alt=""
                  className="h-4 w-4 object-contain"
                />
                {fetter ? t(fetter.name) : ELEMENT_SETS[el]}
              </button>
            );
          })}

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
          <div className="min-h-0 flex-1 flex flex-col">
            {totalFiltered === 0 ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-text-primary/60">No echoes found</span>
              </div>
            ) : (
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                {COST_SECTIONS.map(renderCostColumn)}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
