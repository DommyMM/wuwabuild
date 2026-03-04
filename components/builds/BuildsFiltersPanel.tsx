'use client';

import React from 'react';
import { ArrowDownAZ, ArrowUpAZ, Search, X } from 'lucide-react';
import { Character } from '@/lib/character';
import { Weapon } from '@/lib/weapon';
import { LBSortDirection, LBSortKey } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAIN_STAT_OPTIONS, REGION_OPTIONS, SORT_OPTIONS } from './buildsConstants';
import { FilterSuggestion, SelectedMainEntry, SelectedSetEntry, SetOption } from './types';

interface BuildsFiltersPanelProps {
  entityQuery: string;
  filterSuggestions: FilterSuggestion[];
  selectedCharacters: Character[];
  selectedWeapons: Weapon[];
  sort: LBSortKey;
  direction: LBSortDirection;
  usernameInput: string;
  uidInput: string;
  regionPrefixes: string[];
  setOptions: SetOption[];
  effectivePendingSetId: number | null;
  effectivePendingSetCount: number;
  pendingSetPieceCounts: number[];
  selectedSetEntries: SelectedSetEntry[];
  pendingMainCost: number;
  pendingMainStat: string;
  selectedMainEntries: SelectedMainEntry[];
  hasActiveFilters: boolean;
  activeSortLabel: string;
  onEntityQueryChange: (value: string) => void;
  onAddSuggestion: (entry: FilterSuggestion) => void;
  onRemoveCharacter: (id: string) => void;
  onRemoveWeapon: (id: string) => void;
  onSortChange: (sort: LBSortKey) => void;
  onToggleDirection: () => void;
  onUsernameInputChange: (value: string) => void;
  onUidInputChange: (value: string) => void;
  onToggleRegion: (regionPrefix: string) => void;
  onPendingSetIdChange: (setId: number | null) => void;
  onPendingSetCountChange: (count: number) => void;
  onAddSetFilter: () => void;
  onRemoveSetEntry: (index: number) => void;
  onPendingMainCostChange: (cost: number) => void;
  onPendingMainStatChange: (statCode: string) => void;
  onAddMainFilter: () => void;
  onRemoveMainEntry: (index: number) => void;
  onClearAllFilters: () => void;
}

const FilterCard: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div className="rounded-lg border border-border bg-background/90 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-primary/60">
      {title}
    </div>
    {children}
  </div>
);

