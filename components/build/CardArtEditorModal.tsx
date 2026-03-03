'use client';

import React, { useMemo, useRef } from 'react';
import { Upload, Trash2, RotateCcw } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useSelectedCharacter } from '@/hooks/useSelectedCharacter';
import { useToast } from '@/contexts/ToastContext';
import { CardArtSourceMode, CardArtTransform } from '@/lib/cardArt';

const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

interface CardArtEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  useAltSkin: boolean;
  artTransform: CardArtTransform;
  onTransformChange: (next: CardArtTransform) => void;
  artSourceMode: CardArtSourceMode;
  customArtUrl: string | null;
  onUpload: (file: File) => void;
  onRemoveCustom: () => void;
  onResetTransform: () => void;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
}

export const CardArtEditorModal: React.FC<CardArtEditorModalProps> = ({
  isOpen,
  onClose,
  onApply,
  useAltSkin,
  artTransform,
  onTransformChange,
  artSourceMode,
  customArtUrl,
  onUpload,
  onRemoveCustom,
  onResetTransform,
}) => {
  const selected = useSelectedCharacter();
  const { error: toastError } = useToast();
  const dragRef = useRef<DragState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseBannerUrl = useMemo(() => {
    if (!selected) return null;
    const altBanner = selected.character.skins?.find(s => s.icon.banner !== selected.banner)?.icon.banner;
    return useAltSkin && altBanner ? altBanner : selected.banner;
  }, [selected, useAltSkin]);

  const activeBannerUrl = artSourceMode === 'custom' && customArtUrl ? customArtUrl : baseBannerUrl;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toastError('Unsupported file type. Use PNG, JPG, or WEBP.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toastError('Image is too large. Maximum file size is 10MB.');
      return;
    }

    onUpload(file);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: artTransform.x,
      baseY: artTransform.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    onTransformChange({
      ...artTransform,
      x: Math.round(drag.baseX + deltaX),
      y: Math.round(drag.baseY + deltaY),
    });
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Card Art"
      fitContent
      contentClassName="w-full max-w-3xl"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative w-[240px] shrink-0 rounded-r-[32px] border border-border bg-black/25 p-2">
            <div
              className="relative aspect-[0.72/1] overflow-hidden rounded-r-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(0,0,0,0.28)_100%)]"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
              {activeBannerUrl ? (
                <img
                  src={activeBannerUrl}
                  alt={selected?.displayName ?? 'Character'}
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain select-none"
                  draggable={false}
                  style={{
                    transform: `translate3d(${artTransform.x}px, ${artTransform.y}px, 0) scale(${artTransform.scale})`,
                    transformOrigin: 'center bottom',
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-text-primary/50">
                  No character selected
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-text-primary/55">
              Drag preview to reposition artwork.
            </p>
          </div>

          <div className="flex min-w-[260px] flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleUploadClick}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent/60"
              >
                <Upload size={14} />
                {artSourceMode === 'custom' ? 'Replace Image' : 'Upload Image'}
              </button>
              <button
                onClick={onRemoveCustom}
                disabled={artSourceMode !== 'custom'}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
                Remove Custom
              </button>
              <button
                onClick={onResetTransform}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent/60"
              >
                <RotateCcw size={14} />
                Reset Position
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="rounded-lg border border-border bg-background-secondary p-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-text-primary/50">
                <span>Zoom</span>
                <span>{artTransform.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={2}
                step={0.01}
                value={artTransform.scale}
                onChange={e => onTransformChange({ ...artTransform, scale: Number(e.target.value) })}
                className="mt-2 w-full accent-accent"
              />
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-text-primary/60">
                <div className="rounded-md border border-border bg-background px-2 py-1.5">
                  X: {Math.round(artTransform.x)}
                </div>
                <div className="rounded-md border border-border bg-background px-2 py-1.5">
                  Y: {Math.round(artTransform.y)}
                </div>
                <div className="rounded-md border border-border bg-background px-2 py-1.5">
                  Mode: {artSourceMode}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-text-primary/75 transition-colors hover:border-text-primary/30 hover:text-text-primary"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="w-full rounded-xl bg-accent py-2 text-sm font-semibold text-background transition-colors hover:bg-accent-hover"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
};
