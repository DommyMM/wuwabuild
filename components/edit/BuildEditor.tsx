'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Element } from '@/lib/character';
import { ROVER_ELEMENTS } from '@/lib/constants/statBonuses';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useResolvedLeaderboardLink } from '@/hooks/useResolvedLeaderboardLink';
import { DEFAULT_CARD_ART_TRANSFORM, MAX_ART_ZOOM, MIN_ART_ZOOM, CardArtSourceMode, CardArtTransform } from '@/lib/cardArt';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { SequenceSelector } from '@/components/character/SequenceSelector';
import { WeaponSelector } from '@/components/weapon/WeaponSelector';
import { LevelSlider } from '@/components/ui/LevelSlider';
import { ForteGroup } from '@/components/forte/ForteGroup';
import { EchoGrid, EchoCostBadge } from '@/components/echo/EchoGrid';
import { BuildCardOptions, CardOptions } from './BuildCardOptions';
import { BuildCard } from './BuildCard';
import { SimulateRankPanel } from './SimulateRankPanel';
import { BuildCardActionPanel } from './BuildCardActionPanel';
import { CardScaler } from './CardScaler';
import { SaveBuildModal } from '@/components/save/SaveBuildModal';
import { BuildActionBar } from './BuildActionBar';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getSplashUrlCandidates, logSplashArtTransform, resolveSplashCardArt, SplashArtVariant } from '@/lib/splashArt';
import posthog from 'posthog-js';

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MIN_CUSTOM_IMAGE_HEIGHT = 600;
const FIXED_CARD_PREVIEW_WIDTH = 1440;
const FIXED_CARD_PREVIEW_HEIGHT = FIXED_CARD_PREVIEW_WIDTH / 2.4;
const EXPORT_CARD_WIDTH = 3840;
type RoverElement = (typeof ROVER_ELEMENTS)[number];
type CharacterArtState = {
  ownerCharacterId: string | null;
  isEditMode: boolean;
  transform: CardArtTransform;
  sourceMode: CardArtSourceMode;
  customUrl: string | null;
  splashVariant: SplashArtVariant;
};

const ROVER_ELEMENT_ACTIVE_CLASS: Record<RoverElement, string> = {
  Spectro: 'bg-spectro/30 border-spectro/70 text-spectro',
  Aero: 'bg-aero/30 border-aero/70 text-aero',
  Havoc: 'bg-havoc/30 border-havoc/70 text-havoc',
};

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

const readFileAsDataUrl = (file: File): Promise<string> => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  })
);

const createDefaultArtState = (characterId: string | null): CharacterArtState => ({
  ownerCharacterId: characterId,
  isEditMode: false,
  transform: DEFAULT_CARD_ART_TRANSFORM,
  sourceMode: 'default',
  customUrl: null,
  splashVariant: 'normal',
});

