'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Trash2, Copy, Download, Calendar, User, Pencil, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { SavedBuild } from '@/lib/build';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { BuildProvider } from '@/contexts/BuildContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { BuildCard } from '@/components/build/BuildCard';
import { calculateCV } from '@/lib/calculations/cv';
import { ELEMENT_SETS } from '@/lib/echo';
import { getBuildSetCounts } from '@/lib/calculations/setSummary';

interface BuildListProps {
  builds: SavedBuild[];
  onSelect?: (build: SavedBuild) => void;
  onLoad?: (build: SavedBuild) => void;
  onDelete?: (build: SavedBuild) => void;
  onDuplicate?: (build: SavedBuild) => void;
  onExport?: (build: SavedBuild) => void;
  onRename?: (build: SavedBuild, name: string) => void;
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
  onRename?: (name: string) => void;
}

const BuildItem: React.FC<BuildItemProps> = ({
  build,
  isSelected,
  isExpanded,
  onSelect,
  onLoad,
  onDelete,
  onDuplicate,
  onExport,
  onRename,
}) => {
  const { getCharacter, getWeapon, getEcho, getFetterByElement } = useGameData();
  const { t } = useLanguage();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(build.name);

  const beginRename = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setNameDraft(build.name);
    setIsEditingName(true);
  }, [build.name]);

  const cancelRename = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    setNameDraft(build.name);
    setIsEditingName(false);
  }, [build.name]);

  const submitRename = useCallback((e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.stopPropagation();
    const trimmedName = nameDraft.trim();
    if (!trimmedName) {
      setNameDraft(build.name);
      setIsEditingName(false);
      return;
    }
    if (trimmedName !== build.name) {
      onRename?.(trimmedName);
    }
    setIsEditingName(false);
  }, [build.name, nameDraft, onRename]);

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitRename();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  }, [cancelRename, submitRename]);

  const formattedDate = useMemo(() => {
    try {
      const date = new Date(build.date);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
  const buildCV = calculateCV(build.state.echoPanels);
  const setSummaries = useMemo(() => (
    getBuildSetCounts(build.state.echoPanels, getEcho).map(({ element, count }) => {
      const fetter = getFetterByElement(element);
      const threshold = fetter?.pieceCount ?? 2;
      return {
        key: element,
        count,
        isActive: count >= threshold,
        icon: fetter?.icon ?? '',
        name: fetter ? t(fetter.name) : ELEMENT_SETS[element],
      };
    })
  ), [build.state.echoPanels, getEcho, getFetterByElement, t]);

  return (
    <div
      className={`group relative rounded-lg border p-3 transition-all ${
        onSelect
          ? isSelected
            ? 'cursor-pointer border-accent bg-accent/10'
            : 'cursor-pointer border-border bg-background hover:border-accent/50 hover:bg-background-secondary'
          : 'border-border bg-background hover:border-accent/50 hover:bg-background-secondary'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 pr-2">
            {isEditingName ? (
              <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={handleRenameKeyDown}
                maxLength={100}
                autoFocus
                className="h-7 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm font-medium text-text-primary focus:border-accent/60 focus:outline-none"
              />
            ) : (
              <h3 className="truncate font-medium text-text-primary">
                {build.name}
              </h3>
            )}

            {onRename && !isEditingName && (
              <button
                onClick={beginRename}
                className="rounded p-1 text-text-primary/60 transition-colors hover:bg-border hover:text-text-primary"
                title="Rename build"
                aria-label="Rename build"
              >
                <Pencil size={14} />
              </button>
            )}

            {onRename && isEditingName && (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={submitRename}
                  className="rounded p-1 text-green-400/80 transition-colors hover:bg-green-500/10 hover:text-green-300"
                  title="Save name"
                  aria-label="Save name"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={cancelRename}
                  className="rounded p-1 text-text-primary/70 transition-colors hover:bg-border hover:text-text-primary"
                  title="Cancel rename"
                  aria-label="Cancel rename"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-sm text-text-primary/70">
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

        <div className={onLoad ? 'flex items-center gap-1' : 'flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'}>
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
              className="rounded p-1.5 text-text-primary/70 transition-colors hover:bg-border hover:text-text-primary"
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
              className="rounded p-1.5 text-text-primary/70 transition-colors hover:bg-border hover:text-text-primary"
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
              className="rounded p-1.5 text-text-primary/70 transition-colors hover:bg-red-400/10 hover:text-red-400"
              title="Delete build"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
          CV {buildCV.toFixed(1)}
        </span>
        {build.state.sequence > 0 && (
          <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">
            S{build.state.sequence}
          </span>
        )}
        {build.state.weaponId && (
          <span className="rounded bg-border px-2 py-0.5 text-xs text-text-primary/70">
            {weaponName} R{build.state.weaponRank}
          </span>
        )}
        {build.state.echoPanels.filter((panel) => panel.id).length > 0 && (
          <span className="rounded bg-border px-2 py-0.5 text-xs text-text-primary/70">
            {build.state.echoPanels.filter((panel) => panel.id).length}/5 Echoes
          </span>
        )}
        {build.state.verified && (
          <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
            Verified
          </span>
        )}
        {setSummaries.slice(0, 3).map((setSummary) => (
          <span
            key={setSummary.key}
            className={setSummary.isActive
              ? 'inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent'
              : 'inline-flex items-center gap-1 rounded-md border border-border bg-background-secondary px-2 py-0.5 text-xs text-text-primary/70'}
          >
            {setSummary.icon && (
              <img
                src={setSummary.icon}
                alt=""
                className="h-3.5 w-3.5 object-contain"
              />
            )}
            {setSummary.name} {setSummary.count}pc
          </span>
        ))}
        {setSummaries.length > 3 && (
          <span className="text-xs text-text-primary/50">+{setSummaries.length - 3} more</span>
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
    </div>
  );
};

export const BuildList: React.FC<BuildListProps> = ({
  builds,
  onSelect,
  onLoad,
  onDelete,
  onDuplicate,
  onExport,
  onRename,
  selectedBuildId,
  emptyMessage = 'No saved builds yet',
}) => {
  if (builds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-primary/50">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
          onRename={onRename ? (name) => onRename(build, name) : undefined}
        />
      ))}
    </div>
  );
};
