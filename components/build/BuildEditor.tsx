'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Minus, Pencil, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Element } from '@/lib/character';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { DEFAULT_CARD_ART_TRANSFORM, CardArtSourceMode, CardArtTransform } from '@/lib/cardArt';
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

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_CUSTOM_IMAGE_HEIGHT = 600;
const ART_NUDGE_STEP = 12;
const ART_ZOOM_STEP = 0.05;
const MIN_ART_ZOOM = 1;
const MAX_ART_ZOOM = 4;

const getImageNaturalHeight = async (file: File): Promise<number> => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const naturalHeight = await new Promise<number>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalHeight || img.height || 0);
      img.onerror = () => reject(new Error('Failed to load image metadata.'));
      img.src = objectUrl;
    });
    return naturalHeight;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const getImageNaturalHeightFromUrl = async (url: string): Promise<number> => (
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalHeight || img.height || 0);
    img.onerror = () => reject(new Error('Failed to load image metadata.'));
    img.src = url;
  })
);

const readFileAsDataUrl = (file: File): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  })
);

export const BuildEditor: React.FC = () => {
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);

  const [cardOptions, setCardOptions] = useState<CardOptions>({ source: '', showRollQuality: false, showCV: true, useAltSkin: false });
  const [isCardGenerated, setIsCardGenerated] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isArtEditMode, setIsArtEditMode] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [artTransform, setArtTransform] = useState<CardArtTransform>(DEFAULT_CARD_ART_TRANSFORM);
  const [artSourceMode, setArtSourceMode] = useState<CardArtSourceMode>('default');
  const [customArtUrl, setCustomArtUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const customArtBlobRef = useRef<Blob | null>(null);

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
  const { error: toastError } = useToast();
  const selected = useSelectedCharacter();
  const selectedWeapon = getWeapon(state.weaponId);

  const { scrollY } = useScroll();

  const clearArtState = useCallback(() => {
    customArtBlobRef.current = null;

    setArtTransform(DEFAULT_CARD_ART_TRANSFORM);
    setArtSourceMode('default');
    setCustomArtUrl(null);
  }, []);

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

  useEffect(() => {
    clearArtState();
    setIsArtEditMode(false);
  }, [state.characterId, clearArtState]);

  useMotionValueEvent(scrollY, 'change', () => {
    const el = actionBarRef.current;
    if (!el) return;
    setIsActionBarVisible(el.getBoundingClientRect().bottom > 70);
  });

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);
    const { toBlob } = await import('html-to-image');

    // Scale up from current CSS size so all fixed values (border-radius, shadows etc.) scale proportionally
    const exportWidth = 3840;
    const pixelRatio = exportWidth / cardRef.current.offsetWidth;

    try {
      await new Promise(resolve => requestAnimationFrame(resolve));

      const exportBlob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio,
      });
      if (!exportBlob) {
        throw new Error('Card export returned an empty blob.');
      }
      const link = document.createElement('a');
      const charName = selected?.character.name?.replace(/\s+/g, '-') || 'build';

      // Format: YYYY-MM-DD_HH-mm-ss (ISO-like, easy to read/sort)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

      const url = URL.createObjectURL(exportBlob);
      link.download = `${charName}_${dateStr}_${timeStr}.png`;
      link.href = url;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      toastError('Failed to download build card.');
      console.error('Download failed:', e);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, selected?.character.name, toastError]);

  const handleResetBuild = useCallback(() => {
    setIsResetDialogOpen(true);
  }, []);

  const handleOpenSaveModal = useCallback(() => {
    setIsSaveModalOpen(true);
  }, []);

  const handleToggleArtEditMode = useCallback(() => {
    setIsArtEditMode(v => !v);
  }, []);

  const handleCustomArtUpload = useCallback(async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toastError('Unsupported file type. Use PNG, JPG, or WEBP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toastError('Image is too large. Maximum file size is 10MB.');
      return;
    }

    let autoScale = MIN_ART_ZOOM;
    let dataUrl = '';
    try {
      const [naturalHeight, loadedDataUrl] = await Promise.all([
        getImageNaturalHeight(file),
        readFileAsDataUrl(file),
      ]);
      dataUrl = loadedDataUrl;
      if (naturalHeight > 0 && naturalHeight < MIN_CUSTOM_IMAGE_HEIGHT) {
        autoScale = Math.min(
          MAX_ART_ZOOM,
          Number((MIN_CUSTOM_IMAGE_HEIGHT / naturalHeight).toFixed(2))
        );
      }
    } catch (error) {
      toastError('Failed to process custom image.');
      console.error('Custom image processing failed:', error);
      return;
    }
    customArtBlobRef.current = file;
    setCustomArtUrl(dataUrl);
    setArtSourceMode('custom');
    setArtTransform({ x: 0, y: 0, scale: autoScale });
  }, [toastError]);

  const handleRemoveCustomArt = useCallback(() => {
    customArtBlobRef.current = null;
    setCustomArtUrl(null);
    setArtSourceMode('default');
    setArtTransform(DEFAULT_CARD_ART_TRANSFORM);
  }, []);

  const handleUseSplashArt = useCallback(async () => {
    const characterId = selected?.character.id;
    if (!characterId) return;

    const splashUrl = `/images/splash/${characterId}.webp`;
    let autoScale = MIN_ART_ZOOM;
    try {
      const naturalHeight = await getImageNaturalHeightFromUrl(splashUrl);
      if (naturalHeight > 0 && naturalHeight < MIN_CUSTOM_IMAGE_HEIGHT) {
        autoScale = Math.min(
          MAX_ART_ZOOM,
          Number((MIN_CUSTOM_IMAGE_HEIGHT / naturalHeight).toFixed(2))
        );
      }
    } catch (error) {
      toastError('Splash image not found for this character.');
      console.error('Splash image load failed:', error);
      return;
    }

    customArtBlobRef.current = null;
    setCustomArtUrl(splashUrl);
    setArtSourceMode('custom');
    setArtTransform({ x: 0, y: 0, scale: autoScale });
  }, [selected?.character.id, toastError]);

  const handleResetArtTransform = useCallback(() => {
    setArtTransform(DEFAULT_CARD_ART_TRANSFORM);
  }, []);

  const handleNudgeArt = useCallback((dx: number, dy: number) => {
    setArtTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleZoomArt = useCallback((delta: number) => {
    setArtTransform(prev => {
      const next = Number((prev.scale + delta).toFixed(2));
      const clamped = Math.max(MIN_ART_ZOOM, Math.min(MAX_ART_ZOOM, next));
      return { ...prev, scale: clamped };
    });
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
            <BuildCard
              ref={cardRef}
              useAltSkin={cardOptions.useAltSkin}
              showCV={cardOptions.showCV}
              showRollQuality={cardOptions.showRollQuality}
              artTransform={artTransform}
              artSourceMode={artSourceMode}
              customArtUrl={customArtUrl}
              isArtEditMode={isArtEditMode}
              onCustomArtUpload={handleCustomArtUpload}
              onArtTransformChange={setArtTransform}
            />
            {/* Action bar, flipped version of BuildCardOptions */}
            <div className="flex justify-start pl-12">
              <div className="flex flex-col rounded-lg rounded-t-none border border-t-0 border-border bg-background">
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={handleToggleArtEditMode}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      isArtEditMode
                        ? 'border-accent/70 bg-accent/15 text-accent'
                        : 'border-border bg-background-secondary text-text-primary hover:border-accent/60'
                    }`}
                  >
                    <Pencil size={14} />
                    {isArtEditMode ? 'Done Editing' : 'Edit'}
                  </button>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                    className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-accent/65 bg-accent px-5 py-2 text-sm font-semibold text-background cursor-pointer transition-all duration-300 hover:brightness-110 disabled:opacity-50 disabled:cursor-wait"
                >
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

                {isArtEditMode && (
                  <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-text-primary/80">Zoom</span>
                      <button
                        onClick={() => handleZoomArt(-ART_ZOOM_STEP)}
                        disabled={artTransform.scale <= MIN_ART_ZOOM}
                        className="rounded-md border border-border bg-background-secondary px-2 py-1 text-text-primary hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        type="button"
                        className="min-w-14 rounded-md border border-border bg-background px-2.5 py-1 text-center text-sm font-semibold text-accent transition-colors hover:border-accent"
                      >
                        {`${Math.round(artTransform.scale * 100)}%`}
                      </button>
                      <button
                        onClick={() => handleZoomArt(ART_ZOOM_STEP)}
                        disabled={artTransform.scale >= MAX_ART_ZOOM}
                        className="rounded-md border border-border bg-background-secondary px-2 py-1 text-text-primary hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        +
                      </button>

                      <button
                        onClick={handleUseSplashArt}
                        disabled={!selected}
                        className="rounded-md border border-border bg-background-secondary px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Use Splash Art
                      </button>

                      <button
                        onClick={handleRemoveCustomArt}
                        disabled={artSourceMode !== 'custom'}
                        className="ml-auto inline-flex items-center gap-2 rounded-md border border-border bg-background-secondary px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        Remove Custom
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
                        <span />
                        <button
                          onClick={() => handleNudgeArt(0, -ART_NUDGE_STEP)}
                          className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                        >
                          <ArrowUp size={14} />
                        </button>
                        <span />
                        <button
                          onClick={() => handleNudgeArt(-ART_NUDGE_STEP, 0)}
                          className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                        >
                          <ArrowLeft size={14} />
                        </button>
                        <button
                          onClick={handleResetArtTransform}
                          className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                          title="Reset position and zoom"
                        >
                          <RotateCcw size={14} />
                        </button>
                        <button
                          onClick={() => handleNudgeArt(ART_NUDGE_STEP, 0)}
                          className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                        >
                          <ArrowRight size={14} />
                        </button>
                        <span />
                        <button
                          onClick={() => handleNudgeArt(0, ART_NUDGE_STEP)}
                          className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                        >
                          <ArrowDown size={14} />
                        </button>
                        <span />
                      </div>
                    </div>
                  </div>
                )}
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
          clearArtState();
          setIsArtEditMode(false);
          setIsResetDialogOpen(false);
        }}
      />

    </div>
  );
};
