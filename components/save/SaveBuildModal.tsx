'use client';

import React, { useCallback, useState } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { saveBuild } from '@/lib/storage';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SavedBuild } from '@/lib/build';
import { calculateCV, calculateEchoSubstatCV } from '@/lib/calculations/cv';
import { ELEMENT_SETS } from '@/lib/echo';
import { getBuildSetCounts } from '@/lib/calculations/setSummary';
import { getEchoPaths } from '@/lib/paths';
import { ELEMENT_TINT_CLASS } from '@/lib/elementVisuals';

interface SaveBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (build: SavedBuild) => void;
  existingBuild?: SavedBuild | null;
  defaultName?: string;
}

export const SaveBuildModal: React.FC<SaveBuildModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingBuild,
  defaultName
}) => {
  const { state, getSavedState, markClean } = useBuild();
  const { getCharacter, getWeapon, getEcho, getFetterByElement } = useGameData();
  const { t } = useLanguage();
  const [name, setName] = useState(existingBuild?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const character = getCharacter(state.characterId);
  const weapon = getWeapon(state.weaponId);
  const characterName = character ? t(character.nameI18n ?? { en: character.name }) : null;
  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : null;
  const elementTintClass = character?.element ? (ELEMENT_TINT_CLASS[character.element] ?? '') : '';
  const totalCV = calculateCV(state.echoPanels);
  const filledEchoCount = state.echoPanels.filter((panel) => panel.id).length;
  const forteNodeCount = state.forte.reduce((total, [, top, middle]) => (
    total + (top ? 1 : 0) + (middle ? 1 : 0)
  ), 0);

  const echoSummaries = React.useMemo(() => (
    state.echoPanels.map((panel, index) => {
      const echo = panel.id ? getEcho(panel.id) : null;
      const echoElement = panel.selectedElement ?? echo?.elements?.[0];
      const fetter = echoElement ? getFetterByElement(echoElement) : null;
      return {
        key: `${panel.id ?? 'empty'}-${index}`,
        hasEcho: Boolean(panel.id && echo),
        icon: getEchoPaths(echo, panel.phantom),
        setIcon: fetter?.icon ?? '',
        mainStat: panel.stats.mainStat.type ?? null,
        cv: panel.id ? calculateEchoSubstatCV(panel) : 0,
      };
    })
  ), [getEcho, getFetterByElement, state.echoPanels]);

  const setSummaries = React.useMemo(() => (
    getBuildSetCounts(state.echoPanels, getEcho)
      .map(({ element, count }) => {
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
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return Number(b.isActive) - Number(a.isActive);
        return b.count - a.count;
      })
  ), [state.echoPanels, getEcho, getFetterByElement, t]);

  const visibleSets = setSummaries.slice(0, 3);
  const hiddenSetCount = Math.max(0, setSummaries.length - visibleSets.length);

  React.useEffect(() => {
    if (isOpen) {
      setName(existingBuild?.name || defaultName || '');
      setError(null);
    }
  }, [isOpen, existingBuild, defaultName]);

  const handleSave = useCallback(async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter a build name');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Build name must be 100 characters or less');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savedBuild = saveBuild({
        id: existingBuild?.id,
        name: trimmedName,
        state: getSavedState()
      });

      markClean();
      onSave?.(savedBuild);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save build');
    } finally {
      setIsSaving(false);
    }
  }, [name, existingBuild, getSavedState, markClean, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingBuild ? 'Update Build' : 'Save Build'}
      showCloseButton={false}
      fitContent
      contentClassName="w-full max-w-2xl"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="build-name" className="mb-2 block text-sm font-medium text-text-primary">
            Build Name
          </label>
          <input
            id="build-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter build name..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-text-primary placeholder-text-primary/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
            maxLength={100}
          />
          {error && (
            <p className="mt-1 text-sm text-red-400">{error}</p>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border bg-background-secondary p-3">
          <div className="pointer-events-none absolute inset-0">
            <div className={`absolute inset-0 ${elementTintClass}`} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,173,125,0.16),transparent_62%)]" />
          </div>

          <div className="relative space-y-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">CV {totalCV.toFixed(1)}</span>
                <span className="rounded bg-border px-2 py-0.5 text-xs text-text-primary/70">S{state.sequence}</span>
                <span className="rounded bg-border px-2 py-0.5 text-xs text-text-primary/70">{filledEchoCount}/5 Echoes</span>
                <span className="rounded bg-border px-2 py-0.5 text-xs text-text-primary/70">
                  Forte Nodes {forteNodeCount}/10
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border/75 bg-background/85 p-2 text-xs text-text-primary/75">
              <div className="truncate">
                <span className="text-text-primary/55">Character:</span>{' '}
                {characterName || state.characterId || 'None'} (Lv.{state.characterLevel})
              </div>
              <div className="truncate">
                <span className="text-text-primary/55">Weapon:</span>{' '}
                {weaponName || state.weaponId || 'None'} (Lv.{state.weaponLevel} • R{state.weaponRank})
              </div>
            </div>

            {visibleSets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {visibleSets.map((setSummary) => (
                  <span
                    key={setSummary.key}
                    className={setSummary.isActive
                      ? 'inline-flex items-center gap-1 rounded-md border border-accent/45 bg-accent/10 px-2 py-0.5 text-xs text-accent'
                      : 'inline-flex items-center gap-1 rounded-md border border-border bg-background-secondary px-2 py-0.5 text-xs text-text-primary/70'}
                  >
                    {setSummary.icon && (
                      <img
                        src={setSummary.icon}
                        alt=""
                        className="h-3 w-3 object-contain"
                      />
                    )}
                    {setSummary.name} {setSummary.count}pc
                  </span>
                ))}
                {hiddenSetCount > 0 && (
                  <span className="text-xs text-text-primary/50">+{hiddenSetCount} more</span>
                )}
              </div>
            )}

            <div className="grid grid-cols-5 gap-1.5">
              {echoSummaries.map((echo) => (
                <div key={echo.key} className="relative rounded-md border border-border bg-background/85 p-1.5 text-center">
                  {echo.hasEcho ? (
                    <>
                      {echo.setIcon && (
                        <img src={echo.setIcon} alt="" className="absolute right-1 top-1 h-3 w-3 object-contain" />
                      )}
                      <img src={echo.icon} alt="" className="mx-auto h-8 w-8 object-contain" />
                      <div className="mt-1 text-xs text-text-primary/70">{echo.mainStat ?? 'No Main'}</div>
                      <div className="text-xs text-accent">{echo.cv.toFixed(1)}</div>
                    </>
                  ) : (
                    <div className="flex h-16 items-center justify-center text-xs text-text-primary/35">Empty</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-red-400 px-4 py-2 text-text-primary transition-colors hover:bg-red-400/80"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="group relative flex flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg border border-accent/40 bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary transition-all duration-300 hover:border-accent hover:text-background disabled:cursor-wait disabled:opacity-50"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <Save size={16} className="relative z-10" />
            <span className="relative z-10">
              {isSaving ? (
                <span className="flex items-center gap-0.5">
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block h-1 w-1 animate-bounce rounded-full bg-current" style={{ animationDelay: '300ms' }} />
                </span>
              ) : existingBuild ? 'Update' : 'Save'}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