export const BuildEditor: React.FC = () => {
  const router = useRouter();
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const actionBarRef = useRef<HTMLDivElement>(null);
  const [isPhoneViewport, setIsPhoneViewport] = useState(false);

  const [cardOptions, setCardOptions] = useState<CardOptions>({ source: '', showRollQuality: false, showCV: true, useAltSkin: false });
  const [isCardGenerated, setIsCardGenerated] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [splashDisabledIds, setSplashDisabledIds] = useState<Set<string>>(() => new Set());
  const cardRef = useRef<HTMLDivElement>(null);
  const customArtBlobRef = useRef<Blob | null>(null);
  const editorStartedTrackedRef = useRef(false);
  const previousDirtyRef = useRef(false);

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
  const { success: toastSuccess, error: toastError } = useToast();
  const selected = useSelectedCharacter();
  const selectedWeapon = getWeapon(state.weaponId);
  const leaderboardLink = useResolvedLeaderboardLink({
    characterId: selected?.character.id ?? state.characterId,
    weaponId: state.weaponId,
    sequence: state.sequence,
    getWeapon,
  });

  const { scrollY } = useScroll();
  const [artState, setArtState] = useState<CharacterArtState>(() => createDefaultArtState(state.characterId));
  const activeArtState = artState.ownerCharacterId === state.characterId
    ? artState
    : createDefaultArtState(state.characterId);
  const { customUrl: customArtUrl, isEditMode: isArtEditMode, sourceMode: artSourceMode, transform: artTransform } = activeArtState;
  const isSplashArtActive = useMemo(() => {
    return selected ? artSourceMode === 'splash' && Boolean(customArtUrl) : false;
  }, [artSourceMode, customArtUrl, selected]);
  const selectedSkinIds = useMemo(
    () => selected?.character.skins?.map((skin) => skin.id) ?? [],
    [selected?.character.skins],
  );
  const selectedSplashVariant: SplashArtVariant = cardOptions.useAltSkin && selectedSkinIds.length > 0 ? 'skin' : 'normal';
  const portalTarget = typeof document === 'undefined' ? null : document.getElementById('nav-toolbar-portal');

  const setArtTransform = useCallback((next: React.SetStateAction<CardArtTransform>) => {
    setArtState((prev) => {
      const current = prev.ownerCharacterId === state.characterId ? prev : createDefaultArtState(state.characterId);
      return {
        ...current,
        transform: typeof next === 'function' ? next(current.transform) : next,
      };
    });
  }, [state.characterId]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    if (!isArtEditMode || artSourceMode !== 'splash' || !state.characterId) return;

    const timer = window.setTimeout(() => {
      logSplashArtTransform(state.characterId!, activeArtState.splashVariant, artTransform);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [
    activeArtState.splashVariant,
    artSourceMode,
    artTransform,
    isArtEditMode,
    state.characterId,
  ]);

  const clearArtState = useCallback(() => {
    customArtBlobRef.current = null;
    setArtState(createDefaultArtState(state.characterId));
  }, [state.characterId]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsPhoneViewport(media.matches);
    onChange();

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!selected || !state.characterId) return;
    if (splashDisabledIds.has(state.characterId)) return;
    const shouldSwapSplashVariant = activeArtState.sourceMode === 'splash'
      && activeArtState.splashVariant !== selectedSplashVariant;
    if ((activeArtState.sourceMode !== 'default' || activeArtState.customUrl) && !shouldSwapSplashVariant) return;

    let cancelled = false;
    const characterKey = state.characterId;

    resolveSplashCardArt(
      String(selected.character.id),
      selected.character.legacyId ?? null,
      selected.isRover,
      { variant: selectedSplashVariant },
    ).then((splash) => {
      if (cancelled || !splash) return;
      customArtBlobRef.current = null;
      setArtState((prev) => {
        const current = prev.ownerCharacterId === characterKey ? prev : createDefaultArtState(characterKey);
        const isCurrentSplashVariant = current.sourceMode === 'splash'
          && current.splashVariant !== selectedSplashVariant;
        if ((current.sourceMode !== 'default' || current.customUrl) && !isCurrentSplashVariant) return prev;
        return {
          ...current,
          customUrl: splash.url,
          splashVariant: selectedSplashVariant,
          sourceMode: 'splash',
          transform: splash.transform,
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeArtState.customUrl,
    activeArtState.sourceMode,
    activeArtState.splashVariant,
    selected,
    selectedSkinIds,
    selectedSplashVariant,
    splashDisabledIds,
    state.characterId,
  ]);

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

  useEffect(() => {
    if (!editorStartedTrackedRef.current && state.isDirty && !previousDirtyRef.current) {
      editorStartedTrackedRef.current = true;
      posthog.capture('editor_start', {
        character_id: state.characterId,
        weapon_id: state.weaponId,
      });
    }
    previousDirtyRef.current = state.isDirty;
  }, [state.characterId, state.isDirty, state.weaponId]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current || isDownloading) return;
    setIsDownloading(true);

    setArtState((prev) => {
      const current = prev.ownerCharacterId === state.characterId ? prev : createDefaultArtState(state.characterId);
      return { ...current, isEditMode: false };
    });

    const { toBlob } = await import('html-to-image');

    const pixelRatio = EXPORT_CARD_WIDTH / FIXED_CARD_PREVIEW_WIDTH;

    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      await new Promise(resolve => requestAnimationFrame(resolve));

      const exportBlob = await toBlob(cardRef.current, {
        cacheBust: true,
        height: FIXED_CARD_PREVIEW_HEIGHT,
        pixelRatio,
        style: {
          height: `${FIXED_CARD_PREVIEW_HEIGHT}px`,
          maxHeight: `${FIXED_CARD_PREVIEW_HEIGHT}px`,
          maxWidth: `${FIXED_CARD_PREVIEW_WIDTH}px`,
          minHeight: `${FIXED_CARD_PREVIEW_HEIGHT}px`,
          minWidth: `${FIXED_CARD_PREVIEW_WIDTH}px`,
          width: `${FIXED_CARD_PREVIEW_WIDTH}px`,
        },
        width: FIXED_CARD_PREVIEW_WIDTH,
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
      posthog.capture('build_card_download', {
        character_id: state.characterId,
        character_name: selected?.character.name ?? null,
        weapon_id: state.weaponId,
        sequence: state.sequence,
      });
      toastSuccess('Build card downloaded.');
    } catch (e) {
      posthog.captureException(e);
      toastError('Failed to download build card.');
      console.error('Download failed:', e);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, selected, state.characterId, state.weaponId, state.sequence, toastError, toastSuccess]);

  const handleResetBuild = useCallback(() => {
    setIsResetDialogOpen(true);
  }, []);

  const handleOpenSaveModal = useCallback(() => {
    setIsSaveModalOpen(true);
  }, []);

  const handleToggleArtEditMode = useCallback(() => {
    setArtState((prev) => {
      const current = prev.ownerCharacterId === state.characterId ? prev : createDefaultArtState(state.characterId);
      return { ...current, isEditMode: !current.isEditMode };
    });
  }, [state.characterId]);

  const handleGenerateCard = useCallback(() => {
    setIsCardGenerated(true);
    posthog.capture('build_card_generate', {
      character_id: state.characterId,
      character_name: selected?.character.name ?? null,
      weapon_id: state.weaponId,
      sequence: state.sequence,
    });
  }, [selected?.character.name, state.characterId, state.sequence, state.weaponId]);

  const handleViewRanking = useCallback(() => {
    if (!leaderboardLink) return;
    posthog.capture('leaderboard_open_from_editor', {
      character_id: state.characterId,
      weapon_id: state.weaponId,
      sequence: state.sequence,
    });
    router.push(leaderboardLink.href);
  }, [leaderboardLink, router, state.characterId, state.sequence, state.weaponId]);

  const handleCustomArtUpload = useCallback(async (file: File) => {
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toastError('Unsupported image type. Use PNG, JPG, or WEBP.');
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
    setArtState({
      customUrl: dataUrl,
      isEditMode: activeArtState.isEditMode,
      ownerCharacterId: state.characterId,
      splashVariant: 'normal',
      sourceMode: 'custom',
      transform: { x: 0, y: 0, scale: autoScale },
    });
    toastSuccess('Custom card art applied.');
  }, [activeArtState.isEditMode, state.characterId, toastError, toastSuccess]);

  const handleRemoveCustomArt = useCallback(() => {
    clearArtState();
  }, [clearArtState]);

  const handleUseSplashArt = useCallback(async () => {
    const characterId = selected?.character.id;
    const stateCharacterId = state.characterId;
    if (!characterId || !stateCharacterId) return;

    if (activeArtState.sourceMode === 'splash') {
      setSplashDisabledIds((prev) => {
        const next = new Set(prev);
        next.add(stateCharacterId);
        return next;
      });
      clearArtState();
      return;
    }

    const splash = await resolveSplashCardArt(
      String(characterId),
      selected.character.legacyId ?? null,
      selected.isRover,
      { variant: selectedSplashVariant },
    );

    if (!splash) {
      toastError('Splash image not found for this character.');
      console.error('Splash image load failed. Tried:', getSplashUrlCandidates(
        String(characterId),
        selected.character.legacyId ?? null,
        selected.isRover,
        { variant: selectedSplashVariant },
      ));
      return;
    }

    customArtBlobRef.current = null;
    setSplashDisabledIds((prev) => {
      const next = new Set(prev);
      next.delete(stateCharacterId);
      return next;
    });
    setArtState({
      customUrl: splash.url,
      isEditMode: true,
      ownerCharacterId: stateCharacterId,
      splashVariant: selectedSplashVariant,
      sourceMode: 'splash',
      transform: splash.transform,
    });
  }, [
    activeArtState.sourceMode,
    clearArtState,
    selected,
    selectedSplashVariant,
    state.characterId,
    toastError,
  ]);

  const handleResetArtTransform = useCallback(async () => {
    if (artSourceMode === 'splash' && selected) {
      const splash = await resolveSplashCardArt(
        String(selected.character.id),
        selected.character.legacyId ?? null,
        selected.isRover,
        { variant: activeArtState.splashVariant },
      );
      if (splash) {
        setArtTransform(splash.transform);
        return;
      }
    }
    setArtTransform(DEFAULT_CARD_ART_TRANSFORM);
  }, [
    activeArtState.splashVariant,
    artSourceMode,
    selected,
    setArtTransform,
  ]);

  const handleNudgeArt = useCallback((dx: number, dy: number) => {
    setArtTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
  }, [setArtTransform]);

  const handleZoomArt = useCallback((delta: number) => {
    setArtTransform(prev => {
      const next = Number((prev.scale + delta).toFixed(2));
      const clamped = Math.max(MIN_ART_ZOOM, Math.min(MAX_ART_ZOOM, next));
      return { ...prev, scale: clamped };
    });
  }, [setArtTransform]);

  return (
    <div className="mx-auto flex max-w-360 min-w-0 flex-col overflow-x-clip">
      {/* Action Bar */}
      <div className="hidden md:flex md:justify-end">
        <BuildActionBar
          containerRef={actionBarRef}
          isDirty={state.isDirty}
          onSave={handleOpenSaveModal}
          onReset={handleResetBuild}
        />
      </div>

      {/* Portal: compact nav toolbar */}
      {portalTarget && createPortal(
        isPhoneViewport ? (
          <div className="flex items-center">
            <BuildActionBar
              compact
              isDirty={state.isDirty}
              onSave={handleOpenSaveModal}
              onReset={handleResetBuild}
            />
          </div>
        ) : (
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
          </AnimatePresence>
        ),
        portalTarget
      )}

      {/* Resonator */}
      <div className="flex min-w-0 flex-col">
        <div className="flex justify-start">
          <CharacterSelector className="rounded-b-none border-b-0" />
        </div>

        <div className="select-none rounded-lg rounded-tl-none border border-border bg-background-secondary p-3 md:p-4">
          {selected ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[auto_auto_1fr] md:grid-rows-[28rem_auto] md:gap-x-6 md:gap-y-3">
                  {/* Row 1, Col 1: Portrait */}
                  <div className="relative order-1 w-full md:col-start-1 md:row-start-1 md:h-full">
                    <img
                      src={selected.banner}
                      alt={t(selected.nameI18n)}
                      className="pointer-events-none mx-auto h-auto w-full max-w-70 rounded-lg object-contain md:h-full md:w-auto md:max-w-none"
                    />
                    {selected.isRover && (
                      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                        {ROVER_ELEMENTS.map((el) => {
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
                                  ? ROVER_ELEMENT_ACTIVE_CLASS[el]
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
                  <div className="relative order-3 flex min-w-0 flex-col items-center gap-4 overflow-visible md:col-start-2 md:row-start-1 md:items-stretch md:justify-between md:overflow-hidden">
                    {selected.character.sequenceIcon && (
                      <SequenceSelector
                        compact={isPhoneViewport}
                        sequenceIconUrl={selected.character.sequenceIcon}
                        current={state.sequence}
                        onChange={setSequence}
                      />
                    )}

                    <WeaponSelector compact={isPhoneViewport} />
                  </div>

                  {/* Row 2, Col 1: Character Level */}
                  <div className="order-2 min-w-0 md:col-start-1 md:row-start-2">
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
                    <div className="order-4 min-w-0 md:col-start-2 md:row-start-2">
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
                  <div className="order-5 min-w-0 overflow-hidden md:col-start-3 md:row-span-2">
                    <ForteGroup
                      compact={isPhoneViewport}
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
      <div className="mt-4 flex min-w-0 flex-col">
        <div className="flex justify-end">
          <EchoCostBadge className="rounded-b-none border-b-0" />
        </div>
        <div className="rounded-lg rounded-tr-none border border-border bg-background-secondary p-3 md:p-4">
          <EchoGrid />
        </div>
      </div>


      {/* Build Card */}
      <div className="mt-8 flex min-w-0 flex-col">
        <div className="relative flex min-w-0 flex-col items-stretch gap-3 md:flex-row md:items-start">
          <BuildCardOptions
            className={isCardGenerated ? 'md:rounded-b-none md:border-b-0' : ''}
            isSplashArtActive={isSplashArtActive}
            onChange={setCardOptions}
            onUseSplashArt={handleUseSplashArt}
          />
          <button
            onClick={handleGenerateCard}
            className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold tracking-wide text-background transition-all hover:brightness-110 hover:shadow-[0_0_16px_rgba(var(--color-accent),0.4)] active:scale-[0.97] lg:absolute lg:left-1/2 lg:w-auto lg:-translate-x-1/2"
          >
            Generate
          </button>
        </div>
            {isCardGenerated && (
              <>
                <div className="min-w-0 pt-4 md:pt-0">
                  {isPhoneViewport ? (
                    <div className="scrollbar-thin overflow-x-auto overflow-y-hidden pb-1 [--scrollbar-height:2px] [--scrollbar-width:6px]">
                      <div style={{ width: FIXED_CARD_PREVIEW_WIDTH, minWidth: FIXED_CARD_PREVIEW_WIDTH }}>
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
                      </div>
                    </div>
                  ) : (
                    <CardScaler
                      ref={cardRef}
                      className="pt-0"
                      designHeight={FIXED_CARD_PREVIEW_HEIGHT}
                      designWidth={FIXED_CARD_PREVIEW_WIDTH}
                    >
                        <BuildCard
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
                    </CardScaler>
                  )}
                </div>
                <BuildCardActionPanel
                  isArtEditMode={isArtEditMode}
                  onToggleArtEditMode={handleToggleArtEditMode}
                  isDownloading={isDownloading}
                  onDownload={handleDownload}
                  artTransform={artTransform}
                  artSourceMode={artSourceMode}
                  onZoom={handleZoomArt}
                  onNudge={handleNudgeArt}
                  onResetArtTransform={handleResetArtTransform}
                  onRemoveCustomArt={handleRemoveCustomArt}
                  onViewRanking={leaderboardLink ? handleViewRanking : undefined}
                />
              </>
            )}
      </div>

      {/* Rank Simulation — on-demand theoretical rank for the current build, never submitted */}
      <SimulateRankPanel />

      <SaveBuildModal
        key={`${isSaveModalOpen ? 'open' : 'closed'}-${state.characterId}`}
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={(build) => toastSuccess(`Saved "${build.name}".`)}
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
          setIsResetDialogOpen(false);
        }}
      />

    </div>
  );
};
