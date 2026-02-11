'use client';

import React, { useCallback, useState } from 'react';
import { Save, Download, Upload, RotateCcw, Share2 } from 'lucide-react';
import { useGameData, useBuild } from '@/contexts';
import { CharacterSelector, CharacterInfo } from '@/components/character';
import { WeaponInfo } from '@/components/weapon';
import { ForteGroup } from '@/components/forte';
import { EchoGrid } from '@/components/echo';
import { StatsDisplay } from '@/components/stats';

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
  const [showCharacterSelector, setShowCharacterSelector] = useState(false);
  const { getCharacter } = useGameData();
  const {
    state,
    setCharacter,
    setNodeStates,
    setForteLevels,
    maxAllFortes,
    resetFortes,
    resetBuild
  } = useBuild();

  const selectedCharacter = getCharacter(state.characterState.id);
  const currentElement = state.characterState.element || 'Havoc';

  // Handle character selection
  const handleCharacterSelect = useCallback((characterId: string) => {
    const character = getCharacter(characterId);
    if (character) {
      const isRover = character.name.startsWith('Rover');
      setCharacter(characterId, isRover ? 'Havoc' : undefined);
    }
    setShowCharacterSelector(false);
  }, [getCharacter, setCharacter]);

  // Handle node state changes
  const handleNodeChange = useCallback((nodeStates: Record<string, Record<string, boolean>>) => {
    setNodeStates(nodeStates);
  }, [setNodeStates]);

  // Handle forte level changes
  const handleLevelChange = useCallback((levels: typeof state.forteLevels) => {
    setForteLevels(levels);
  }, [setForteLevels]);

  // Handle max all fortes
  const handleMaxAll = useCallback(() => {
    maxAllFortes();
  }, [maxAllFortes]);

  // Handle reset fortes
  const handleResetFortes = useCallback(() => {
    resetFortes();
  }, [resetFortes]);

  // Handle reset entire build
  const handleResetBuild = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the entire build? This cannot be undone.')) {
      resetBuild();
    }
  }, [resetBuild]);

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave();
    } else {
      // Default save behavior - could be implemented later
      console.log('Save clicked - implement save functionality');
    }
  }, [onSave]);

  // Handle load
  const handleLoad = useCallback(() => {
    if (onLoad) {
      onLoad();
    } else {
      // Default load behavior - could be implemented later
      console.log('Load clicked - implement load functionality');
    }
  }, [onLoad]);

  // Handle export
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
    } else {
      // Default export behavior - could be implemented later
      console.log('Export clicked - implement export functionality');
    }
  }, [onExport]);

  // Handle share
  const handleShare = useCallback(() => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior - could be implemented later
      console.log('Share clicked - implement share functionality');
    }
  }, [onShare]);

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-background-secondary p-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-text-primary">Build Editor</h1>
          {state.isDirty && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
              Unsaved
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            <Save size={16} />
            <span>Save</span>
          </button>

          {/* Load Button */}
          <button
            onClick={handleLoad}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40"
          >
            <Upload size={16} />
            <span>Load</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40"
          >
            <Download size={16} />
            <span>Export</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-text-primary/40"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleResetBuild}
            className="flex items-center gap-2 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left Column: Character + Weapon */}
        <div className="flex flex-col gap-6">
          {/* Character Section */}
          <div className="rounded-lg border border-border bg-background-secondary p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-text-primary">Resonator</h2>
              <button
                onClick={() => setShowCharacterSelector(true)}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary/80 transition-colors hover:border-text-primary/40"
              >
                {selectedCharacter ? 'Change' : 'Select'}
              </button>
            </div>

            {selectedCharacter ? (
              <CharacterInfo />
            ) : (
              <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border py-8">
                <button
                  onClick={() => setShowCharacterSelector(true)}
                  className="text-text-primary/60 hover:text-text-primary transition-colors"
                >
                  Click to select a resonator
                </button>
              </div>
            )}
          </div>

          {/* Weapon Section */}
          {selectedCharacter && <WeaponInfo />}

          {/* Stats Display - shown on mobile/tablet at bottom of left column */}
          <div className="xl:hidden">
            <StatsDisplay />
          </div>
        </div>

        {/* Center Column: Forte + Echoes */}
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Forte Section */}
          {selectedCharacter && (
            <ForteGroup
              character={selectedCharacter}
              elementValue={currentElement}
              nodeStates={state.nodeStates}
              levels={state.forteLevels}
              onNodeChange={handleNodeChange}
              onLevelChange={handleLevelChange}
              onMaxAll={handleMaxAll}
              onReset={handleResetFortes}
            />
          )}

          {/* Echo Grid */}
          <EchoGrid />
        </div>

        {/* Right Column: Stats Display (desktop only) */}
        <div className="hidden xl:col-span-3 xl:block">
          <StatsDisplay />
        </div>
      </div>

      {/* Character Selector Modal */}
      {showCharacterSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowCharacterSelector(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg border border-border bg-background-secondary p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Select Resonator</h2>
              <button
                onClick={() => setShowCharacterSelector(false)}
                className="rounded p-1 text-text-primary/60 transition-colors hover:bg-background hover:text-text-primary"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M5 5L15 15M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <CharacterSelector />
          </div>
        </div>
      )}
    </div>
  );
};

export default BuildEditor;
