'use client';

import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Minus, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { ART_ZOOM_STEP, CardArtSourceMode, CardArtTransform, MAX_ART_ZOOM, MIN_ART_ZOOM } from '@/lib/cardArt';

const ART_NUDGE_STEP = 12;

interface CardActionBarProps {
  isArtEditMode: boolean;
  onToggleArtEditMode: () => void;

  isDownloading: boolean;
  onDownload: () => void;

  artTransform: CardArtTransform;
  artSourceMode: CardArtSourceMode;
  onZoom: (delta: number) => void;
  onNudge: (dx: number, dy: number) => void;
  onResetArtTransform: () => void;
  onRemoveCustomArt: () => void;

  /** Extra buttons rendered after Download (e.g. ranking switcher). */
  extraActions?: React.ReactNode;
  /** Optional wrapper className override. Default places the bar at the left. */
  className?: string;
}

export const CardActionBar: React.FC<CardActionBarProps> = ({
  isArtEditMode,
  onToggleArtEditMode,
  isDownloading,
  onDownload,
  artTransform,
  artSourceMode,
  onZoom,
  onNudge,
  onResetArtTransform,
  onRemoveCustomArt,
  extraActions,
  className = 'flex flex-col',
}) => {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2 md:gap-3">
        <button
          onClick={onToggleArtEditMode}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            isArtEditMode
              ? 'bg-accent/15 text-accent'
              : 'bg-background-secondary text-text-primary hover:text-accent'
          }`}
        >
          <Pencil size={14} />
          {isArtEditMode ? 'Done' : 'Edit'}
        </button>
        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-background transition-all duration-300 hover:brightness-110 disabled:cursor-wait disabled:opacity-50"
        >
          <Download size={14} />
          {isDownloading ? (
            <span className="flex items-center gap-0.5">
              <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
              <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
              <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
            </span>
          ) : 'Download'}
        </button>
        {extraActions}
      </div>

      {isArtEditMode && (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-1 md:gap-2">
            <span className="text-sm font-medium text-text-primary/80">Zoom</span>
            <button
              onClick={() => onZoom(-ART_ZOOM_STEP)}
              disabled={artTransform.scale <= MIN_ART_ZOOM}
              className="rounded-md bg-background-secondary px-2 py-1 text-text-primary hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Minus size={12} />
            </button>
            <span className="min-w-14 rounded-md bg-background px-2.5 py-1 text-center text-sm font-semibold text-accent">
              {`${Math.round(artTransform.scale * 100)}%`}
            </span>
            <button
              onClick={() => onZoom(ART_ZOOM_STEP)}
              disabled={artTransform.scale >= MAX_ART_ZOOM}
              className="rounded-md bg-background-secondary px-2 py-1 text-text-primary hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              +
            </button>

            <button
              onClick={onRemoveCustomArt}
              disabled={artSourceMode !== 'custom'}
              className="flex items-center gap-2 rounded-md bg-background-secondary px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={12} />
              Remove Custom
            </button>
          </div>

          <div className="grid grid-cols-3 grid-rows-3 gap-1.5 self-start">
            <span />
            <button
              onClick={() => onNudge(0, -ART_NUDGE_STEP)}
              className="rounded-md bg-background-secondary p-2 text-text-primary hover:text-accent"
            >
              <ArrowUp size={14} />
            </button>
            <span />
            <button
              onClick={() => onNudge(-ART_NUDGE_STEP, 0)}
              className="rounded-md bg-background-secondary p-2 text-text-primary hover:text-accent"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              onClick={onResetArtTransform}
              className="rounded-md bg-background-secondary p-2 text-text-primary hover:text-accent"
              title="Reset position and zoom"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => onNudge(ART_NUDGE_STEP, 0)}
              className="rounded-md bg-background-secondary p-2 text-text-primary hover:text-accent"
            >
              <ArrowRight size={14} />
            </button>
            <span />
            <button
              onClick={() => onNudge(0, ART_NUDGE_STEP)}
              className="rounded-md bg-background-secondary p-2 text-text-primary hover:text-accent"
            >
              <ArrowDown size={14} />
            </button>
            <span />
          </div>
        </div>
      )}
    </div>
  );
};
