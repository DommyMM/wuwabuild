'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGameData } from '@/contexts/GameDataContext';
import { Character, Element, formatCharacterDisplayName } from '@/lib/character';
import { getLBStatCode, getLBStatLabel, isLBPercentStatSortKey, LBSortDirection, LBSortKey, LBStatFilterOp, LBStatSortKey, LBStatThreshold } from '@/lib/lb';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { toMainStatLabel, toMainStatUrlKey } from '@/lib/mainStatFilters';
import { getWeaponPaths } from '@/lib/paths';
import { Weapon } from '@/lib/weapon';
import { MAIN_STAT_OPTIONS, MAX_ITEMS_PER_PAGE, REGION_OPTIONS, SEQUENCE_LEVELS, SEQUENCE_TOGGLE_COLORS, sequenceChipSummary, SORT_OPTIONS, STAT_OPTION_KEYS } from './constants';
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
      characterIds: string[];
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
      subSection: '1p Sets' | '2p Sets' | '3p Sets' | '5p Sets';
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
type VisibleCharacterItem = Extract<VisibleFilterItem, { type: 'character' }>;
type SetSubSection = VisibleSetItem['subSection'];

interface SelectedCharacterChip {
  key: string;
  label: string;
  character: Character;
  characterIds: string[];
}

type StatRequirementDraft = {
  op: LBStatFilterOp;
  value: string;
};

interface BuildFiltersPanelProps {
  sort: LBSortKey;
  direction: LBSortDirection;
  pageSize: number;
  maxPageSize?: number;
  activeSortLabel: string;
  showSortControls?: boolean;
  hasActiveFilters: boolean;
  filterQuery: string;
  characters: Character[];
  weaponList: Weapon[];
  selectedCharacters: Character[];
  selectedWeapons: Weapon[];
  regionPrefixes: string[];
  selectedSetEntries: SelectedSetEntry[];
  selectedMainEntries: SelectedMainEntry[];
  sequences: number[];
  statFilters: LBStatThreshold[];
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
  onSetSequences: (levels: number[]) => void;
  onToggleSequence: (level: number) => void;
  onClearSequence: () => void;
  onAddStatFilter: (filter: LBStatThreshold) => void;
  onRemoveStatFilter: (index: number) => void;
  onClearUsername: () => void;
  onClearUid: () => void;
  onBackspaceRemove: () => void;
  onClearAllFilters: () => void;
  onPageSizeChange: (value: number) => void;
}

const MAIN_STAT_INDEX_BY_LABEL: Map<string, number> = new Map(
  MAIN_STAT_OPTIONS.map((entry, index) => [entry.label, index]),
);

function getMainStatOrder(label: string): number {
  return MAIN_STAT_INDEX_BY_LABEL.get(label) ?? Number.MAX_SAFE_INTEGER;
}

const getRegionLabel = (value: string): string => (
  REGION_OPTIONS.find((entry) => entry.value === value)?.label ?? value
);

