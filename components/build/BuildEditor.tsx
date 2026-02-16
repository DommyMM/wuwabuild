'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { Save, Download, Upload, RotateCcw } from 'lucide-react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { SequenceSelector } from '@/components/character/SequenceSelector';
import { WeaponSelector } from '@/components/weapon/WeaponSelector';
import { AssetImage } from '@/components/ui/AssetImage';
import { LevelSlider } from '@/components/ui/LevelSlider';

interface BuildEditorProps {
  className?: string;
  onSave?: () => void;
  onLoad?: () => void;
  onExport?: () => void;
}

export const BuildEditor: React.FC<BuildEditorProps> = ({
  className = '',
  onSave,
  onLoad,
  onExport,
}) => {
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);

  const {
    state, resetBuild,
    setCharacterLevel, setSequence,
    setWeaponLevel, setWeaponRank,
  } = useBuild();
  const { getWeapon } = useGameData();
  const { t } = useLanguage();
  const selected = useSelectedCharacter();
  const selectedWeapon = getWeapon(state.weaponId);

  const { scrollY } = useScroll();

  useEffect(() => {
    setPortalTarget(document.getElementById('nav-toolbar-portal'));
  }, []);

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
    <div className={`flex flex-col gap-6 ${className}`}>
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
        <div className="flex justify-end">
          <CharacterSelector className="rounded-b-none border-b-0" />
        </div>

        <div className="rounded-lg rounded-tr-none border border-border bg-background-secondary p-4">
          {selected ? (
            <div className="flex gap-6">
              {/* Left column: portrait + level */}
              <div className="flex shrink-0 flex-col gap-3">
                <AssetImage
                  paths={selected.bannerPaths}
                  alt={t(selected.nameI18n)}
                  className="h-96 w-auto rounded-lg object-contain"
                />
                <LevelSlider
                  value={state.characterLevel}
                  onLevelChange={setCharacterLevel}
                  label="Level"
                  showDiamonds={false}
                  showBreakpoints={false}
                />
              </div>

              {/* Middle column: sequences + weapon (capped to arc width) */}
              <div className="flex flex-col gap-5">
                {/* Sequences */}
                {selected.character.cdnId && (
                  <SequenceSelector
                    cdnId={selected.character.cdnId}
                    characterName={selected.character.name}
                    current={state.sequence}
                    onChange={setSequence}
                  />
                )}

                <div className="h-px bg-border" />

                {/* Weapon */}
                <WeaponSelector />

                {selectedWeapon && (
                  <div className="flex flex-col gap-4">
                    <LevelSlider
                      value={state.weaponLevel}
                      onLevelChange={setWeaponLevel}
                      label="Weapon Level"
                      showDiamonds={false}
                      showBreakpoints={false}
                    />

                    {/* Rank (Refinement) */}
                    <div className="flex items-center gap-1.5">
                      <span className="mr-2 text-sm font-medium text-text-primary/60">Rank</span>
                      {[1, 2, 3, 4, 5].map(r => (
                        <button
                          key={r}
                          onClick={() => setWeaponRank(r)}
                          className={`flex h-8 w-8 items-center justify-center rounded-md border text-xs font-semibold transition-all
                            ${r === state.weaponRank
                              ? 'border-accent bg-accent/20 text-accent'
                              : 'border-border text-text-primary/40 hover:border-text-primary/30 hover:text-text-primary/60'
                            }
                          `}
                        >
                          R{r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right column: (reserved) */}
              <div className="flex flex-1 flex-col gap-5">
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12 text-text-primary/40">
              Select a resonator to get started
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default BuildEditor;
