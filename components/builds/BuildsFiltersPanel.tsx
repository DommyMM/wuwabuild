'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, Search, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Character, formatCharacterDisplayName } from '@/lib/character';
import { LBSortDirection, LBSortKey } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { Weapon } from '@/lib/weapon';
import { MAIN_STAT_OPTIONS, REGION_OPTIONS, SORT_OPTIONS } from './buildsConstants';
import { SelectedMainEntry, SelectedSetEntry, SetOption } from './types';

type VisibleFilterItem =
  | {
      key: string;
      type: 'username';
      section: 'Search By';
      value: string;
      label: string;
    }
  | {
      key: string;
      type: 'uid';
      section: 'Search By';
      value: string;
      label: string;
    }
  | {
      key: string;
      type: 'region';
      section: 'Regions';
      value: string;
      label: string;
    }
  | {
      key: string;
      type: 'character';
      section: 'Characters';
      character: Character;
      label: string;
    }
  | {
      key: string;
      type: 'weapon';
      section: 'Weapons';
      weapon: Weapon;
      label: string;
    }
  | {
      key: string;
      type: 'set';
      section: 'Echo Sets';
      subSection: '2p Sets' | '3p Sets' | '5p Sets';
      setId: number;
      count: number;
      label: string;
      icon: string;
    }
  | {
      key: string;
      type: 'main';
      section: 'Main Stats';
      subSection: '4 Cost' | '3 Cost' | '1 Cost';
      cost: number;
      statType: string;
      label: string;
      icon: string;
    };

type VisibleSetItem = Extract<VisibleFilterItem, { type: 'set' }>;
type VisibleMainItem = Extract<VisibleFilterItem, { type: 'main' }>;

interface BuildsFiltersPanelProps {
  sort: LBSortKey;
  direction: LBSortDirection;
  activeSortLabel: string;
  embedded?: boolean;
  hasActiveFilters: boolean;
  filterQuery: string;
  characters: Character[];
  weaponList: Weapon[];
  selectedCharacters: Character[];
  selectedWeapons: Weapon[];
  regionPrefixes: string[];
  selectedSetEntries: SelectedSetEntry[];
  selectedMainEntries: SelectedMainEntry[];
  username: string;
  uid: string;
  setOptions: SetOption[];
  onFilterQueryChange: (value: string) => void;
  onSortChange: (sort: LBSortKey) => void;
  onToggleDirection: () => void;
  onAddCharacter: (id: string) => void;
  onAddWeapon: (id: string) => void;
  onAddRegion: (value: string) => void;
  onAddSet: (setId: number, count: number) => void;
  onAddMain: (cost: number, statType: string) => void;
  onSetUsername: (value: string) => void;
  onSetUid: (value: string) => void;
  onRemoveCharacter: (id: string) => void;
  onRemoveWeapon: (id: string) => void;
  onRemoveRegion: (value: string) => void;
  onRemoveSetEntry: (index: number) => void;
  onRemoveMainEntry: (index: number) => void;
  onClearUsername: () => void;
  onClearUid: () => void;
  onBackspaceRemove: () => void;
  onClearAllFilters: () => void;
}

const MAIN_STAT_LABEL_BY_CODE: Map<string, string> = new Map(
  MAIN_STAT_OPTIONS.map((entry) => [entry.code, entry.label]),
);

function toMainStatLabel(raw: string): string {
  return MAIN_STAT_LABEL_BY_CODE.get(raw) ?? raw;
}

const getRegionLabel = (value: string): string => (
  REGION_OPTIONS.find((entry) => entry.value === value)?.label ?? value
);

