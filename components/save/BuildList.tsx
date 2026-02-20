'use client';

import React, { useMemo } from 'react';
import { Trash2, Copy, Download, Calendar, User } from 'lucide-react';
import { SavedBuild } from '@/lib/build';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AnimatePresence, motion } from 'motion/react';
import { BuildProvider } from '@/contexts/BuildContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { BuildCard } from '@/components/build/BuildCard';

interface BuildListProps {
  builds: SavedBuild[];
  onSelect?: (build: SavedBuild) => void;
  onLoad?: (build: SavedBuild) => void;
  onDelete?: (build: SavedBuild) => void;
  onDuplicate?: (build: SavedBuild) => void;
  onExport?: (build: SavedBuild) => void;
  selectedBuildId?: string | null;
  emptyMessage?: string;
}

interface BuildItemProps {
  build: SavedBuild;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect?: () => void;
  onLoad?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onExport?: () => void;
}

const BuildItem: React.FC<BuildItemProps> = ({
  build,
  isSelected,
  isExpanded,
  onSelect,
  onLoad,
  onDelete,
  onDuplicate,
  onExport
}) => {
  const { getCharacter, getWeapon } = useGameData();
  const { t } = useLanguage();

  const formattedDate = useMemo(() => {
    try {
      const date = new Date(build.date);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  }, [build.date]);

  const character = getCharacter(build.state.characterId);
  const weapon = getWeapon(build.state.weaponId);
  const characterName = character
    ? t(character.nameI18n ?? { en: character.name })
    : build.state.characterId || 'No Character';
  const characterLevel = build.state.characterLevel || 1;
  const weaponName = weapon
    ? t(weapon.nameI18n ?? { en: weapon.name })
    : build.state.weaponId;

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className={`group relative rounded-lg border p-3 transition-all ${
        onSelect
          ? isSelected
            ? 'cursor-pointer border-accent bg-accent/10'
            : 'cursor-pointer border-border bg-background hover:border-accent/50 hover:bg-background-secondary'
          : 'border-border bg-background hover:border-accent/50 hover:bg-background-secondary'
      }`}
      onClick={onSelect}
    >
      {/* Build Info */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate pr-2">
            {build.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-text-primary/70">
            <span className="flex items-center gap-1">
              <User size={14} />
              {characterName} Lv.{characterLevel}
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={onLoad ? 'flex items-center gap-1' : 'flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'}>
          {onLoad && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLoad();
              }}
              className="cursor-pointer rounded-lg border border-accent bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
              title="Load build"
            >
              Load
            </button>
          )}
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="p-1.5 rounded text-text-primary/70 hover:text-text-primary hover:bg-border transition-colors"
              title="Duplicate build"
            >
              <Copy size={16} />
            </button>
          )}
          {onExport && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport();
              }}
              className="p-1.5 rounded text-text-primary/70 hover:text-text-primary hover:bg-border transition-colors"
              title="Export build"
            >
              <Download size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 rounded text-text-primary/70 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Delete build"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Build Stats Preview */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {build.state.sequence > 0 && (
          <span className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">
            S{build.state.sequence}
          </span>
        )}
        {build.state.weaponId && (
          <span className="px-2 py-0.5 text-xs rounded bg-border text-text-primary/70">
            {weaponName} R{build.state.weaponRank}
          </span>
        )}
        {build.state.echoPanels.filter(p => p.id).length > 0 && (
          <span className="px-2 py-0.5 text-xs rounded bg-border text-text-primary/70">
            {build.state.echoPanels.filter(p => p.id).length}/5 Echoes
          </span>
        )}
        {build.state.verified && (
          <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">
            Verified
          </span>
        )}
      </div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-primary/50">
                Build Preview
              </div>
              <BuildProvider initialState={build.state} persistDraft={false}>
                <StatsProvider>
                  <BuildCard />
                </StatsProvider>
              </BuildProvider>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const BuildList: React.FC<BuildListProps> = ({
  builds,
  onSelect,
  onLoad,
  onDelete,
  onDuplicate,
  onExport,
  selectedBuildId,
  emptyMessage = 'No saved builds yet'
}) => {
  if (builds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-primary/50">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <motion.div layout className="space-y-2">
      {builds.map((build) => (
        <BuildItem
          key={build.id}
          build={build}
          isSelected={selectedBuildId === build.id}
          isExpanded={selectedBuildId === build.id}
          onSelect={onSelect ? () => onSelect(build) : undefined}
          onLoad={onLoad ? () => onLoad(build) : undefined}
          onDelete={onDelete ? () => onDelete(build) : undefined}
          onDuplicate={onDuplicate ? () => onDuplicate(build) : undefined}
          onExport={onExport ? () => onExport(build) : undefined}
        />
      ))}
    </motion.div>
  );
};

export default BuildList;
