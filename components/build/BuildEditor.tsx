'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { Save, Download, Upload, RotateCcw } from 'lucide-react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStats } from '@/contexts/StatsContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { SequenceSelector } from '@/components/character/SequenceSelector';
import { WeaponSelector } from '@/components/weapon/WeaponSelector';
import { LevelSlider } from '@/components/ui/LevelSlider';
import { ForteGroup } from '@/components/forte/ForteGroup';
import { EchoGrid, EchoCostBadge } from '@/components/echo/EchoGrid';

interface BuildEditorProps {
  onSave?: () => void;
  onLoad?: () => void;
  onExport?: () => void;
}

export const BuildEditor: React.FC<BuildEditorProps> = ({
  onSave,
  onLoad,
  onExport,
}) => {
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);

  const { stats } = useStats();
  const [showDebug, setShowDebug] = useState(false);

  const {
    state, resetBuild,
    setCharacterLevel, setSequence,
    setWeapon, setWeaponLevel, setWeaponRank,
    setForteNode, setForteLevel, maxAllFortes,
  } = useBuild();
  const { getWeapon } = useGameData();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();
  const selectedWeapon = getWeapon(state.weaponId);

  const { scrollY } = useScroll();

  useEffect(() => {
    setPortalTarget(document.getElementById('nav-toolbar-portal'));
  }, []);

  // Reset weapon when switching to a character with a different weapon type
  useEffect(() => {
    if (!selectedWeapon || !selected) return;
    if (selectedWeapon.type !== selected.character.weaponType) {
      setWeapon(null);
      setWeaponLevel(1);
      setWeaponRank(1);
    }
  }, [selected, selectedWeapon, setWeapon, setWeaponLevel, setWeaponRank]);

  useMotionValueEvent(scrollY, 'change', () => {
    const el = actionBarRef.current;
    if (!el) return;
    setIsActionBarVisible(el.getBoundingClientRect().bottom > 70);
  });

  const handleResetBuild = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the entire build? This cannot be undone.')) {
      resetBuild();
    }
  }, [resetBuild]);

  return (
    <div className="flex flex-col max-w-[1440px] mx-auto">
      {/* Action Bar */}
      <div
        ref={actionBarRef}
        className="flex flex-wrap items-center gap-2 self-end rounded-lg border border-border bg-background-secondary p-3"
      >
        {state.isDirty && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
            Unsaved
          </span>
        )}
        <div className="flex items-center gap-1.5 md:gap-2">
          <button onClick={onSave} className="flex items-center gap-2 rounded-lg border border-accent bg-accent/10 p-2 md:px-4 md:py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20">
            <Save size={16} /><span className="hidden md:inline">Save</span>
          </button>
          <button onClick={onLoad} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 md:px-4 md:py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40">
            <Upload size={16} /><span className="hidden md:inline">Load</span>
          </button>
          <button onClick={onExport} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 md:px-4 md:py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40">
            <Download size={16} /><span className="hidden md:inline">Export</span>
          </button>
          <button onClick={handleResetBuild} className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 md:px-4 md:py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20">
            <RotateCcw size={16} /><span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Portal: compact nav toolbar */}
      {portalTarget && createPortal(
        <AnimatePresence>
          {!isActionBarVisible && (
            <motion.div
              key="nav-toolbar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 md:gap-1.5"
            >
              {state.isDirty && (
                <span className="hidden md:inline rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">Unsaved</span>
              )}
              <button onClick={onSave} className="flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20">
                <Save size={14} /><span className="hidden md:inline">Save</span>
              </button>
              <button onClick={onLoad} className="flex items-center gap-1.5 rounded-md border border-border bg-background p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-text-primary/40">
                <Upload size={14} /><span className="hidden md:inline">Load</span>
              </button>
              <button onClick={onExport} className="flex items-center gap-1.5 rounded-md border border-border bg-background p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-text-primary/40">
                <Download size={14} /><span className="hidden md:inline">Export</span>
              </button>
              <button onClick={handleResetBuild} className="flex items-center gap-1.5 rounded-md border border-red-500/50 bg-red-500/10 p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20">
                <RotateCcw size={14} /><span className="hidden md:inline">Reset</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget
      )}

      {/* Resonator */}
      <div className="flex flex-col">
        <div className="flex justify-start">
          <CharacterSelector className="rounded-b-none border-b-0" />
        </div>

        <div className="select-none rounded-lg rounded-tl-none border border-border bg-background-secondary p-4">
          {selected ? (
            <div className="grid grid-cols-[auto_auto_1fr] grid-rows-[28rem_auto] gap-x-6 gap-y-3">
              {/* Row 1, Col 1: Portrait */}
              <img
                src={selected.banner}
                alt={t(selected.nameI18n)}
                className="pointer-events-none col-start-1 row-start-1 h-full w-auto rounded-lg object-contain"
              />

              {/* Row 1, Col 2: Sequences + Weapon + Rank slider */}
              <div className="relative flex flex-col justify-between overflow-hidden">
                {selected.character.cdnId && (
                  <SequenceSelector
                    cdnId={selected.character.cdnId}
                    characterName={selected.character.name}
                    current={state.sequence}
                    onChange={setSequence}
                  />
                )}

                <WeaponSelector />
              </div>

              {/* Row 2, Col 1: Character Level */}
              <div className="col-start-1 row-start-2">
                <LevelSlider
                  value={state.characterLevel}
                  onLevelChange={setCharacterLevel}
                  label="Level"
                  showDiamonds={false}
                  showBreakpoints={false}
                />
              </div>

              {/* Row 2, Col 2: Weapon Level */}
              {selectedWeapon && (
                <div className="col-start-2 row-start-2">
                  <LevelSlider
                    value={state.weaponLevel}
                    onLevelChange={setWeaponLevel}
                    label="Weapon Level"
                    showDiamonds={false}
                    showBreakpoints={false}
                  />
                </div>
              )}

              {/* Col 3: Forte */}
              <div className="col-start-3 row-span-2 overflow-hidden">
                <ForteGroup
                  character={selected.character}
                  elementValue={state.roverElement || selected.character.element}
                  forte={state.forte}
                  onNodeChange={setForteNode}
                  onLevelChange={setForteLevel}
                  onMaxAll={maxAllFortes}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-text-primary/40">
              Select a resonator to get started
            </div>
          )}
        </div>
      </div>

      {/* Echoes */}
      <div className="mt-4 flex flex-col">
        <div className="flex justify-end">
          <EchoCostBadge className="rounded-b-none border-b-0" />
        </div>
        <div className="rounded-lg rounded-tr-none border border-border bg-background-secondary p-4">
          <EchoGrid />
        </div>
      </div>

      {/* Debug panel */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setShowDebug(v => !v)}
          className="rounded border border-border bg-background-secondary/90 px-2 py-1 font-mono text-[10px] text-text-primary/40 backdrop-blur hover:text-text-primary/80"
        >
          {showDebug ? '✕ debug' : '⚙ debug'}
        </button>
        {showDebug && (
          <div className="absolute bottom-8 left-0 max-h-[72vh] w-[460px] overflow-auto rounded-lg border border-border bg-background-secondary/96 p-3 shadow-xl backdrop-blur">
            <div className="mb-1 font-mono text-[10px] font-bold text-accent">Build State</div>
            <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-text-primary/60">
              {JSON.stringify(state, null, 2)}
            </pre>
            <div className="mb-1 mt-3 font-mono text-[10px] font-bold text-accent">Stats</div>
            <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-text-primary/60">
              {JSON.stringify({
                cv: stats.cv,
                elementCounts: stats.elementCounts,
                activeSets: stats.activeSets,
                values: stats.values,
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>

    </div>
  );
};

export default BuildEditor;