const getSetSubSection = (count: number): SetSubSection => {
  if (count === 1) return '1p Sets';
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

const getPieceOrder = (label: SetSubSection): number => {
  if (label === '1p Sets') return 0;
  if (label === '2p Sets') return 1;
  if (label === '3p Sets') return 2;
  return 3;
};

const getTypeTagLabel = (type: VisibleFilterItem['type']): string => (
  type === 'main' ? 'stats' : type
);

const ROVER_FILTER_ELEMENTS = new Set<string>([Element.Aero, Element.Spectro, Element.Havoc]);

const isRoverFilterCharacter = (character: Character): boolean => (
  character.element === Element.Rover || character.name.startsWith('Rover')
);

const getRoverFilterElement = (character: Character): Element | null => {
  if (!isRoverFilterCharacter(character)) return null;
  const roverElement = character.roverElementName;
  return roverElement && ROVER_FILTER_ELEMENTS.has(roverElement) ? roverElement : null;
};

const getRoverFilterLabel = (element: Element): string => `Rover: ${element}`;

const OP_SYMBOL: Record<LBStatFilterOp, string> = { gte: '≥', lte: '≤' };

/** Chip/label text for one stat threshold, e.g. "Crit Rate ≥ 70%" or "ATK ≥ 2500". */
const statThresholdLabel = (filter: LBStatThreshold): string => {
  const suffix = isLBPercentStatSortKey(filter.stat) ? '%' : '';
  return `${getLBStatLabel(filter.stat)} ${OP_SYMBOL[filter.op]} ${filter.value}${suffix}`;
};

// Section header inside the filter dropdown (matches the categorical section rows).
const dropdownSectionHeaderClass = 'border-b border-border/60 bg-background-secondary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-accent';

// Resolves a typed query to a stat-threshold option, so typing a stat name (or its
// code, e.g. "er") prefills the builder. Needs ≥2 chars to avoid noisy single-letter hits.
function matchStatByQuery(query: string): LBStatSortKey | null {
  if (query.length < 2) return null;
  for (const key of STAT_OPTION_KEYS) {
    if (getLBStatCode(key).toLowerCase() === query) return key;
  }
  for (const key of STAT_OPTION_KEYS) {
    if (getLBStatLabel(key).toLowerCase().includes(query)) return key;
  }
  return null;
}

// Closes a popover on Escape or a pointer-down outside its container. `setOpen` is
// a stable useState dispatch, so the listeners re-bind only when open state flips.
function useOutsideDismiss(
  ref: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  setOpen: React.Dispatch<React.SetStateAction<boolean>>,
): void {
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [ref, isOpen, setOpen]);
}

