'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { EchoSelector } from './EchoSelector';
import { MainStatSelector, SubstatsList } from './StatSelector';
import { Echo, ElementType, ELEMENT_SETS, EchoPanelState } from '@/types/echo';
import { hasPhantomVariant } from '@/lib/constants/echoBonuses';
import { useLanguage } from '@/contexts/LanguageContext';
import { X } from 'lucide-react';
import { getEchoPaths } from '@/lib/paths';
import Marquee from 'react-fast-marquee';

/** Scrolls text only when it overflows the available width. */
function EchoName({ text, className }: { text: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;
    // 16px buffer — text that barely fits still gets a marquee for breathing room
    const check = () => setScrolls(measure.scrollWidth + 16 > container.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={containerRef} className={`min-w-0 overflow-hidden ${className ?? ''}`}>
      {/* Hidden span used purely to measure natural text width */}
      <span ref={measureRef} className="invisible absolute whitespace-nowrap pointer-events-none" aria-hidden="true">
        {text}
      </span>
      {scrolls ? (
        <Marquee speed={35} gradient={false} pauseOnHover>
          <span className="pr-12">{text}</span>
        </Marquee>
      ) : (
        <span className="block whitespace-nowrap text-center">{text}</span>
      )}
    </div>
  );
}

export interface DragHandleProps {
  [key: string]: unknown;
  role?: string;
  tabIndex?: number;
  'aria-describedby'?: string;
}

interface EchoPanelProps {
  index: number;
  panelState: EchoPanelState;
  dragHandleProps?: DragHandleProps;
  isDragging?: boolean;
  className?: string;
}

// Element badge colors, co-occurring sets kept visually distinct
const ELEMENT_BADGE_COLORS: Record<string, string> = {
  'Aero':       'bg-aero/80 text-white border-aero',
  'Glacio':     'bg-blue-400/80 text-white border-blue-400',
  'Electro':    'bg-purple-500/80 text-white border-purple-500',
  'Fusion':     'bg-orange-400/80 text-white border-orange-400',
  'Havoc':      'bg-pink-500/80 text-white border-pink-500',
  'Spectro':    'bg-spectro/80 text-black border-spectro',
  'ER':         'bg-zinc-500/80 text-white border-zinc-500',
  'Attack':     'bg-red-700/80 text-white border-red-700',
  'Healing':    'bg-green-500/80 text-white border-green-500',
  'Empyrean':   'bg-slate-400/80 text-white border-slate-400',
  'Frosty':     'bg-sky-400/80 text-white border-sky-400',
  'Midnight':   'bg-purple-400/80 text-white border-purple-400',
  'Radiance':   'bg-yellow-400/80 text-black border-yellow-400',
  'Tidebreaking': 'bg-zinc-600/80 text-white border-zinc-600',
  'Gust':       'bg-cyan-300/80 text-black border-cyan-300',
  'Windward':   'bg-teal-500/80 text-white border-teal-500',
  'Flaming':    'bg-red-900/80 text-white border-red-900',
  'Dream':      'bg-pink-300/80 text-black border-pink-300',
  'Crown':      'bg-amber-600/80 text-white border-amber-600',
  'Law':        'bg-slate-600/80 text-white border-slate-600',
  'Flamewing':  'bg-orange-500/80 text-white border-orange-500',
  'Thread':     'bg-fuchsia-400/80 text-white border-fuchsia-400',
  'Pact':       'bg-yellow-500/80 text-black border-yellow-500',
  'Halo':       'bg-lime-400/80 text-black border-lime-400',
  'Rite':       'bg-amber-500/80 text-white border-amber-500',
  'Trailblazing': 'bg-red-500/80 text-white border-red-500',
  'Chromatic':  'bg-rose-400/80 text-white border-rose-400',
  'Sound':      'bg-emerald-600/80 text-white border-emerald-600',
};


export const EchoPanel: React.FC<EchoPanelProps> = ({
  index,
  panelState,
  dragHandleProps,
  isDragging = false,
  className = ''
}) => {
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const { t } = useLanguage();
  const { getEcho, calculateMainStatValue, getMainStatsByCost, getFetterByElement } = useGameData();
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
    return echo ? hasPhantomVariant(echo) : false;
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

  // Handle clear
  const handleClear = useCallback(() => {
    clearEchoPanel(index);
  }, [index, clearEchoPanel]);

  return (
    <>
      <div
        className={`flex flex-col rounded-lg border-2 transition-colors border-border  ${isDragging ? 'bg-[#3a3a3a] shadow-[0_0_20px_rgba(0,0,0,0.3)]' : 'bg-background-secondary'} ${className}`}
      >
        {/* Header — drag handle bar with phantom toggle (left) and clear (right) */}
        <div
          {...dragHandleProps}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2 border-b border-border px-2 py-2 cursor-grab active:cursor-grabbing"
        >
          {/* Left: Phantom checkbox (only for applicable echoes) */}
          <div className="flex items-center" onPointerDown={(e) => e.stopPropagation()}>
            {echo && canBePhantom && (
              <label
                htmlFor={`phantom-${index}`}
                className={`flex cursor-pointer items-center gap-1.5 rounded border px-1.5 py-1 text-xs font-medium transition-colors select-none ${panelState.phantom
                  ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                  : 'border-border bg-background text-text-primary hover:border-amber-500/50 hover:text-amber-400'
                  }`}
              >
                <input
                  type="checkbox"
                  id={`phantom-${index}`}
                  checked={panelState.phantom}
                  onChange={(e) => setEchoPhantom(index, e.target.checked)}
                  className="h-3 w-3 cursor-pointer rounded border-border accent-amber-500"
                />
                Phantom
              </label>
            )}
          </div>

          {/* Center: Echo name — scrolls when overflowing */}
          <EchoName
            text={echo ? (echo.nameI18n ? t(echo.nameI18n) : echo.name) : `Echo ${index + 1}`}
            className="text-lg text-text-primary pointer-events-none select-none px-1"
          />

          {/* Right: Clear button */}
          <div className="flex items-center justify-end">
            <button
              onClick={handleClear}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center rounded border border-red-500/50 bg-red-500/10 p-1.5 text-red-400/70 transition-colors hover:bg-red-500/20 hover:text-red-300"
              title="Clear echo"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Echo Selection Area */}
        <div className="p-3">
          <div className="flex items-start justify-center gap-2">
            {/* Left: element tabs — flex-1 so image stays centered */}
            <div className="flex flex-1 justify-end">
              {echo && echo.elements.length > 1 && (
                <div className="grid grid-cols-2 gap-1" onPointerDown={(e) => e.stopPropagation()}>
                  {echo.elements.map((el, i) => (
                    <button
                      key={el}
                      onClick={() => setEchoElement(index, el)}
                      title={t(getFetterByElement(el)?.name ?? {}) || ELEMENT_SETS[el]}
                      className={`h-6 w-6 rounded border text-xs font-bold transition-colors ${
                        panelState.selectedElement === el
                          ? (ELEMENT_BADGE_COLORS[el] ?? 'bg-accent text-white border-accent')
                          : 'border-border bg-background/60 text-text-primary/30 hover:border-accent/40 hover:text-text-primary/60'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Center: echo image — shrink-0 so it never squishes */}
            <button
              onClick={() => setIsSelectorOpen(true)}
              className="shrink-0 overflow-hidden rounded-lg border border-border transition-colors hover:border-accent/50"
            >
              <img
                src={getEchoPaths(echo, panelState.phantom)}
                alt={echo ? (echo.nameI18n ? t(echo.nameI18n) : echo.name) : 'Select Echo'}
                className="h-24 w-24 object-cover"
              />
            </button>

            {/* Right: balancing flex-1 */}
            <div className="flex-1" />
          </div>

          {/* Echo Controls — always visible */}
          <div className="mt-3">

            {/* Level Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 cursor-default">
                <span className="text-sm font-medium text-text-primary/80">Level</span>
                <span className="min-w-12 rounded-md border border-border bg-background px-2.5 py-1 text-center text-sm font-medium text-accent">
                  {panelState.level}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                value={panelState.level}
                onChange={handleLevelChange}
                className="level-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-border"
                style={{
                  background: `linear-gradient(to right, #a69662 0%, #bfad7d ${(panelState.level / 25) * 100}%, #333333 ${(panelState.level / 25) * 100}%)`
                }}
              />
            </div>

            {/* Main Stat Selector */}
            <MainStatSelector
              cost={echo?.cost ?? null}
              level={panelState.level}
              selectedStat={panelState.stats.mainStat.type}
              selectedValue={panelState.stats.mainStat.value}
              onChange={handleMainStatChange}
              disabled={!echo}
            />

            {/* Substats */}
            <SubstatsList
              stats={panelState.stats.subStats}
              panelId={`echo-${index}`}
              mainStatType={panelState.stats.mainStat.type}
              onChange={handleSubstatChange}
            />
          </div>
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
