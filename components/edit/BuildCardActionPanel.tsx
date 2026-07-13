'use client';

import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Download, Minus, Pencil, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { ART_ZOOM_STEP, CardArtSourceMode, CardArtTransform, MAX_ART_ZOOM, MIN_ART_ZOOM } from '@/lib/cardArt';

const ART_NUDGE_STEP = 12;

interface BuildCardActionPanelProps {
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
  onViewRanking?: () => void;
}

export const BuildCardActionPanel: React.FC<BuildCardActionPanelProps> = ({
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
  onViewRanking,
}) => {
  return (
    <div className="flex justify-start md:pl-12">
      <div className="flex w-full flex-col rounded-lg border border-border bg-background md:w-auto md:rounded-t-none md:border-t-0">
        <div className="flex flex-wrap items-center gap-2 p-3 md:gap-3">
          <button
            onClick={onToggleArtEditMode}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              isArtEditMode
                ? 'border-accent/70 bg-accent/15 text-accent'
                : 'border-border bg-background-secondary text-text-primary hover:border-accent/60'
            }`}
          >
            <Pencil size={14} />
            {isArtEditMode ? 'Done' : 'Edit'}
          </button>
          <button
            onClick={onDownload}
            disabled={isDownloading}
            className="group relative flex items-center gap-2 overflow-hidden rounded-lg border border-accent/65 bg-accent px-5 py-2 text-sm font-semibold text-background transition-all duration-300 hover:brightness-110 disabled:cursor-wait disabled:opacity-50"
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
          {onViewRanking && (
            <button
              onClick={onViewRanking}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent/60"
            >
              <Trophy size={14} />
              View Ranking
            </button>
          )}
        </div>

        {isArtEditMode && (
          <div className="border-t border-border px-3 py-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1 md:gap-2">
                <span className="text-sm font-medium text-text-primary/80">Zoom</span>
                <button
                  onClick={() => onZoom(-ART_ZOOM_STEP)}
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
                  onClick={() => onZoom(ART_ZOOM_STEP)}
                  disabled={artTransform.scale >= MAX_ART_ZOOM}
                  className="rounded-md border border-border bg-background-secondary px-2 py-1 text-text-primary hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  +
                </button>

                <button
                  onClick={onRemoveCustomArt}
                  disabled={artSourceMode !== 'custom'}
                  className="flex items-center gap-2 rounded-md border border-border bg-background-secondary px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:border-red-400/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={12} />
                  Remove Custom
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
                  <span />
                  <button
                    onClick={() => onNudge(0, -ART_NUDGE_STEP)}
                    className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <span />
                  <button
                    onClick={() => onNudge(-ART_NUDGE_STEP, 0)}
                    className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    onClick={onResetArtTransform}
                    className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                    title="Reset position and zoom"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => onNudge(ART_NUDGE_STEP, 0)}
                    className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                  >
                    <ArrowRight size={14} />
                  </button>
                  <span />
                  <button
                    onClick={() => onNudge(0, ART_NUDGE_STEP)}
                    className="rounded-md border border-border bg-background-secondary p-2 text-text-primary hover:border-accent/60"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <span />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
