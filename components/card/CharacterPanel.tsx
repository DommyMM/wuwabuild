'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SelectedCharacter } from '@/hooks/useSelectedCharacter';
import { ART_ZOOM_STEP, MAX_ART_ZOOM, MIN_ART_ZOOM, CardArtSourceMode, CardArtTransform } from '@/lib/cardArt';
import { getAlternateSkin } from '@/lib/character';

interface CharacterPanelProps {
  selected: SelectedCharacter;
  tintClass: string;
  username: string;
  uid: string;
  artSource: string;
  onArtSourceChange: (value: string) => void;
  useAltSkin?: boolean;
  artTransform: CardArtTransform;
  artSourceMode: CardArtSourceMode;
  customArtUrl: string | null;
  isArtEditMode: boolean;
  onCustomArtUpload: (file: File) => void;
  onArtTransformChange: (next: CardArtTransform) => void;
}

export const CharacterPanel: React.FC<CharacterPanelProps> = ({
  selected,
  tintClass,
  username,
  uid,
  artSource,
  onArtSourceChange,
  useAltSkin = false,
  artTransform,
  artSourceMode,
  customArtUrl,
  isArtEditMode,
  onCustomArtUpload,
  onArtTransformChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const artEditOverlayRef = useRef<HTMLDivElement>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [isDraggingArt, setIsDraggingArt] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingPositionRef = useRef<{ x: number; y: number } | null>(null);
  const scaleRef = useRef(artTransform.scale);
  const positionRef = useRef({ x: artTransform.x, y: artTransform.y });
  const altBanner = getAlternateSkin(selected.character)?.icon.banner;
  const baseBannerUrl = useAltSkin && altBanner ? altBanner : selected.banner;
  const hasEditableArt = artSourceMode !== 'default' && Boolean(customArtUrl);
  const bannerUrl = hasEditableArt && customArtUrl ? customArtUrl : baseBannerUrl;

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    onCustomArtUpload(file);
  };

  useEffect(() => {
    scaleRef.current = artTransform.scale;
  }, [artTransform.scale]);

  useEffect(() => {
    positionRef.current = { x: artTransform.x, y: artTransform.y };
  }, [artTransform.x, artTransform.y]);

  const flushPendingPosition = useCallback(() => {
    frameRef.current = null;
    const pending = pendingPositionRef.current;
    if (!pending) return;
    pendingPositionRef.current = null;
    onArtTransformChange({
      x: pending.x,
      y: pending.y,
      scale: scaleRef.current,
    });
  }, [onArtTransformChange]);

  const queuePositionUpdate = useCallback((x: number, y: number) => {
    pendingPositionRef.current = { x, y };
    if (frameRef.current != null) return;
    frameRef.current = requestAnimationFrame(flushPendingPosition);
  }, [flushPendingPosition]);

  const endDrag = useCallback((pointerId: number, target: HTMLElement) => {
    if (!dragRef.current || dragRef.current.pointerId !== pointerId) return;
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    dragRef.current = null;
    setIsDraggingArt(false);
  }, []);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isArtEditMode || !hasEditableArt || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: artTransform.x,
      baseY: artTransform.y,
    };
    setIsDraggingArt(true);
  }, [artTransform.x, artTransform.y, hasEditableArt, isArtEditMode]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = Math.round(drag.baseX + (event.clientX - drag.startX));
    const nextY = Math.round(drag.baseY + (event.clientY - drag.startY));
    queuePositionUpdate(nextX, nextY);
  }, [queuePositionUpdate]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    endDrag(event.pointerId, event.currentTarget);
  }, [endDrag]);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const overlay = artEditOverlayRef.current;
    if (!overlay || !isArtEditMode || !hasEditableArt) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const direction = event.deltaY < 0 ? 1 : -1;
      const nextScale = Math.max(
        MIN_ART_ZOOM,
        Math.min(MAX_ART_ZOOM, Number((scaleRef.current + direction * ART_ZOOM_STEP).toFixed(2))),
      );

      if (nextScale === scaleRef.current) return;

      scaleRef.current = nextScale;
      onArtTransformChange({
        x: positionRef.current.x,
        y: positionRef.current.y,
        scale: nextScale,
      });
    };

    overlay.addEventListener('wheel', handleWheel, { passive: false });
    return () => overlay.removeEventListener('wheel', handleWheel);
  }, [hasEditableArt, isArtEditMode, onArtTransformChange]);

  const dragOverlayClassName = useMemo(() => {
    if (isDropActive) return 'border-accent/85 bg-black/40';
    if (isDraggingArt) return 'border-accent/70 bg-black/32';
    return 'border-white/20 bg-black/18 hover:border-white/35 hover:bg-black/25';
  }, [isDraggingArt, isDropActive]);

  const imageStyle = useMemo<React.CSSProperties>(() => ({
    transform: `translate3d(${artTransform.x}px, ${artTransform.y}px, 0) scale(${artTransform.scale})`,
    transformOrigin: 'center bottom',
  }), [artTransform.scale, artTransform.x, artTransform.y]);
  const showIdentityWatermark = Boolean(username?.trim() || uid?.trim());
  const showArtSource = Boolean(artSource?.trim());

  return (
    <div className="relative w-3/10 shrink-0 self-stretch z-10 overflow-hidden rounded-r-[48px] shadow-[4px_0_15px_rgba(0,0,0,0.15)]">
      {/* Glass pane background */}
      <div className="character-pane-adaptive-bg absolute inset-0 border-r border-white/12 rounded-r-[48px] overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_-18px_24px_rgba(0,0,0,0.16)]">
        <div className={`absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t ${tintClass} opacity-40 mix-blend-screen pointer-events-none`} />
        <div className="character-pane-element-glow pointer-events-none absolute inset-0" />
      </div>

      {showIdentityWatermark && (
        <div className="absolute top-3 left-3 z-30 rounded-xl border border-white/16 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.6)_55%,rgba(0,0,0,0.82)_100%)] px-2.5 py-1.5 text-xs font-semibold text-white/88 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_3px_12px_rgba(0,0,0,0.42)]">
          {username?.trim() && (
            <div className="leading-none">{username.trim()}</div>
          )}
          {uid?.trim() && (
            <div className="mt-1 leading-none text-white/70">UID {uid.trim()}</div>
          )}
        </div>
      )}

      {showArtSource && (
        <div className="absolute bottom-3 left-3 z-30 rounded-xl border border-white/16 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.6)_55%,rgba(0,0,0,0.82)_100%)] px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_3px_12px_rgba(0,0,0,0.42)]">
          <input
            type="text"
            value={artSource}
            onChange={e => onArtSourceChange(e.target.value)}
            size={Math.max(1, artSource.length)}
            className="bg-transparent text-sm italic text-white/70 focus:outline-none"
          />
        </div>
      )}

      {/* Character banner */}
      <div className="absolute inset-0 z-20 pointer-events-none flex items-end justify-center overflow-hidden">
        <img
          src={bannerUrl}
          alt={selected.displayName}
          className="h-full min-h-full w-auto max-w-none object-contain"
          style={imageStyle}
          draggable={false}
          fetchPriority="high"
        />
      </div>

      {isArtEditMode && (
        <>
          {!hasEditableArt ? (
            <button
              type="button"
              className={`absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed rounded-r-[48px] transition-colors ${
                isDropActive
                  ? 'border-accent/85 bg-black/55'
                  : 'border-white/30 bg-black/45 hover:bg-black/55 hover:border-white/50'
              }`}
              onClick={openFilePicker}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDropActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDropActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDropActive(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                onCustomArtUpload(file);
              }}
            >
              <span className="max-w-[220px] text-center text-sm font-medium text-white/90">
                Drag and Drop or Click to Upload Image
              </span>
            </button>
          ) : (
            <div
              ref={artEditOverlayRef}
              className={`absolute inset-0 z-40 rounded-r-[48px] border border-dashed transition-colors ${dragOverlayClassName} ${isDraggingArt ? 'cursor-grabbing' : 'cursor-grab'}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDropActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDropActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDropActive(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                onCustomArtUpload(file);
              }}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  );
};
