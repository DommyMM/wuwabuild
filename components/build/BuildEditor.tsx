'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { Download, Trophy } from 'lucide-react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Element } from '@/lib/character';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { SequenceSelector } from '@/components/character/SequenceSelector';
import { WeaponSelector } from '@/components/weapon/WeaponSelector';
import { LevelSlider } from '@/components/ui/LevelSlider';
import { ForteGroup } from '@/components/forte/ForteGroup';
import { EchoGrid, EchoCostBadge } from '@/components/echo/EchoGrid';
import { BuildCardOptions, CardOptions } from './BuildCardOptions';
import { BuildCard } from './BuildCard';
import { SaveBuildModal } from '@/components/save/SaveBuildModal';
import { BuildActionBar } from './BuildActionBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export const BuildEditor: React.FC = () => {
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);

  const [cardOptions, setCardOptions] = useState<CardOptions>({ source: '', showRollQuality: false, showCV: true, useAltSkin: false });
  const [isCardGenerated, setIsCardGenerated] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
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
    setCharacter, setRoverElement,
  } = useBuild();
  const { getWeapon, characters } = useGameData();
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

    // Scale up from current CSS size so all fixed values (border-radius, shadows etc.) scale proportionally
    const exportWidth = 3840;
    const pixelRatio = exportWidth / cardRef.current.offsetWidth;

    try {
      await new Promise(resolve => requestAnimationFrame(resolve));

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio,
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
      setIsDownloading(false);
    }
  }, [isDownloading, selected?.character.name]);

  const handleResetBuild = useCallback(() => {
    setIsResetDialogOpen(true);
  }, []);

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
              <div className="relative col-start-1 row-start-1 h-full">
                <img
                  src={selected.banner}
                  alt={t(selected.nameI18n)}
                  className="pointer-events-none h-full w-auto rounded-lg object-contain"
                />
                {selected.isRover && (
                  <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                    {(['Spectro', 'Aero', 'Havoc'] as const).map((el) => {
                      const active = selected.element === el;
                      return (
                        <button
                          key={el}
                          onClick={() => {
                            const variant = characters.find(
                              c => c.element === Element.Rover &&
                                c.legacyId === selected.character.legacyId &&
                                c.roverElementName === el,
                            );
                            if (variant) setCharacter(variant.id, el);
                            else setRoverElement(el);
                          }}
                          className={`rounded-md border px-2 py-0.5 text-xs font-semibold backdrop-blur transition-colors
                            ${active
                              ? `bg-${el.toLowerCase()}/30 border-${el.toLowerCase()}/70 text-${el.toLowerCase()}`
                              : 'border-white/20 bg-black/40 text-white/60 hover:border-white/40 hover:text-white/90'
                            }`}
                        >
                          {el}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Row 1, Col 2: Sequences + Weapon + Rank slider */}
              <div className="relative flex flex-col justify-between overflow-hidden">
                {selected.character.cdnId && (
                  <SequenceSelector
                    cdnId={selected.character.cdnId}
                    characterName={selected.character.name}
                    roverElement={state.roverElement}
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
                  key={selected.character.id}
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
            <BuildCard ref={cardRef} useAltSkin={cardOptions.useAltSkin} />
            {/* Action bar, flipped version of BuildCardOptions */}
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
      <SaveBuildModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        defaultName={selected?.character.name ? `${selected.character.name} Build` : undefined}
      />

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        title="Reset entire build?"
        description="This will clear your current character, weapon, forte, and echoes. This cannot be undone."
        confirmLabel="Reset Build"
        confirmTone="destructive"
        onConfirm={() => {
          resetBuild();
          setIsResetDialogOpen(false);
        }}
      />

    </div>
  );
};
