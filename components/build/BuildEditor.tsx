'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { Download, Trophy } from 'lucide-react';
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
import BuildCardOptions, { CardOptions } from './BuildCardOptions';
import { BuildCard } from './BuildCard';
import { SaveBuildModal } from '@/components/save/SaveBuildModal';
import { BuildActionBar } from './BuildActionBar';

export const BuildEditor: React.FC = () => {
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);

  const { stats } = useStats();
  const [showDebug, setShowDebug] = useState(false);
  const [, setCardOptions] = useState<CardOptions>({ source: '', showRollQuality: false, showCV: true, useAltSkin: false });
  const [isCardGenerated, setIsCardGenerated] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCardGenerated) {
      // Scroll to bottom of page where card is generated
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    }
  }, [isCardGenerated]);

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

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    const { toPng } = await import('html-to-image');

    // 4K output: 3840 × 1600 (aspect ratio 2.4:1)
    const exportWidth = 3840;
    const exportHeight = Math.round(exportWidth / 2.4);

    const clone = cardRef.current.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.zIndex = '-1000';
    clone.style.pointerEvents = 'none';
    clone.style.width = `${exportWidth}px`;
    document.body.appendChild(clone);

    try {
      // Wait for next frame to ensure styles are applied, but no arbitrary delay
      await new Promise(resolve => requestAnimationFrame(resolve));

      const dataUrl = await toPng(clone, {
        cacheBust: true,
        width: exportWidth,
        height: exportHeight,
        pixelRatio: 1,
      });
      const link = document.createElement('a');
      const charName = selected?.character.name?.replace(/\s+/g, '-') || 'build';

      // Format: YYYY-MM-DD_HH-mm-ss (ISO-like, easy to read/sort)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

      link.download = `${charName}_${dateStr}_${timeStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      document.body.removeChild(clone);
      setIsDownloading(false);
    }
  }, [isDownloading, selected?.character.name]);

  const handleResetBuild = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the entire build? This cannot be undone.')) {
      resetBuild();
    }
  }, [resetBuild]);

  const handleOpenSaveModal = useCallback(() => {
    setIsSaveModalOpen(true);
  }, []);

  return (
    <div className="flex flex-col max-w-[1440px] mx-auto">
      {/* Action Bar */}
      <BuildActionBar
        containerRef={actionBarRef}
        isDirty={state.isDirty}
        onSave={handleOpenSaveModal}
        onReset={handleResetBuild}
      />

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
              className="flex items-center"
            >
              <BuildActionBar
                compact
                isDirty={state.isDirty}
                onSave={handleOpenSaveModal}
                onReset={handleResetBuild}
              />
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


      {/* Build Card */}
      <div className="mt-8 flex flex-col">
        <div className="relative flex items-start">
          <BuildCardOptions
            className={isCardGenerated ? 'rounded-b-none border-b-0' : ''}
            onChange={setCardOptions}
          />
          <button
            onClick={() => setIsCardGenerated(true)}
            className="absolute left-1/2 -translate-x-1/2 rounded-lg bg-accent px-4 py-3 text-base font-semibold tracking-wide cursor-pointer text-background transition-all hover:brightness-110 hover:shadow-[0_0_16px_rgba(var(--color-accent),0.4)] active:scale-[0.97]"
          >
            Generate
          </button>
        </div>
        {isCardGenerated && (
          <>
            <div className="rounded-lg rounded-tl-none border border-border relative overflow-hidden">
              <BuildCard ref={cardRef} />
            </div>
            {/* Action bar — flipped version of BuildCardOptions */}
            <div className="flex justify-start pl-12">
              <div className="flex items-center gap-3 rounded-lg rounded-t-none border border-t-0 border-border bg-background p-3">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-accent/40 bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary cursor-pointer transition-all duration-300 hover:border-accent hover:text-background disabled:opacity-50 disabled:cursor-wait"
                >
                  {/* Gold fill animation on hover */}
                  <span className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  <Download size={14} className="relative z-10" />
                  <span className="relative z-10">
                    {isDownloading ? (
                      <span className="flex items-center gap-0.5">
                        <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
                        <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
                        <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : 'Download'}
                  </span>
                </button>
                {/* TODO: Add leaderboard logic once LB is set up in the rewrite */}
                <button
                  disabled
                  className="flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary/40 cursor-not-allowed"
                >
                  <Trophy size={14} />
                  View Ranking
                </button>
              </div>
            </div>
          </>
        )}
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

      <SaveBuildModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        defaultName={selected?.character.name ? `${selected.character.name} Build` : undefined}
      />

    </div>
  );
};

export default BuildEditor;