export const BuildsFiltersPanel: React.FC<BuildsFiltersPanelProps> = ({
  entityQuery,
  filterSuggestions,
  selectedCharacters,
  selectedWeapons,
  sort,
  direction,
  usernameInput,
  uidInput,
  regionPrefixes,
  setOptions,
  effectivePendingSetId,
  effectivePendingSetCount,
  pendingSetPieceCounts,
  selectedSetEntries,
  pendingMainCost,
  pendingMainStat,
  selectedMainEntries,
  hasActiveFilters,
  activeSortLabel,
  onEntityQueryChange,
  onAddSuggestion,
  onRemoveCharacter,
  onRemoveWeapon,
  onSortChange,
  onToggleDirection,
  onUsernameInputChange,
  onUidInputChange,
  onToggleRegion,
  onPendingSetIdChange,
  onPendingSetCountChange,
  onAddSetFilter,
  onRemoveSetEntry,
  onPendingMainCostChange,
  onPendingMainStatChange,
  onAddMainFilter,
  onRemoveMainEntry,
  onClearAllFilters,
}) => {
  const { t } = useLanguage();

  return (
    <section className="rounded-xl border border-border bg-background-secondary p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold uppercase tracking-wide text-accent">
          Filters
        </div>
        <button
          type="button"
          onClick={onClearAllFilters}
          disabled={!hasActiveFilters}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Clear All Filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <FilterCard title="Character / Weapon">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-primary/45" />
            <input
              value={entityQuery}
              onChange={(event) => onEntityQueryChange(event.target.value)}
              placeholder="Filter by character or weapon name"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none"
            />
            {entityQuery.trim().length > 0 && filterSuggestions.length > 0 && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-background p-1 shadow-lg">
                {filterSuggestions.map((entry) => (
                  <button
                    key={`${entry.type}-${entry.id}`}
                    type="button"
                    onClick={() => onAddSuggestion(entry)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-primary hover:bg-background-secondary"
                  >
                    {entry.icon ? (
                      <img src={entry.icon} alt="" className="h-5 w-5 rounded object-contain" />
                    ) : (
                      <div className="h-5 w-5 rounded bg-border" />
                    )}
                    <span className="truncate">{entry.name}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-text-primary/45">{entry.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(selectedCharacters.length > 0 || selectedWeapons.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedCharacters.map((entry) => (
                <span
                  key={`char-${entry.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-text-primary"
                >
                  {entry.head ? <img src={entry.head} alt="" className="h-4 w-4 rounded-full object-cover" /> : null}
                  <span>{t(entry.nameI18n ?? { en: entry.name })}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveCharacter(entry.id)}
                    className="text-text-primary/60 hover:text-text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {selectedWeapons.map((entry) => (
                <span
                  key={`weapon-${entry.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background-secondary px-2 py-1 text-xs text-text-primary"
                >
                  <img src={getWeaponPaths(entry)} alt="" className="h-4 w-4 object-contain" />
                  <span>{t(entry.nameI18n ?? { en: entry.name })}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveWeapon(entry.id)}
                    className="text-text-primary/60 hover:text-text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </FilterCard>

        <FilterCard title="Sort / Identity">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as LBSortKey)}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleDirection}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary transition-colors hover:border-accent/60"
            >
              {direction === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
              {direction.toUpperCase()}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <input
              value={usernameInput}
              onChange={(event) => onUsernameInputChange(event.target.value)}
              placeholder="Username"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none"
            />
            <input
              value={uidInput}
              onChange={(event) => onUidInputChange(event.target.value)}
              placeholder="UID"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none"
            />
          </div>
        </FilterCard>

        <FilterCard title="Region">
          <div className="flex flex-wrap gap-2">
            {REGION_OPTIONS.map((entry) => {
              const checked = regionPrefixes.includes(entry.value);
              return (
                <label
                  key={entry.value}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs transition-colors ${
                    checked
                      ? 'border-accent/55 bg-accent/15 text-text-primary'
                      : 'border-border bg-background-secondary text-text-primary/75 hover:border-accent/45'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRegion(entry.value)}
                    className="accent-[rgb(var(--color-accent))]"
                  />
                  {entry.label}
                </label>
              );
            })}
          </div>
        </FilterCard>

        <FilterCard title="Echo Set Filters">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_7rem_auto]">
            <select
              value={effectivePendingSetId === null ? '' : String(effectivePendingSetId)}
              onChange={(event) => onPendingSetIdChange(event.target.value ? Number(event.target.value) : null)}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
            >
              {setOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>{entry.name}</option>
              ))}
            </select>
            <select
              value={effectivePendingSetCount}
              onChange={(event) => onPendingSetCountChange(Number(event.target.value))}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
            >
              {pendingSetPieceCounts.map((count) => (
                <option key={count} value={count}>{count}pc</option>
              ))}
            </select>
            <button
              type="button"
              onClick={onAddSetFilter}
              className="rounded-lg border border-accent/45 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Add
            </button>
          </div>
          {selectedSetEntries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedSetEntries.map((entry, index) => (
                <span
                  key={`${entry.count}-${entry.setId}-${index}`}
                  className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
                >
                  {entry.name} {entry.count}pc
                  <button
                    type="button"
                    onClick={() => onRemoveSetEntry(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </FilterCard>

        <FilterCard title="Echo Main Stat Filters">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[7rem_1fr_auto]">
            <select
              value={pendingMainCost}
              onChange={(event) => onPendingMainCostChange(Number(event.target.value))}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
            >
              <option value={4}>4 Cost</option>
              <option value={3}>3 Cost</option>
              <option value={1}>1 Cost</option>
            </select>
            <select
              value={pendingMainStat}
              onChange={(event) => onPendingMainStatChange(event.target.value)}
              className="appearance-none rounded-lg border border-border bg-background py-2 pl-3 pr-8 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
            >
              {MAIN_STAT_OPTIONS.map((entry) => (
                <option key={entry.code} value={entry.code}>{entry.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={onAddMainFilter}
              className="rounded-lg border border-accent/45 bg-accent/10 px-3 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Add
            </button>
          </div>
          {selectedMainEntries.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedMainEntries.map((entry, index) => (
                <span
                  key={`${entry.cost}-${entry.statType}-${index}`}
                  className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
                >
                  {entry.cost}c {entry.label}
                  <button
                    type="button"
                    onClick={() => onRemoveMainEntry(index)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </FilterCard>
      </div>

      <div className="mt-3 text-xs text-text-primary/60">
        Active sort: <span className="font-medium text-text-primary">{activeSortLabel}</span> ({direction})
      </div>
    </section>
  );
};