export const BuildFiltersPanel: React.FC<BuildFiltersPanelProps> = ({
  sort,
  direction,
  pageSize,
  maxPageSize = MAX_ITEMS_PER_PAGE,
  activeSortLabel,
  showSortControls = true,
  hasActiveFilters,
  filterQuery,
  characters,
  weaponList,
  selectedCharacters,
  selectedWeapons,
  regionPrefixes,
  selectedSetEntries,
  selectedMainEntries,
  sequences,
  statFilters,
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
  onSetSequences,
  onToggleSequence,
  onClearSequence,
  onAddStatFilter,
  onRemoveStatFilter,
  onClearUsername,
  onClearUid,
  onBackspaceRemove,
  onClearAllFilters,
  onPageSizeChange,
}) => {
  const { t } = useLanguage();
  const { statIcons, getMainStatsByCost, getAvailableSubstats } = useGameData();
  const pageSizePresets = useMemo(() => {
    const presets = [12, 24, 36, 48, 60, maxPageSize]
      .filter((value) => value >= 1 && value <= maxPageSize);
    return [...new Set(presets)].sort((a, b) => a - b);
  }, [maxPageSize]);
  const pageSizeMenuRef = useRef<HTMLDivElement | null>(null);
  const filterAreaRef = useRef<HTMLDivElement | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPageSizeMenuOpen, setIsPageSizeMenuOpen] = useState(false);
  const [statDrafts, setStatDrafts] = useState<Partial<Record<LBStatSortKey, StatRequirementDraft>>>({});
  const [isFilterMode, setIsFilterMode] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(-1);

  // The dropdown hosts interactive controls (stat builder inputs), so it closes on a
  // pointer-down outside the whole filter area / Escape — not on the search input's blur.
  useOutsideDismiss(filterAreaRef, isDropdownOpen, setIsDropdownOpen);

  const sequenceSet = useMemo(() => new Set(sequences), [sequences]);
  const sequenceActive = sequences.length > 0;
  const sequenceChipText = sequenceChipSummary(sequences);

  const selectedCharacterIds = useMemo(
    () => new Set(selectedCharacters.map((entry) => entry.id)),
    [selectedCharacters],
  );
  const selectedWeaponIds = useMemo(
    () => new Set(selectedWeapons.map((entry) => entry.id)),
    [selectedWeapons],
  );
  const selectedSetKeys = useMemo(
    () => new Set(selectedSetEntries.map((entry) => `${entry.count}-${entry.setId}`)),
    [selectedSetEntries],
  );
  const selectedMainKeys = useMemo(
    () => new Set(selectedMainEntries.map((entry) => `${entry.cost}-${entry.statType}`)),
    [selectedMainEntries],
  );
  const roverCharacterGroups = useMemo(() => {
    const groups = new Map<Element, Character[]>();
    for (const character of characters) {
      const roverElement = getRoverFilterElement(character);
      if (!roverElement) continue;
      const group = groups.get(roverElement);
      if (group) {
        group.push(character);
      } else {
        groups.set(roverElement, [character]);
      }
    }
    return groups;
  }, [characters]);
  const selectedRoverElements = useMemo(() => {
    const elements = new Set<Element>();
    for (const character of selectedCharacters) {
      const roverElement = getRoverFilterElement(character);
      if (roverElement) elements.add(roverElement);
    }
    return elements;
  }, [selectedCharacters]);
  const selectedCharacterChips = useMemo<SelectedCharacterChip[]>(() => {
    const chips: SelectedCharacterChip[] = [];
    const roverChipByElement = new Map<Element, SelectedCharacterChip>();

    for (const character of selectedCharacters) {
      const roverElement = getRoverFilterElement(character);
      if (!roverElement) {
        chips.push({
          key: `char-${character.id}`,
          label: formatCharacterDisplayName(character, {
            baseName: t(character.nameI18n ?? { en: character.name }),
          }),
          character,
          characterIds: [character.id],
        });
        continue;
      }

      const existing = roverChipByElement.get(roverElement);
      if (existing) {
        existing.characterIds.push(character.id);
        continue;
      }

      const chip: SelectedCharacterChip = {
        key: `rover-${roverElement}`,
        label: getRoverFilterLabel(roverElement),
        character,
        characterIds: [character.id],
      };
      roverChipByElement.set(roverElement, chip);
      chips.push(chip);
    }

    return chips;
  }, [selectedCharacters, t]);

  const trimmedFilterQuery = filterQuery.trim();
  const normalizedQuery = trimmedFilterQuery.toLowerCase();
  const isExactUidQuery = /^\d{9}$/.test(trimmedFilterQuery);

  // Structured-filter sections appear when the query is empty or clearly targets them,
  // so a plain username/UID search doesn't surface the sequence toggles / stat builder.
  const statQueryMatch = matchStatByQuery(normalizedQuery);
  const showStatSection = normalizedQuery === '' || statQueryMatch !== null;
  const showSequenceSection = normalizedQuery === '' || /^s\d?$/.test(normalizedQuery) || normalizedQuery.startsWith('seq');
  const pinStatSection = normalizedQuery !== '' && statQueryMatch !== null;

  const visibleStatOptions = useMemo(() => {
    if (!normalizedQuery || !showStatSection) return STAT_OPTION_KEYS;
    const matched = STAT_OPTION_KEYS.filter((key) => (
      getLBStatCode(key).toLowerCase().includes(normalizedQuery) ||
      getLBStatLabel(key).toLowerCase().includes(normalizedQuery)
    ));
    return matched.length > 0 ? matched : STAT_OPTION_KEYS;
  }, [normalizedQuery, showStatSection]);

  const handleFilterQueryChange = (value: string) => {
    onFilterQueryChange(value);
  };

  const updateStatDraft = (key: LBStatSortKey, patch: Partial<StatRequirementDraft>) => {
    setStatDrafts((prev) => {
      const current = prev[key] ?? { op: 'gte', value: '0' };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  };

  const addStatRequirement = (key: LBStatSortKey) => {
    const draft = statDrafts[key] ?? { op: 'gte', value: '0' };
    const value = Number(draft.value);
    if (!Number.isFinite(value) || value < 0) return;
    onAddStatFilter({ stat: key, op: draft.op, value });
  };

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
    const searchItems: VisibleFilterItem[] = [];

    if (isExactUidQuery && !uid) {
      searchItems.push({
        key: `uid-${trimmedFilterQuery}`,
        type: 'uid',
        section: 'Search By',
        value: trimmedFilterQuery,
        label: `UID: ${trimmedFilterQuery}`,
      });
    }
    if (normalizedQuery.length >= 2 && !username) {
      searchItems.push({
        key: `username-${trimmedFilterQuery}`,
        type: 'username',
        section: 'Search By',
        value: trimmedFilterQuery,
        label: `Username: ${trimmedFilterQuery}`,
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

    const characterEntries: VisibleCharacterItem[] = [];
    for (const character of characters) {
      const roverElement = getRoverFilterElement(character);
      if (roverElement) {
        const roverGroup = roverCharacterGroups.get(roverElement) ?? [character];
        if (selectedRoverElements.has(roverElement)) continue;
        if (character.id !== roverGroup[0]?.id) continue;
        characterEntries.push({
          key: `character-rover-${roverElement}`,
          type: 'character',
          section: 'Characters',
          character,
          characterIds: roverGroup.map((entry) => entry.id),
          label: getRoverFilterLabel(roverElement),
        });
        continue;
      }

      if (selectedCharacterIds.has(character.id)) continue;
      characterEntries.push({
        key: `character-${character.id}`,
        type: 'character',
        section: 'Characters',
        character,
        characterIds: [character.id],
        label: formatCharacterDisplayName(character, {
          baseName: t(character.nameI18n ?? { en: character.name }),
        }),
      });
    }

    const characterItems = characterEntries
      .filter((entry) => !normalizedQuery || entry.label.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 40);

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

    const setItems: VisibleSetItem[] = [];
    for (const setOption of setOptions) {
      const counts = setOption.pieceCount === 1
        ? [1]
        : setOption.pieceCount === 3
          ? [3]
          : [2, 5];
      for (const count of counts) {
        const key = `${count}-${setOption.id}`;
        if (selectedSetKeys.has(key)) continue;
        const label = `${setOption.name}`;
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

    const mainItems: VisibleMainItem[] = [];
    for (const cost of [4, 3, 1]) {
      const statEntries = Object.keys(getMainStatsByCost(cost));
      for (const statLabel of statEntries) {
        const statKey = toMainStatUrlKey(statLabel);
        const key = `${cost}-${statKey}`;
        if (selectedMainKeys.has(key)) continue;
        const label = toMainStatLabel(statLabel);
        if (normalizedQuery && !label.toLowerCase().includes(normalizedQuery)) continue;
        mainItems.push({
          key: `main-${key}`,
          type: 'main',
          section: 'Main Stats',
          subSection: getMainSubSection(cost),
          cost,
          statType: statKey,
          label,
          icon: statIcons?.[label] ?? '',
        });
      }
    }
    mainItems.sort((a, b) => {
      const costDiff = getCostOrder(a.subSection) - getCostOrder(b.subSection);
      if (costDiff !== 0) return costDiff;
      const orderDiff = getMainStatOrder(a.label) - getMainStatOrder(b.label);
      if (orderDiff !== 0) return orderDiff;
      return a.label.localeCompare(b.label);
    });

    return [
      ...characterItems,
      ...weaponItems,
      ...searchItems,
      ...regionItems,
      ...setItems.slice(0, 80),
      ...mainItems.slice(0, 80),
    ];
  }, [
    characters,
    getMainStatsByCost,
    normalizedQuery,
    regionPrefixes,
    roverCharacterGroups,
    selectedCharacterIds,
    selectedMainKeys,
    selectedRoverElements,
    selectedSetKeys,
    selectedWeaponIds,
    setOptions,
    statIcons,
    t,
    trimmedFilterQuery,
    isExactUidQuery,
    uid,
    username,
    weaponList,
  ]);

  const handleSelectItem = (item: VisibleFilterItem) => {
    if (item.type === 'username') onSetUsername(item.value);
    if (item.type === 'uid') onSetUid(item.value);
    if (item.type === 'region') onAddRegion(item.value);
    if (item.type === 'character') item.characterIds.forEach((id) => onAddCharacter(id));
    if (item.type === 'weapon') onAddWeapon(item.weapon.id);
    if (item.type === 'set') onAddSet(item.setId, item.count);
    if (item.type === 'main') onAddMain(item.cost, item.statType);
    handleFilterQueryChange('');
  };

  const normalizedActiveItemIndex = useMemo(() => {
    if (!isDropdownOpen || visibleItems.length === 0) return -1;
    if (activeItemIndex < 0 || activeItemIndex >= visibleItems.length) return 0;
    return activeItemIndex;
  }, [activeItemIndex, isDropdownOpen, visibleItems.length]);

  useEffect(() => {
    if (!isDropdownOpen || normalizedActiveItemIndex < 0) return;
    const activeRow = document.querySelector<HTMLButtonElement>(`button[data-filter-index="${normalizedActiveItemIndex}"]`);
    activeRow?.scrollIntoView({ block: 'nearest' });
  }, [isDropdownOpen, normalizedActiveItemIndex]);

  useEffect(() => {
    if (!isPageSizeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!pageSizeMenuRef.current?.contains(event.target as Node)) {
        setIsPageSizeMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPageSizeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPageSizeMenuOpen]);

  const activeSortIcon = statIcons?.[activeSortLabel] ?? '';
  const activeSortIconFilter = ELEMENT_ICON_FILTERS[activeSortLabel];

  return (
    <section className="relative z-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold uppercase tracking-wide text-accent">
          Filters
        </div>
        <div className="relative z-20 flex flex-wrap items-center gap-2">
          {showSortControls && (
            <>
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
            </>
          )}
          <div ref={pageSizeMenuRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setIsPageSizeMenuOpen((prev) => !prev);
                setIsDropdownOpen(false);
              }}
              className={`inline-flex min-w-30 items-center justify-between gap-2 border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none ${
                isPageSizeMenuOpen
                  ? 'rounded-t-lg rounded-b-none border-accent/70 bg-black/35 text-accent'
                  : 'rounded-lg border-border bg-background text-text-primary hover:border-accent/50 hover:bg-background-secondary/80'
              }`}
              aria-haspopup="menu"
              aria-expanded={isPageSizeMenuOpen}
              aria-label="Max items per page"
            >
              <span className="whitespace-nowrap">Max Rows: {pageSize}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                  isPageSizeMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isPageSizeMenuOpen && (
              <div
                role="menu"
                aria-label="Max rows"
                className="absolute right-0 top-full z-30 min-w-full overflow-hidden rounded-b-md border border-border border-t-0 bg-background-secondary shadow-xl"
              >
                {pageSizePresets.map((value) => {
                  const isSelected = value === pageSize;
                  return (
                    <button
                      key={`page-size-${value}`}
                      type="button"
                      role="menuitemradio"
                      aria-checked={isSelected}
                      onClick={() => {
                        onPageSizeChange(value);
                        setIsPageSizeMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 border-b border-border px-3 py-1.5 text-left text-xs transition-colors last:border-b-0 ${
                        isSelected
                          ? 'border-l-2 border-l-accent bg-black/35 text-accent'
                          : 'border-l-2 border-l-transparent text-text-primary hover:border-l-border hover:bg-background hover:text-text-primary/95'
                      }`}
                    >
                      <span className="whitespace-nowrap">Max Rows: {value}</span>
                      {isSelected && <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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

      <div ref={filterAreaRef} className="relative">
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

          {selectedCharacterChips.map((entry) => (
            <span
              key={entry.key}
              className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-text-primary"
            >
              {entry.character.head ? <img src={entry.character.head} alt="" className="h-5 w-5 rounded-sm object-cover" /> : null}
              <span>{entry.label}</span>
              <button
                type="button"
                onClick={() => entry.characterIds.forEach((id) => onRemoveCharacter(id))}
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
            const mainLabel = toMainStatLabel(entry.statType);
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

          {sequenceChipText && (
            <span className="inline-flex items-center gap-1 rounded-md border border-violet-400/45 bg-violet-500/12 px-2 py-1 text-xs text-violet-200">
              {sequenceChipText}
              <button type="button" onClick={onClearSequence} aria-label="Remove card sequence filter">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}

          {statFilters.map((filter, index) => (
            <span
              key={`stat-chip-${filter.stat}-${filter.op}-${index}`}
              className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
            >
              {statThresholdLabel(filter)}
              <button
                type="button"
                onClick={() => onRemoveStatFilter(index)}
                aria-label={`Remove ${statThresholdLabel(filter)}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}

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

          <div className="relative min-w-55 flex-1">
            <Search className="pointer-events-none absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 text-text-primary/45" />
            <input
              value={filterQuery}
              onChange={(event) => handleFilterQueryChange(event.target.value)}
              onFocus={() => {
                setIsDropdownOpen(true);
                setIsFilterMode(true);
                if (visibleItems.length > 0) {
                  setActiveItemIndex((prev) => (prev >= 0 ? prev : 0));
                }
              }}
              onClick={() => {
                setIsDropdownOpen(true);
                setIsFilterMode(true);
                if (visibleItems.length > 0) {
                  setActiveItemIndex((prev) => (prev >= 0 ? prev : 0));
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Backspace' && !filterQuery.trim()) {
                  onBackspaceRemove();
                }
                if (event.key === 'ArrowDown' && visibleItems.length > 0) {
                  event.preventDefault();
                  setIsFilterMode(true);
                  setIsDropdownOpen(true);
                  setActiveItemIndex((normalizedActiveItemIndex + 1 + visibleItems.length) % visibleItems.length);
                }
                if (event.key === 'ArrowUp' && visibleItems.length > 0) {
                  event.preventDefault();
                  setIsFilterMode(true);
                  setIsDropdownOpen(true);
                  setActiveItemIndex((normalizedActiveItemIndex - 1 + visibleItems.length) % visibleItems.length);
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setIsDropdownOpen(false);
                  setIsFilterMode(false);
                  setActiveItemIndex(-1);
                }
                if (event.key === 'Enter' && visibleItems.length > 0) {
                  event.preventDefault();
                  const selectedIndex = normalizedActiveItemIndex >= 0 ? normalizedActiveItemIndex : 0;
                  handleSelectItem(visibleItems[selectedIndex]);
                  setActiveItemIndex(0);
                }
              }}
              placeholder="Search filters (e.g. region, character, weapon, username, UID)"
              className="w-full bg-transparent py-1 pl-7 pr-2 text-sm text-text-primary placeholder:text-text-primary/45 focus:outline-none"
            />
          </div>
        </div>

        {isDropdownOpen && (showStatSection || showSequenceSection || visibleItems.length > 0) && (
          <div className="scrollbar-thin absolute left-0 right-0 z-30 flex max-h-132 flex-col overflow-y-auto rounded-lg border border-border bg-background shadow-xl">
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
              const isActiveRow = isFilterMode && index === normalizedActiveItemIndex;

              return (
                <React.Fragment key={item.key}>
                  {showSection && (
                    <div className="border-b border-border/60 bg-background-secondary px-3 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
                      {item.section}
                    </div>
                  )}
                  {showSubSection && (
                    <div className="border-b border-border/50 bg-background/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-primary/70">
                      {item.subSection}
                    </div>
                  )}
                  <button
                    data-filter-index={index}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => {
                      setActiveItemIndex(index);
                      setIsFilterMode(true);
                    }}
                    onClick={() => handleSelectItem(item)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-sm transition-colors last:border-b-0 ${
                      isActiveRow
                        ? 'bg-cyan-500/18 text-cyan-100'
                        : 'text-text-primary hover:bg-amber-400/16 hover:text-amber-100'
                    }`}
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
                            style={ELEMENT_ICON_FILTERS[item.label] ? { filter: ELEMENT_ICON_FILTERS[item.label] } : undefined}
                          />
                        ) : <div className="h-5 w-5 rounded bg-border" />}
                        <span className="truncate">{item.label}</span>
                      </span>
                    )}

                    {(item.type === 'region' || item.type === 'username' || item.type === 'uid') && (
                      <span className="truncate">{item.label}</span>
                    )}

                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
                      isActiveRow
                        ? 'bg-cyan-500/20 text-cyan-100'
                        : 'bg-border text-text-primary/70'
                    }`}>
                      {getTypeTagLabel(item.type)}
                    </span>
                  </button>
                </React.Fragment>
              );
            })}

            {showSequenceSection && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 bg-background-secondary px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-accent">Card Sequence</span>
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-primary/55">
                      {sequenceActive ? `${sequences.length} selected` : 'All sequences'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {[
                      { label: 'All', levels: [] },
                      { label: 'S0 only', levels: [0] },
                      { label: 'S2-S6', levels: [2, 3, 4, 5, 6] },
                      { label: 'S6 only', levels: [6] },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onSetSequences(preset.levels)}
                        className="rounded border border-border bg-background px-2 py-1 text-[11px] font-medium text-text-primary/60 transition-colors hover:border-accent/45 hover:text-text-primary"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 border-b border-border/60 px-3 py-2.5">
                  {SEQUENCE_LEVELS.map((level) => {
                    const selected = sequenceSet.has(level);
                    return (
                      <button
                        key={`seq-${level}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onToggleSequence(level)}
                        aria-pressed={selected}
                        className={`inline-flex h-8 min-w-11 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors ${
                          selected
                            ? SEQUENCE_TOGGLE_COLORS[level] ?? 'border-accent/55 bg-accent/15 text-accent'
                            : 'border-border bg-background text-text-primary/55 hover:border-accent/45 hover:text-text-primary'
                        }`}
                      >
                        S{level}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showStatSection && (
              <div className={pinStatSection ? 'order-first' : undefined}>
                <div className={dropdownSectionHeaderClass}>Stat Requirements</div>
                <div className="divide-y divide-border/55 border-b border-border/60">
                  {visibleStatOptions.map((key) => {
                    const draft = statDrafts[key] ?? { op: 'gte', value: '0' };
                    const value = draft.value;
                    const parsedValue = Number(value);
                    const canAdd = value.trim() !== '' && Number.isFinite(parsedValue) && parsedValue >= 0;
                    const isPercent = isLBPercentStatSortKey(key);

                    return (
                      <div key={key} className="grid min-h-11 grid-cols-[minmax(9rem,1fr)_auto_6rem_auto] items-center gap-2 px-3 py-1.5">
                        <div className="min-w-0 truncate text-xs font-semibold text-text-primary">
                          {getLBStatLabel(key)}
                        </div>
                        <div className="inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-border bg-background p-0.5">
                          {(['gte', 'lte'] as const).map((op) => (
                            <button
                              key={op}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => updateStatDraft(key, { op })}
                              aria-pressed={draft.op === op}
                              aria-label={op === 'gte' ? `At least ${getLBStatLabel(key)}` : `At most ${getLBStatLabel(key)}`}
                              className={`h-7 min-w-7 rounded px-2 text-xs font-semibold leading-none transition-colors ${
                                draft.op === op
                                  ? 'bg-accent/18 text-accent'
                                  : 'text-text-primary/55 hover:text-text-primary'
                              }`}
                            >
                              {OP_SYMBOL[op]}
                            </button>
                          ))}
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            value={value}
                            onChange={(event) => updateStatDraft(key, { value: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') { event.preventDefault(); addStatRequirement(key); }
                            }}
                            aria-label={`${getLBStatLabel(key)} threshold value`}
                            className={`h-8 w-full rounded-md border border-border bg-background pl-2 ${isPercent ? 'pr-5' : 'pr-2'} text-xs leading-none text-text-primary placeholder:text-text-primary/40 focus:border-accent/60 focus:outline-none`}
                          />
                          {isPercent && (
                            <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-text-primary/45">%</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => addStatRequirement(key)}
                          disabled={!canAdd}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-accent/45 bg-accent/10 px-2.5 text-xs font-medium text-accent transition-colors hover:border-accent/70 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showSortControls && (
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
      )}
    </section>
  );
};
