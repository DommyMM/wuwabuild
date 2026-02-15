'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
import { Save, Download, Upload, RotateCcw, Share2 } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useBuild } from '@/contexts/BuildContext';
import { CharacterSelector } from '@/components/character/CharacterSelector';

interface BuildEditorProps {
  className?: string;
  onSave?: () => void;
  onLoad?: () => void;
  onExport?: () => void;
  onShare?: () => void;
}

export const BuildEditor: React.FC<BuildEditorProps> = ({
  className = '',
  onSave,
  onLoad,
  onExport,
  onShare
}) => {
  const [isActionBarVisible, setIsActionBarVisible] = useState(true);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement>(null);

  const { getCharacter } = useGameData();
  const { state, resetBuild } = useBuild();

  const { scrollY } = useScroll();

  // Find the navbar portal target on mount
  useEffect(() => {
    setPortalTarget(document.getElementById('nav-toolbar-portal'));
  }, []);

  // Track action bar visibility via scroll position + bounding rect
  useMotionValueEvent(scrollY, 'change', () => {
    const el = actionBarRef.current;
    if (!el) return;
    setIsActionBarVisible(el.getBoundingClientRect().bottom > 70);
  });

  const selectedCharacter = getCharacter(state.characterState.id);

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
          <button
            onClick={onSave}
            className="flex items-center gap-2 rounded-lg border border-accent bg-accent/10 p-2 md:px-4 md:py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <Save size={16} />
            <span className="hidden md:inline">Save</span>
          </button>
          <button
            onClick={onLoad}
            className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 md:px-4 md:py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40"
          >
            <Upload size={16} />
            <span className="hidden md:inline">Load</span>
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 md:px-4 md:py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40"
          >
            <Download size={16} />
            <span className="hidden md:inline">Export</span>
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-2 rounded-lg border border-border bg-background p-2 md:px-4 md:py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40"
          >
            <Share2 size={16} />
            <span className="hidden md:inline">Share</span>
          </button>
          <button
            onClick={handleResetBuild}
            className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 md:px-4 md:py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            <RotateCcw size={16} />
            <span className="hidden md:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Portal: Compact action buttons in navbar when action bar scrolls out of view */}
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
                <span className="hidden md:inline rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400">
                  Unsaved
                </span>
              )}
              <button
                onClick={onSave}
                className="flex items-center gap-1.5 rounded-md border border-accent bg-accent/10 p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              >
                <Save size={14} />
                <span className="hidden md:inline">Save</span>
              </button>
              <button
                onClick={onLoad}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-text-primary/40"
              >
                <Upload size={14} />
                <span className="hidden md:inline">Load</span>
              </button>
              <button
                onClick={onExport}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-text-primary/40"
              >
                <Download size={14} />
                <span className="hidden md:inline">Export</span>
              </button>
              <button
                onClick={onShare}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-text-primary/40"
              >
                <Share2 size={14} />
                <span className="hidden md:inline">Share</span>
              </button>
              <button
                onClick={handleResetBuild}
                className="flex items-center gap-1.5 rounded-md border border-red-500/50 bg-red-500/10 p-1.5 md:px-3 md:py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <RotateCcw size={14} />
                <span className="hidden md:inline">Reset</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        portalTarget
      )}

      {/* Resonator */}
      <div className="rounded-lg border border-border bg-background-secondary p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-text-primary">Resonator</h2>
          <CharacterSelector />
        </div>
      </div>

    </div>
  );
};

export default BuildEditor;