const ELEMENT_ICON_FILTERS: Record<string, string> = {
  'Aero DMG': 'brightness(0) saturate(100%) invert(81%) sepia(40%) saturate(904%) hue-rotate(93deg) brightness(104%) contrast(103%)',
  'Glacio DMG': 'brightness(0) saturate(100%) invert(68%) sepia(39%) saturate(2707%) hue-rotate(176deg) brightness(102%) contrast(97%)',
  'Fusion DMG': 'brightness(0) saturate(100%) invert(62%) sepia(74%) saturate(2505%) hue-rotate(328deg) brightness(98%) contrast(93%)',
  'Electro DMG': 'brightness(0) saturate(100%) invert(63%) sepia(39%) saturate(1470%) hue-rotate(227deg) brightness(103%) contrast(101%)',
  'Havoc DMG': 'brightness(0) saturate(100%) invert(53%) sepia(40%) saturate(1418%) hue-rotate(296deg) brightness(98%) contrast(96%)',
  'Spectro DMG': 'brightness(0) saturate(100%) invert(83%) sepia(34%) saturate(1178%) hue-rotate(359deg) brightness(102%) contrast(94%)',
};

const getSetSubSection = (count: number): '2p Sets' | '3p Sets' | '5p Sets' => {
  if (count === 3) return '3p Sets';
  if (count === 5) return '5p Sets';
  return '2p Sets';
};

const getMainSubSection = (cost: number): '4 Cost' | '3 Cost' | '1 Cost' => {
  if (cost === 3) return '3 Cost';
  if (cost === 1) return '1 Cost';
  return '4 Cost';
};

const getCostOrder = (label: '4 Cost' | '3 Cost' | '1 Cost'): number => {
  if (label === '4 Cost') return 0;
  if (label === '3 Cost') return 1;
  return 2;
};

const getPieceOrder = (label: '2p Sets' | '3p Sets' | '5p Sets'): number => {
  if (label === '2p Sets') return 0;
  if (label === '3p Sets') return 1;
  return 2;
};

const getTypeTagLabel = (type: VisibleFilterItem['type']): string => (
  type === 'main' ? 'stats' : type
);

