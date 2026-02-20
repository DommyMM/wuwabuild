'use client';

import React, { useState, useCallback } from 'react';
import { Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { saveBuild } from '@/lib/storage';
import { useBuild } from '@/contexts/BuildContext';
import { SavedBuild } from '@/lib/build';

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
  const [name, setName] = useState(existingBuild?.name || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
                <>Character: {state.characterId} (Lv.{state.characterLevel})</>
              ) : (
                'No character selected'
              )}
            </span>
          </div>
          {state.weaponId && (
            <div className="text-sm text-text-primary/70 mt-1">
              Weapon: {state.weaponId} (R{state.weaponRank})
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-border text-text-primary rounded-lg hover:bg-border/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex-1 px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {isSaving ? 'Saving...' : existingBuild ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SaveBuildModal;
