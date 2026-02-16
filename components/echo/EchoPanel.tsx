'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { EchoSelector } from './EchoSelector';
import { MainStatSelector, SubstatsList } from './StatSelector';
import { Echo, ElementType, ELEMENT_SETS, EchoPanelState } from '@/types/echo';
import { hasPhantomVariant } from '@/lib/constants/echoBonuses';
import { ChevronDown, X, Ghost } from 'lucide-react';
import { getEchoPaths } from '@/lib/paths';

// ============================================================================
// Types
// ============================================================================

interface EchoPanelProps {
  index: number;
  panelState: EchoPanelState;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
}

// Element badge colors
const ELEMENT_BADGE_COLORS: Record<string, string> = {
  'Aero': 'bg-aero/80 text-white border-aero',
  'Glacio': 'bg-blue-400/80 text-white border-blue-400',
  'Electro': 'bg-purple-400/80 text-white border-purple-400',
  'Fusion': 'bg-orange-400/80 text-white border-orange-400',
  'Havoc': 'bg-pink-400/80 text-white border-pink-400',
  'Spectro': 'bg-spectro/80 text-black border-spectro',
  'ER': 'bg-green-400/80 text-white border-green-400',
  'Attack': 'bg-red-400/80 text-white border-red-400',
  'Healing': 'bg-emerald-400/80 text-white border-emerald-400',
  'Empyrean': 'bg-cyan-400/80 text-white border-cyan-400',
  'Frosty': 'bg-sky-400/80 text-white border-sky-400',
  'Midnight': 'bg-indigo-400/80 text-white border-indigo-400',
  'Radiance': 'bg-yellow-300/80 text-black border-yellow-300',
  'Tidebreaking': 'bg-teal-400/80 text-white border-teal-400',
  'Gust': 'bg-lime-400/80 text-black border-lime-400',
  'Windward': 'bg-emerald-300/80 text-black border-emerald-300',
  'Flaming': 'bg-rose-500/80 text-white border-rose-500',
  'Dream': 'bg-violet-400/80 text-white border-violet-400',
  'Crown': 'bg-amber-400/80 text-black border-amber-400',
  'Law': 'bg-slate-400/80 text-white border-slate-400',
  'Flamewing': 'bg-orange-500/80 text-white border-orange-500',
  'Thread': 'bg-gray-500/80 text-white border-gray-500',
  'Pact': 'bg-yellow-400/80 text-black border-yellow-400',
  'Halo': 'bg-cyan-300/80 text-black border-cyan-300',
  'Rite': 'bg-amber-300/80 text-black border-amber-300',
  'Trailblazing': 'bg-red-500/80 text-white border-red-500',
  'Chromatic': 'bg-pink-300/80 text-black border-pink-300',
  'Sound': 'bg-teal-300/80 text-black border-teal-300'
};

// Cost to border/accent color mapping
const COST_COLORS: Record<number, string> = {
  4: 'border-yellow-500/50 hover:border-yellow-500',
  3: 'border-purple-500/50 hover:border-purple-500',
  1: 'border-blue-400/50 hover:border-blue-400'
};

// ============================================================================
// Component
// ============================================================================