export const BuildsFiltersPanel: React.FC<BuildsFiltersPanelProps> = ({
  sort,
  direction,
  activeSortLabel,
  embedded = false,
  hasActiveFilters,
  filterQuery,
  characters,
  weaponList,
  selectedCharacters,
  selectedWeapons,
  regionPrefixes,
  selectedSetEntries,
  selectedMainEntries,
  username,
  uid,
  setOptions,
  onFilterQueryChange,
  onSortChange,
  onToggleDirection,
  onAddCharacter,
  onAddWeapon,
  onAddRegion,
  onAddSet,
  onAddMain,
  onSetUsername,
  onSetUid,
  onRemoveCharacter,
  onRemoveWeapon,
  onRemoveRegion,
  onRemoveSetEntry,
  onRemoveMainEntry,
  onClearUsername,
  onClearUid,
  onBackspaceRemove,
  onClearAllFilters,
}) => {
  const { t } = useLanguage();
  const { statIcons, getMainStatsByCost, getAvailableSubstats } = useGameData();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectedCharacterIds = useMemo(
    () => new Set(selectedCharacters.map((entry) => entry.id)),
    [selectedCharacters],
  );
  const selectedWeaponIds = useMemo(
    () => new Set(selectedWeapons.map((entry) => entry.id)),
    [selectedWeapons],
  );
  const selectedSetKeys = useMemo(
    () => new Set(selectedSetEntries.map((entry) => `${entry.count}~${entry.setId}`)),
    [selectedSetEntries],
  );
  const selectedMainKeys = useMemo(
    () => new Set(selectedMainEntries.map((entry) => `${entry.cost}~${toMainStatLabel(entry.statType)}`)),
    [selectedMainEntries],
  );

  const normalizedQuery = filterQuery.trim().toLowerCase();

  const validSortLabels = useMemo(() => {
    const labels = new Set<string>(getAvailableSubstats());
    Object.keys(getMainStatsByCost(4)).forEach((label) => labels.add(label));
    Object.keys(getMainStatsByCost(3)).forEach((label) => labels.add(label));
    Object.keys(getMainStatsByCost(1)).forEach((label) => labels.add(label));
    return labels;
  }, [getAvailableSubstats, getMainStatsByCost]);

  const validSortOptions = useMemo(() => {
    const filtered = SORT_OPTIONS.filter((option) => {
      if (option.key === 'finalCV' || option.key === 'timestamp') return true;
      return validSortLabels.has(option.label);
    });

    if (!filtered.some((entry) => entry.key === sort)) {
      const current = SORT_OPTIONS.find((entry) => entry.key === sort);
      return current ? [current, ...filtered] : filtered;
    }

    return filtered;
  }, [sort, validSortLabels]);

  const visibleItems = useMemo<VisibleFilterItem[]>(() => {
    const items: VisibleFilterItem[] = [];

    if (normalizedQuery.length >= 2 && !username) {
      items.push({
        key: `username-${filterQuery.trim()}`,
        type: 'username',
        section: 'Search By',
        value: filterQuery.trim(),
        label: `Username: ${filterQuery.trim()}`,
      });
    }
    if (
      normalizedQuery.length >= 2 &&
      !uid &&
      /^\d+$/.test(filterQuery.trim()) &&
      filterQuery.trim().length <= 12
    ) {
      items.push({
        key: `uid-${filterQuery.trim()}`,
        type: 'uid',
        section: 'Search By',
        value: filterQuery.trim(),
        label: `UID: ${filterQuery.trim()}`,
      });
    }

    const regionItems = REGION_OPTIONS
      .filter((region) => !regionPrefixes.includes(region.value))
      .filter((region) => !normalizedQuery || region.label.toLowerCase().includes(normalizedQuery))
      .map<VisibleFilterItem>((region) => ({
        key: `region-${region.value}`,
        type: 'region',
        section: 'Regions',
        value: region.value,
        label: region.label,
      }));
    items.push(...regionItems);

    const characterItems = characters
      .filter((character) => !selectedCharacterIds.has(character.id))
      .map((character) => ({
        character,
        label: formatCharacterDisplayName(character, {
          baseName: t(character.nameI18n ?? { en: character.name }),
        }),
      }))
      .filter((entry) => !normalizedQuery || entry.label.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 40)
      .map<VisibleFilterItem>((entry) => ({
        key: `character-${entry.character.id}`,
        type: 'character',
        section: 'Characters',
        character: entry.character,
        label: entry.label,
      }));
    items.push(...characterItems);

    const weaponItems = weaponList
      .filter((weapon) => !selectedWeaponIds.has(weapon.id))
      .map((weapon) => ({
        weapon,
        label: t(weapon.nameI18n ?? { en: weapon.name }),
      }))
      .filter((entry) => !normalizedQuery || entry.label.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 40)
      .map<VisibleFilterItem>((entry) => ({
        key: `weapon-${entry.weapon.id}`,
        type: 'weapon',
        section: 'Weapons',
        weapon: entry.weapon,
        label: entry.label,
      }));
    items.push(...weaponItems);

    const setItems: VisibleSetItem[] = [];
    for (const setOption of setOptions) {
      const counts = setOption.pieceCount === 3 ? [3] : [2, 5];
      for (const count of counts) {
        const key = `${count}~${setOption.id}`;
        if (selectedSetKeys.has(key)) continue;
        const label = `${setOption.name} ${count}p`;
        if (normalizedQuery && !label.toLowerCase().includes(normalizedQuery)) continue;
        setItems.push({
          key: `set-${key}`,
          type: 'set',
          section: 'Echo Sets',
          subSection: getSetSubSection(count),
          setId: setOption.id,
          count,
          label,
          icon: setOption.icon,
        });
      }
    }
    setItems.sort((a, b) => {
      const pieceDiff = getPieceOrder(a.subSection) - getPieceOrder(b.subSection);
      if (pieceDiff !== 0) return pieceDiff;
      return a.label.localeCompare(b.label);
    });
    items.push(...setItems.slice(0, 80));

    const mainItems: VisibleMainItem[] = [];
    for (const cost of [4, 3, 1]) {
      const statEntries = Object.keys(getMainStatsByCost(cost));
      for (const statLabel of statEntries) {
        const key = `${cost}~${toMainStatLabel(statLabel)}`;
        if (selectedMainKeys.has(key)) continue;
        const label = toMainStatLabel(statLabel);
        if (normalizedQuery && !label.toLowerCase().includes(normalizedQuery)) continue;
        mainItems.push({
          key: `main-${key}`,
          type: 'main',
          section: 'Main Stats',
          subSection: getMainSubSection(cost),
          cost,
          statType: toMainStatLabel(statLabel),
          label,
          icon: statIcons?.[toMainStatLabel(statLabel)] ?? '',
        });
      }
    }
    mainItems.sort((a, b) => {
      const costDiff = getCostOrder(a.subSection) - getCostOrder(b.subSection);
      if (costDiff !== 0) return costDiff;
      return a.label.localeCompare(b.label);
    });
    items.push(...mainItems.slice(0, 80));

    return items;
  }, [
    characters,
    filterQuery,
    getMainStatsByCost,
    normalizedQuery,
    regionPrefixes,
    selectedCharacterIds,
    selectedMainKeys,
    selectedSetKeys,
    selectedWeaponIds,
    setOptions,
    statIcons,
    t,
    uid,
    username,
    weaponList,
  ]);

  const handleSelectItem = (item: VisibleFilterItem) => {
    if (item.type === 'username') onSetUsername(item.value);
    if (item.type === 'uid') onSetUid(item.value);
    if (item.type === 'region') onAddRegion(item.value);
    if (item.type === 'character') onAddCharacter(item.character.id);
    if (item.type === 'weapon') onAddWeapon(item.weapon.id);
    if (item.type === 'set') onAddSet(item.setId, item.count);
    if (item.type === 'main') onAddMain(item.cost, item.statType);
    onFilterQueryChange('');
  };

  const activeSortIcon = statIcons?.[activeSortLabel] ?? '';
  const activeSortIconFilter = ELEMENT_ICON_FILTERS[activeSortLabel];

  return (
    <section className={embedded ? '' : 'rounded-xl border border-border bg-background-secondary p-4'}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold uppercase tracking-wide text-accent">
          Filters
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as LBSortKey)}
            className="appearance-none rounded-lg border border-border bg-background py-1.5 pl-3 pr-8 text-xs text-text-primary focus:border-accent/60 focus:outline-none"
          >
            {validSortOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleDirection}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary transition-colors hover:border-accent/60"
          >
            {direction === 'asc' ? <ArrowDownAZ className="h-3.5 w-3.5" /> : <ArrowUpAZ className="h-3.5 w-3.5" />}
            {direction.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={onClearAllFilters}
            disabled={!hasActiveFilters}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:border-accent/50 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-2 py-2">
          {regionPrefixes.map((value) => (
            <span
              key={`region-${value}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-text-primary"
            >
              {getRegionLabel(value)}
              <button
                type="button"
                onClick={() => onRemoveRegion(value)}
                className="text-text-primary/60 hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}

          {selectedCharacters.map((entry) => (
            <span
              key={`char-${entry.id}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-text-primary"
            >
              {entry.head ? <img src={entry.head} alt="" className="h-5 w-5 rounded-sm object-cover" /> : null}
              <span>
                {formatCharacterDisplayName(entry, {
                  baseName: t(entry.nameI18n ?? { en: entry.name }),
                })}
              </span>
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
              <img src={getWeaponPaths(entry)} alt="" className="h-5 w-5 object-contain" />
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

          {selectedSetEntries.map((entry, index) => (
            <span
              key={`${entry.count}-${entry.setId}-${index}`}
              className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
            >
              {entry.icon ? <img src={entry.icon} alt="" className="h-3.5 w-3.5 object-contain" /> : null}
              {entry.name} {entry.count}p
              <button type="button" onClick={() => onRemoveSetEntry(index)}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}

          {selectedMainEntries.map((entry, index) => {
            const mainLabel = toMainStatLabel(entry.label);
            const mainIcon = statIcons?.[mainLabel] ?? '';
            return (
              <span
                key={`${entry.cost}-${entry.statType}-${index}`}
                className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
              >
                {mainIcon ? (
                  <img
                    src={mainIcon}
                    alt=""
                    className="h-3.5 w-3.5 object-contain"
                    style={ELEMENT_ICON_FILTERS[mainLabel] ? { filter: ELEMENT_ICON_FILTERS[mainLabel] } : undefined}
                  />
                ) : null}
                {mainLabel}
                <button type="button" onClick={() => onRemoveMainEntry(index)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}

          {username && (
            <span className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
              Username: {username}
              <button type="button" onClick={onClearUsername}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {uid && (
            <span className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent">
              UID: {uid}
              <button type="button" onClick={onClearUid}>
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}

          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-text-primary/45" />
            <input
              value={filterQuery}
              onChange={(event) => onFilterQueryChange(event.target.value)}
              onFocus={() => setIsDropdownOpen(true)}
              onBlur={() => window.setTimeout(() => setIsDropdownOpen(false), 120)}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !filterQuery.trim()) {
                  onBackspaceRemove();
                }
                if (event.key === 'Enter' && visibleItems.length > 0) {
                  event.preventDefault();
                  handleSelectItem(visibleItems[0]);
                }
              }}
              placeholder="Search filters (e.g. region, character, weapon, username, UID)"
              className="w-full bg-transparent py-1 pl-7 pr-2 text-sm text-text-primary placeholder:text-text-primary/45 focus:outline-none"
            />
          </div>
        </div>

        {isDropdownOpen && visibleItems.length > 0 && (
          <div className="absolute left-0 right-0 z-20 mt-1 max-h-[520px] overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
            {visibleItems.map((item, index) => {
              const previous = index > 0 ? visibleItems[index - 1] : null;
              const showSection = index === 0 || previous?.section !== item.section;
              const showSubSection = (
                'subSection' in item && (
                  showSection ||
                  !previous ||
                  !('subSection' in previous) ||
                  previous.subSection !== item.subSection
                )
              );

              return (
                <React.Fragment key={item.key}>
                  {showSection && (
                    <div className="border-b border-border/60 bg-background-secondary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
                      {item.section}
                    </div>
                  )}
                  {showSubSection && (
                    <div className="border-b border-border/50 bg-background/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-primary/70">
                      {item.subSection}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelectItem(item)}
                    className="flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-sm text-text-primary transition-colors last:border-b-0 hover:bg-background-secondary"
                  >
                    {item.type === 'character' && (
                      <span className="flex min-w-0 items-center gap-2">
                        {item.character.head ? (
                          <img src={item.character.head} alt="" className="h-6 w-6 rounded-sm object-cover" />
                        ) : (
                          <div className="h-6 w-6 rounded-sm bg-border" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </span>
                    )}

                    {item.type === 'weapon' && (
                      <span className="flex min-w-0 items-center gap-2">
                        <img src={getWeaponPaths(item.weapon)} alt="" className="h-6 w-6 object-contain" />
                        <span className="truncate">{item.label}</span>
                      </span>
                    )}

                    {item.type === 'set' && (
                      <span className="flex min-w-0 items-center gap-2">
                        {item.icon ? <img src={item.icon} alt="" className="h-5 w-5 object-contain" /> : <div className="h-5 w-5 rounded bg-border" />}
                        <span className="truncate">{item.label}</span>
                      </span>
                    )}

                    {item.type === 'main' && (
                      <span className="flex min-w-0 items-center gap-2">
                        {item.icon ? (
                          <img
                            src={item.icon}
                            alt=""
                            className="h-5 w-5 object-contain"
                            style={ELEMENT_ICON_FILTERS[item.statType] ? { filter: ELEMENT_ICON_FILTERS[item.statType] } : undefined}
                          />
                        ) : <div className="h-5 w-5 rounded bg-border" />}
                        <span className="truncate">{item.label}</span>
                      </span>
                    )}

                    {(item.type === 'region' || item.type === 'username' || item.type === 'uid') && (
                      <span className="truncate">{item.label}</span>
                    )}

                    <span className="rounded bg-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-primary/70">
                      {getTypeTagLabel(item.type)}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-text-primary/60">
        {activeSortIcon ? (
          <img
            src={activeSortIcon}
            alt=""
            className="h-3.5 w-3.5 object-contain"
            style={activeSortIconFilter ? { filter: activeSortIconFilter } : undefined}
          />
        ) : null}
        Active sort: <span className="font-medium text-text-primary">{activeSortLabel}</span> ({direction})
      </div>
    </section>
  );
};
