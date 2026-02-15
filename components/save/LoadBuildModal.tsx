'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Download, Trash2, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { BuildList } from './BuildList';
import { loadBuilds, deleteBuild, duplicateBuild, exportBuild, importBuild, exportAllBuilds } from '@/lib/storage';
import { useBuild } from '@/contexts/BuildContext';
import { SavedBuild } from '@/types/build';
import { useDebounce } from '@/hooks';

interface LoadBuildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad?: (build: SavedBuild) => void;
}

export const LoadBuildModal: React.FC<LoadBuildModalProps> = ({
  isOpen,
  onClose,
  onLoad
}) => {
  const { loadState } = useBuild();
  const [builds, setBuilds] = useState<SavedBuild[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuildId, setSelectedBuildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Load builds when modal opens
  useEffect(() => {
    if (isOpen) {
      refreshBuilds();
      setSearchQuery('');
      setSelectedBuildId(null);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const refreshBuilds = useCallback(() => {
    const data = loadBuilds();
    // Sort by date, newest first
    const sortedBuilds = data.builds.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setBuilds(sortedBuilds);
  }, []);

  // Filter builds based on search
  const filteredBuilds = React.useMemo(() => {
    if (!debouncedSearch.trim()) return builds;

    const query = debouncedSearch.toLowerCase();
    return builds.filter(build =>
      build.name.toLowerCase().includes(query) ||
      (build.state.characterState.id?.toLowerCase().includes(query)) ||
      (build.state.weaponState.id?.toLowerCase().includes(query))
    );
  }, [builds, debouncedSearch]);

  const handleSelect = useCallback((build: SavedBuild) => {
    setSelectedBuildId(build.id);
  }, []);

  const handleLoad = useCallback(() => {
    const build = builds.find(b => b.id === selectedBuildId);
    if (!build) return;

    loadState(build.state);
    onLoad?.(build);
    setSuccessMessage(`Loaded "${build.name}"`);
    setTimeout(() => {
      onClose();
    }, 500);
  }, [selectedBuildId, builds, loadState, onLoad, onClose]);

  const handleDelete = useCallback((build: SavedBuild) => {
    if (!confirm(`Are you sure you want to delete "${build.name}"?`)) return;

    const success = deleteBuild(build.id);
    if (success) {
      refreshBuilds();
      if (selectedBuildId === build.id) {
        setSelectedBuildId(null);
      }
      setSuccessMessage(`Deleted "${build.name}"`);
      setTimeout(() => setSuccessMessage(null), 2000);
    } else {
      setError('Failed to delete build');
    }
  }, [selectedBuildId, refreshBuilds]);

  const handleDuplicate = useCallback((build: SavedBuild) => {
    const newBuild = duplicateBuild(build.id);
    if (newBuild) {
      refreshBuilds();
      setSelectedBuildId(newBuild.id);
      setSuccessMessage(`Duplicated "${build.name}"`);
      setTimeout(() => setSuccessMessage(null), 2000);
    } else {
      setError('Failed to duplicate build');
    }
  }, [refreshBuilds]);

  const handleExport = useCallback((build: SavedBuild) => {
    try {
      exportBuild(build);
      setSuccessMessage(`Exported "${build.name}"`);
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setError('Failed to export build');
    }
  }, []);

  const handleExportAll = useCallback(() => {
    try {
      exportAllBuilds();
      setSuccessMessage('Exported all builds');
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setError('Failed to export builds');
    }
  }, []);

  const handleImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const imported = await importBuild(file);
      refreshBuilds();
      setSuccessMessage(`Imported ${imported.length} build(s)`);
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file');
    } finally {
      setIsLoading(false);
      // Reset file input
      event.target.value = '';
    }
  }, [refreshBuilds]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Load Build"
      contentClassName="w-full max-w-2xl"
    >
      <div className="space-y-4">
        {/* Search and Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-primary/50" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search builds..."
              className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-primary/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Import/Export Buttons */}
          <div className="flex gap-2">
            <label className="px-3 py-2 bg-border text-text-primary rounded-lg hover:bg-border/80 transition-colors cursor-pointer flex items-center gap-2">
              <Upload size={18} />
              <span className="hidden sm:inline">Import</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                disabled={isLoading}
              />
            </label>
            {builds.length > 0 && (
              <button
                onClick={handleExportAll}
                className="px-3 py-2 bg-border text-text-primary rounded-lg hover:bg-border/80 transition-colors flex items-center gap-2"
                title="Export all builds"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Export All</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        {/* Build List */}
        <div className="max-h-[400px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-text-primary/50">Loading...</div>
            </div>
          ) : (
            <BuildList
              builds={filteredBuilds}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onExport={handleExport}
              selectedBuildId={selectedBuildId}
              emptyMessage={
                searchQuery
                  ? 'No builds match your search'
                  : 'No saved builds yet. Create your first build!'
              }
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-border text-text-primary rounded-lg hover:bg-border/80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selectedBuildId}
            className="flex-1 px-4 py-2 bg-accent text-background font-medium rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Load Selected
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LoadBuildModal;