export const EchoPanel: React.FC<EchoPanelProps> = ({
  index,
  panelState,
  dragHandleProps,
  className = ''
}) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { getEcho, calculateMainStatValue, getMainStatsByCost } = useGameData();
  const {
    setEchoPanel,
    clearEchoPanel,
    setEchoMainStat,
    setEchoSubStat,
    setEchoElement,
    setEchoLevel,
    setEchoPhantom
  } = useBuild();

  // Get the echo data
  const echo = useMemo(() => {
    return panelState.id ? getEcho(panelState.id) : null;
  }, [panelState.id, getEcho]);

  // Check if this echo has phantom variant
  const canBePhantom = useMemo(() => {
    return echo ? hasPhantomVariant(echo.name) : false;
  }, [echo]);


  // Handle echo selection
  const handleEchoSelect = useCallback((selectedEcho: Echo) => {
    // Set the echo and auto-select first element if multi-element
    const defaultElement = selectedEcho.elements.length > 0 ? selectedEcho.elements[0] as ElementType : null;

    // Get main stats for this cost to auto-select first main stat
    const mainStats = getMainStatsByCost(selectedEcho.cost);
    const mainStatKeys = Object.keys(mainStats);
    const defaultMainStat = mainStatKeys[0] || null;
    const defaultMainStatValue = defaultMainStat
      ? calculateMainStatValue(mainStats[defaultMainStat][0], mainStats[defaultMainStat][1], panelState.level)
      : null;

    setEchoPanel(index, {
      id: selectedEcho.id,
      selectedElement: defaultElement,
      stats: {
        mainStat: { type: defaultMainStat, value: defaultMainStatValue },
        subStats: panelState.stats.subStats
      }
    });
  }, [index, panelState.level, panelState.stats.subStats, getMainStatsByCost, calculateMainStatValue, setEchoPanel]);

  // Handle element selection
  const handleElementChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const element = e.target.value as ElementType;
    setEchoElement(index, element);
  }, [index, setEchoElement]);

  // Handle level change
  const handleLevelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const level = parseInt(e.target.value, 10);
    setEchoLevel(index, level);

    // Recalculate main stat value if a main stat is selected
    if (panelState.stats.mainStat.type && echo) {
      const mainStats = getMainStatsByCost(echo.cost);
      const statMinMax = mainStats[panelState.stats.mainStat.type];
      if (statMinMax) {
        const newValue = calculateMainStatValue(statMinMax[0], statMinMax[1], level);
        setEchoMainStat(index, panelState.stats.mainStat.type, newValue);
      }
    }
  }, [index, echo, panelState.stats.mainStat.type, getMainStatsByCost, calculateMainStatValue, setEchoLevel, setEchoMainStat]);

  // Handle main stat change
  const handleMainStatChange = useCallback((type: string | null, value: number | null) => {
    setEchoMainStat(index, type, value);
  }, [index, setEchoMainStat]);

  // Handle substat change
  const handleSubstatChange = useCallback((subIndex: number, type: string | null, value: number | null) => {
    setEchoSubStat(index, subIndex, type, value);
  }, [index, setEchoSubStat]);

  // Handle phantom toggle
  const handlePhantomToggle = useCallback(() => {
    setEchoPhantom(index, !panelState.phantom);
  }, [index, panelState.phantom, setEchoPhantom]);

  // Handle clear
  const handleClear = useCallback(() => {
    clearEchoPanel(index);
  }, [index, clearEchoPanel]);

  // Get border color based on cost
  const borderColorClass = echo ? COST_COLORS[echo.cost] : 'border-border hover:border-accent';

  return (
    <>
      <div
        className={`flex flex-col rounded-lg border-2 bg-background-secondary transition-colors ${borderColorClass} ${className}`}
      >
        {/* Header with drag handle and clear button */}
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
            {...dragHandleProps}
          >
            <span className="text-xs font-semibold text-text-primary/70">
              Echo {index + 1}
            </span>
            {echo && (
              <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${echo.cost === 4 ? 'bg-yellow-500/20 text-yellow-500' :
                echo.cost === 3 ? 'bg-purple-500/20 text-purple-500' :
                  'bg-blue-400/20 text-blue-400'
                }`}>
                {echo.cost} Cost
              </span>
            )}
          </div>
          {echo && (
            <button
              onClick={handleClear}
              className="rounded p-1 text-text-primary/50 transition-colors hover:bg-red-500/20 hover:text-red-400"
              title="Clear echo"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Echo Selection Area */}
        <div className="p-3">
          <button
            onClick={() => setIsSelectorOpen(true)}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-background p-2 transition-colors hover:border-accent"
          >
            {/* Echo Image */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-background-secondary">
              <img
                src={getEchoPaths(echo, panelState.phantom)}
                alt={echo?.name || 'Select Echo'}
                className="h-full w-full object-cover"
              />
              {panelState.phantom && (
                <div className="absolute inset-0 flex items-center justify-center bg-purple-500/30">
                  <Ghost size={16} className="text-purple-300" />
                </div>
              )}
            </div>

            {/* Echo Info */}
            <div className="flex flex-col items-start text-left min-w-0 flex-1">
              {echo ? (
                <>
                  <span className="text-sm font-medium text-text-primary truncate w-full">
                    {panelState.phantom ? `Phantom ${echo.name}` : echo.name}
                  </span>
                  {panelState.selectedElement && (
                    <span className="text-xs text-text-primary/60">
                      {ELEMENT_SETS[panelState.selectedElement]}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-text-primary/50">Click to select...</span>
              )}
            </div>
          </button>

          {/* Echo Controls (only show when echo is selected) */}
          {echo && (
            <div className="mt-3 space-y-3">
              {/* Element Selector (for multi-element echoes) */}
              {echo.elements.length > 1 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-text-primary/70">Element Set</span>
                  <div className="relative">
                    <select
                      value={panelState.selectedElement || ''}
                      onChange={handleElementChange}
                      className={`w-full appearance-none rounded border px-3 py-1.5 pr-8 text-sm focus:outline-none ${panelState.selectedElement
                        ? ELEMENT_BADGE_COLORS[panelState.selectedElement]?.replace('bg-', 'bg-').replace('/80', '/20') || 'bg-background border-border'
                        : 'bg-background border-border'
                        } text-text-primary`}
                    >
                      {echo.elements.map((element) => (
                        <option key={element} value={element}>
                          {ELEMENT_SETS[element as ElementType]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-primary/50 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Level Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-primary/70">Level</span>
                  <span className="text-xs font-medium text-accent">{panelState.level}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={panelState.level}
                  onChange={handleLevelChange}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border"
                  style={{
                    background: `linear-gradient(to right, #a69662 0%, #bfad7d ${(panelState.level / 25) * 100}%, #333333 ${(panelState.level / 25) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-[10px] text-text-primary/40">
                  <span>0</span>
                  <span>25</span>
                </div>
              </div>

              {/* Phantom Toggle (for applicable echoes) */}
              {canBePhantom && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePhantomToggle}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${panelState.phantom
                      ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                      : 'border-border bg-background text-text-primary/70 hover:border-purple-500/50'
                      }`}
                  >
                    <Ghost size={14} />
                    Phantom
                  </button>
                </div>
              )}

              {/* Main Stat Selector */}
              <MainStatSelector
                cost={echo.cost}
                level={panelState.level}
                selectedStat={panelState.stats.mainStat.type}
                selectedValue={panelState.stats.mainStat.value}
                onChange={handleMainStatChange}
              />

              {/* Substats */}
              <SubstatsList
                stats={panelState.stats.subStats}
                panelId={`echo-${index}`}
                mainStatType={panelState.stats.mainStat.type}
                onChange={handleSubstatChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Echo Selector Modal */}
      <EchoSelector
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        onSelect={handleEchoSelect}
        selectedEchoId={panelState.id}
      />
    </>
  );
};

export default EchoPanel;
