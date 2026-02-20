'use client';

import React, { useState, useCallback } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { saveBuild } from '@/lib/storage';
import { useBuild } from '@/contexts/BuildContext';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SavedBuild } from '@/lib/build';
import { calculateCV, calculateEchoCV } from '@/lib/calculations/cv';
import { ELEMENT_SETS } from '@/lib/echo';
import { getBuildSetCounts } from '@/lib/calculations/setSummary';

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
  const totalCV = calculateCV(state.echoPanels);
  const echoSummaries = React.useMemo(() => (
    state.echoPanels
      .filter((panel) => panel.id)
      .map((panel) => {
        const echo = getEcho(panel.id);
        const echoName = echo ? t(echo.nameI18n ?? { en: echo.name }) : panel.id!;
        const mainStat = panel.stats.mainStat.type ?? 'No Main Stat';
        return {
          name: echoName,
          mainStat,
          cv: calculateEchoCV(panel),
        };
      })
  ), [getEcho, state.echoPanels, t]);
  const setSummaries = React.useMemo(() => (
    getBuildSetCounts(state.echoPanels, getEcho).map(({ element, count }) => {
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
  ), [state.echoPanels, getEcho, getFetterByElement, t]);

  // Reset form when modal opens
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
      contentClassName="w-full max-w-md"
    >
      <div className="space-y-4">
        {/* Build Name Input */}
        <div>
          <label htmlFor="build-name" className="block text-sm font-medium text-text-primary mb-2">
            Build Name
          </label>
          <input
            id="build-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter build name..."
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-primary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            autoFocus
            maxLength={100}
          />
          {error && (
            <p className="mt-1 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Build Preview */}
        <div className="p-3 bg-background rounded-lg border border-border">
          <p className="text-sm text-text-primary/70 mb-1">Build Preview</p>
          <div className="flex items-center gap-2">
            <span className="text-text-primary">
              {state.characterId ? (
                <>Character: {characterName || state.characterId} (Lv.{state.characterLevel} • S{state.sequence})</>
              ) : (
                'No character selected'
              )}
            </span>
          </div>
          {state.weaponId && (
            <div className="text-sm text-text-primary/70 mt-1">
              Weapon: {weaponName || state.weaponId} (R{state.weaponRank})
            </div>
          )}
          <div className="text-sm text-text-primary/70 mt-1">
            Total CV: {totalCV.toFixed(1)}
          </div>
          {setSummaries.length > 0 && (
            <div className="mt-2 border-t border-border pt-2">
              <div className="mb-1 text-xs text-text-primary/60">Sets</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {setSummaries.map((setSummary) => (
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
              </div>
            </div>
          )}
          {echoSummaries.length > 0 && (
            <div className="mt-2 border-t border-border pt-2 space-y-1">
              {echoSummaries.slice(0, 3).map((echo, index) => (
                <div key={`${echo.name}-${index}`} className="text-xs text-text-primary/70">
                  {echo.name} • {echo.mainStat} • CV {echo.cv.toFixed(1)}
                </div>
              ))}
              {echoSummaries.length > 3 && (
                <div className="text-xs text-text-primary/50">
                  +{echoSummaries.length - 3} more echoes
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-red-400 text-text-primary rounded-lg hover:bg-red-400/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="group relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-lg border border-accent/40 bg-background-secondary px-4 py-2 text-sm font-medium text-text-primary cursor-pointer transition-all duration-300 hover:border-accent hover:text-background disabled:opacity-50 disabled:cursor-wait"
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

export default SaveBuildModal;
