'use client';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown } from 'lucide-react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { ElementType } from '@/lib/echo';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { getCVRatingColor } from '@/lib/calculations/cv';
import { LBBuildEntry, LBSortDirection, LBSortKey } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { formatFlatStat, formatPercentStat, getSortLabel } from './buildFormatters';

type CVSortKey = 'finalCV' | 'CR' | 'CD';
type StatSortKey = Exclude<LBSortKey, 'finalCV' | 'timestamp' | 'characterId' | 'CR' | 'CD'>;

interface BuildResultsPanelProps {
  builds: LBBuildEntry[];
  total: number;
  page: number;
  pageCount: number;
  rankStart: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  sort: LBSortKey;
  direction: LBSortDirection;
  onSortChange: (sort: LBSortKey) => void;
  onToggleDirection: () => void;
  onPageChange: (page: number) => void;
}

interface SortMenuOption {
  key: LBSortKey;
  label: string;
  icon?: string;
  iconFilter?: string;
}

interface RegionBadge {
  label: string;
  className: string;
}

const CV_OPTIONS: ReadonlyArray<{ key: CVSortKey; label: string }> = [
  { key: 'finalCV', label: 'Crit Value' },
  { key: 'CR', label: 'Crit Rate' },
  { key: 'CD', label: 'Crit DMG' },
];

const STAT_OPTION_KEYS: readonly StatSortKey[] = [
  'A',
  'H',
  'D',
  'ER',
  'AD',
  'GD',
  'FD',
  'ED',
  'HD',
  'SD',
  'BA',
  'HA',
  'RS',
  'RL',
];

const DEFAULT_STAT_COLUMNS: StatSortKey[] = ['A', 'ER', 'D', 'AD'];

const PERCENT_STAT_KEYS: ReadonlySet<LBSortKey> = new Set<LBSortKey>([
  'CR',
  'CD',
  'A%',
  'H%',
  'D%',
  'ER',
  'AD',
  'GD',
  'FD',
  'ED',
  'HD',
  'SD',
  'BA',
  'HA',
  'RS',
  'RL',
]);

const REGION_BADGES: Record<string, RegionBadge> = {
  '1': { label: 'HMT', className: 'bg-red-500/85 text-white' },
  '5': { label: 'NA', className: 'bg-amber-400/90 text-black' },
  '6': { label: 'EU', className: 'bg-indigo-400/90 text-black' },
  '7': { label: 'ASIA', className: 'bg-lime-300/90 text-black' },
  '9': { label: 'SEA', className: 'bg-cyan-300/90 text-black' },
};

const TABLE_GRID = 'grid-cols-[48px_140px_160px_72px_72px_100px_160px_repeat(4,minmax(110px,1fr))]';
const PAGE_SKIP = 10;
const PAGINATION_BUTTON_CLASS = 'inline-flex h-7.5 w-7.5 cursor-pointer items-center justify-center rounded border border-border bg-background p-0 transition-colors hover:border-accent/60 disabled:cursor-not-allowed disabled:opacity-40';
const PAGE_INDICATOR_CLASS = 'inline-flex h-7.5 w-7.5 items-center justify-center rounded border border-border bg-background text-xs text-text-primary';
const SEQUENCE_BADGE_STYLES = [
  'pr-2 border-border bg-background text-text-primary/75',
  'pr-3 border-cyan-400/45 bg-cyan-500/15 text-cyan-200',
  'pr-4 border-blue-400/45 bg-blue-500/15 text-blue-200',
  'pr-5 border-violet-400/45 bg-violet-500/15 text-violet-200',
  'pr-6 border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-200',
  'pr-7 border-amber-400/55 bg-amber-500/20 text-amber-200',
  'pr-8 border-spectro/60 bg-spectro/20 text-spectro',
] as const;

function resolveRegionBadge(uid: string | undefined): RegionBadge | null {
  if (!uid) return null;
  const prefix = uid.trim()[0];
  return REGION_BADGES[prefix] ?? null;
}

function formatStatByKey(key: LBSortKey, value: number): string {
  if (PERCENT_STAT_KEYS.has(key)) return formatPercentStat(value);
  return formatFlatStat(value);
}

const SortHeaderMenu: React.FC<{
  menuId: string;
  label: string;
  active: boolean;
  direction: LBSortDirection;
  openMenu: string | null;
  options: SortMenuOption[];
  onOpenMenu: (menuId: string | null) => void;
  onHeaderSort: () => void;
  onSelectOption: (key: LBSortKey) => void;
}> = ({
  menuId,
  label,
  active,
  direction,
  openMenu,
  options,
  onOpenMenu,
  onHeaderSort,
  onSelectOption,
}) => {
  const isOpen = openMenu === menuId;

  return (
    <div
      className="relative"
      onMouseEnter={() => onOpenMenu(menuId)}
      onMouseLeave={() => onOpenMenu(null)}
    >
      <button
        type="button"
        onClick={onHeaderSort}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
          active
            ? 'border-accent/60 bg-accent/15 text-accent'
            : 'border-border bg-background text-text-primary/85 hover:border-accent/45'
        }`}
      >
        <span className="truncate">{label}</span>
        {active ? (
          direction === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-text-primary/50" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[190px] rounded-md border border-border bg-background shadow-xl">
          {options.map((option) => (
            <button
              key={`${menuId}-${option.key}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectOption(option.key);
                onOpenMenu(null);
              }}
              className="flex w-full items-center gap-2 border-b border-border px-2 py-1.5 text-left text-xs text-text-primary transition-colors last:border-b-0 hover:bg-background-secondary"
            >
              {option.icon ? (
                <img
                  src={option.icon}
                  alt=""
                  className="h-3.5 w-3.5 object-contain"
                  style={option.iconFilter ? { filter: option.iconFilter } : undefined}
                />
              ) : (
                <span className="inline-block h-3.5 w-3.5 rounded bg-border" />
              )}
              <span className="truncate">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const BuildResultsPanel: React.FC<BuildResultsPanelProps> = ({
  builds,
  total,
  page,
  pageCount,
  rankStart,
  isLoading,
  isRefreshing,
  error,
  sort,
  direction,
  onSortChange,
  onToggleDirection,
  onPageChange,
}) => {
  const { getCharacter, getWeapon, getEcho, getFetterByElement, statIcons } = useGameData();
  const { t } = useLanguage();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [statColumns, setStatColumns] = useState<StatSortKey[]>(DEFAULT_STAT_COLUMNS);

  const cvSort = (sort === 'finalCV' || sort === 'CR' || sort === 'CD') ? sort : 'finalCV';

  const statOptions = useMemo<SortMenuOption[]>(() => (
    STAT_OPTION_KEYS.map((key) => {
      const label = getSortLabel(key);
      return {
        key,
        label,
        icon: statIcons?.[label] ?? '',
        iconFilter: ELEMENT_ICON_FILTERS[label],
      };
    })
  ), [statIcons]);

  const cvOptions = useMemo<SortMenuOption[]>(() => (
    CV_OPTIONS.map((option) => {
      const iconLabel = option.key === 'finalCV' ? 'Crit Rate' : getSortLabel(option.key);
      return {
        key: option.key,
        label: option.label,
        icon: statIcons?.[iconLabel] ?? '',
      };
    })
  ), [statIcons]);

  const firstShown = total === 0 ? 0 : Math.min(total, rankStart);
  const lastShown = total === 0 ? 0 : Math.min(total, rankStart + Math.max(builds.length - 1, 0));

  const handleSortRequest = (nextSort: LBSortKey) => {
    if (sort === nextSort) {
      onToggleDirection();
      return;
    }
    onSortChange(nextSort);
  };

  return (
    <section>
      {error && (
        <div className="mb-2 rounded-lg border border-red-500/50 bg-red-500/10 p-2 text-sm text-red-300">
          Failed to load leaderboard data: {error}
        </div>
      )}

      <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:rgba(191,173,125,0.6)_transparent] [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(191,173,125,0.6)]">
        <div className="rounded-lg border border-border bg-background/70">
          <div className={`grid ${TABLE_GRID} items-center gap-4 border-b border-border bg-background-secondary/95 p-2 text-xs font-semibold text-text-primary`}>
            <div className="text-center text-text-primary/70">#</div>
            <div>Owner</div>
            <div>Name</div>
            <div aria-hidden="true" />
            <div aria-hidden="true" />
            <div>Sets</div>
            <SortHeaderMenu
              menuId="sort-cv"
              label={CV_OPTIONS.find((entry) => entry.key === cvSort)?.label ?? 'Crit Value'}
              active={sort === 'finalCV' || sort === 'CR' || sort === 'CD'}
              direction={direction}
              openMenu={openMenu}
              options={cvOptions}
              onOpenMenu={setOpenMenu}
              onHeaderSort={() => handleSortRequest(cvSort)}
              onSelectOption={onSortChange}
            />
            {statColumns.map((columnKey, index) => (
              <SortHeaderMenu
                key={`${columnKey}-${index}`}
                menuId={`sort-stat-${index}`}
                label={getSortLabel(columnKey)}
                active={sort === columnKey}
                direction={direction}
                openMenu={openMenu}
                options={statOptions}
                onOpenMenu={setOpenMenu}
                onHeaderSort={() => handleSortRequest(columnKey)}
                onSelectOption={(nextSort) => {
                  if (!STAT_OPTION_KEYS.includes(nextSort as StatSortKey)) return;
                  setStatColumns((prev) => {
                    const next = [...prev];
                    next[index] = nextSort as StatSortKey;
                    return next;
                  });
                  onSortChange(nextSort);
                }}
              />
            ))}
          </div>

          {isLoading && (
            <div className="space-y-1.5 p-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className={`grid ${TABLE_GRID} h-14 animate-pulse rounded-md bg-background-secondary/60`} />
              ))}
            </div>
          )}

          {!isLoading && !error && builds.length === 0 && (
            <div className="p-6 text-center text-sm text-text-primary/65">
              No builds match the current filters.
            </div>
          )}

          {!isLoading && !error && builds.length > 0 && (
            <div className="divide-y divide-border/60">
              {builds.map((entry, index) => {
                const rank = rankStart + index;
                const character = getCharacter(entry.state.characterId);
                const weapon = getWeapon(entry.state.weaponId);
                const regionBadge = resolveRegionBadge(entry.state.watermark.uid);

                const characterName = character
                  ? formatCharacterDisplayName(character, {
                    baseName: t(character.nameI18n ?? { en: character.name }),
                    roverElement: entry.state.roverElement,
                  })
                  : entry.state.characterId || 'Unknown Character';
                const weaponName = weapon
                  ? t(weapon.nameI18n ?? { en: weapon.name })
                  : 'Unknown Weapon';
                const sequenceLevel = Math.max(0, Math.min(6, Math.trunc(Number(entry.state.sequence) || 0)));

                const setCounts = new Map<ElementType, number>();
                for (const panel of entry.state.echoPanels) {
                  if (!panel.id) continue;
                  const echo = getEcho(panel.id);
                  const element = panel.selectedElement ?? echo?.elements?.[0];
                  if (!element) continue;
                  setCounts.set(element, (setCounts.get(element) ?? 0) + 1);
                }
                const activeSets = [...setCounts.entries()]
                  .map(([element, count]) => {
                    const fetter = getFetterByElement(element);
                    const threshold = fetter?.pieceCount ?? 2;
                    return {
                      element,
                      count,
                      active: count >= threshold,
                      icon: fetter?.icon ?? '',
                      name: fetter ? t(fetter.name) : element,
                    };
                  })
                  .filter((entrySet) => entrySet.active)
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 2);

                return (
                  <div
                    key={entry.id}
                    className={`grid ${TABLE_GRID} items-center gap-4 p-2 text-sm transition-colors odd:bg-background/30 even:bg-background-secondary/20 hover:bg-accent/10`}
                  >
                    <div className="text-center text-text-primary/75">
                      {rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        {regionBadge && (
                          <span className={`rounded px-2 py-1 text-xs font-semibold tracking-wide ${regionBadge.className}`}>
                            {regionBadge.label}
                          </span>
                        )}
                        <span className="text-base text-text-primary">
                          {entry.state.watermark.username || 'Anonymous'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {character?.head ? (
                        <img src={character.head} alt={characterName} className="h-9 w-9 object-cover" />
                      ) : (
                        <div className="h-9 w-9 bg-border" />
                      )}
                      <span className="text-lg font-semibold text-text-primary">{characterName}</span>
                    </div>

                    <div className="flex items-end text-text-primary/75">
                      {weapon ? (
                        <img
                          src={getWeaponPaths(weapon)}
                          alt={weaponName}
                          className="h-9 w-9"
                        />
                      ) : (
                        <div className="h-9 w-9" />
                      )}
                      <span className="-ml-1.5 rounded border border-black/55 bg-black/85 px-1 py-0 text-xs leading-tight text-white">
                        R{entry.state.weaponRank}
                      </span>
                    </div>

                    <div className="flex items-center text-text-primary/75">
                      <span
                        className={`inline-flex h-6 items-center justify-start rounded border pl-2 text-left text-xs font-semibold leading-none tracking-wide ${SEQUENCE_BADGE_STYLES[sequenceLevel]}`}
                      >
                        S{sequenceLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeSets.length === 0 ? (
                        <span className="text-xs text-text-primary/50">No set</span>
                      ) : (
                        activeSets.map((setEntry) => (
                          <div key={setEntry.element} className="flex items-end gap-0.5">
                            {setEntry.icon ? (
                              <img src={setEntry.icon} alt="" className="h-7 w-7" />
                            ) : (
                              <div className="h-8 w-8" />
                            )}
                            <span className="text-xs -mb-1 -ml-0.25 font-semibold leading-none text-primary">
                              {setEntry.count}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded border border-border bg-background px-2 py-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="whitespace-nowrap text-text-primary/70">
                          {Number(entry.stats.CR ?? 0).toFixed(1)} : {Number(entry.stats.CD ?? 0).toFixed(1)}
                        </span>
                        <span
                          className="whitespace-nowrap text-sm font-semibold tracking-wide"
                          style={{ color: getCVRatingColor(entry.finalCV) }}
                        >
                          {entry.finalCV.toFixed(1)} cv
                        </span>
                      </div>
                    </div>

                    {statColumns.map((columnKey, statIndex) => {
                      const label = getSortLabel(columnKey);
                      const value = entry.stats[columnKey] ?? 0;
                      const icon = statIcons?.[label] ?? '';
                      const iconFilter = ELEMENT_ICON_FILTERS[label];
                      return (
                        <div key={`${entry.id}-${columnKey}-${statIndex}`} className="flex items-center gap-1.5 rounded border border-border bg-background px-2 py-1 text-xs text-text-primary">
                          {icon ? (
                            <img
                              src={icon}
                              alt=""
                              className="h-3.5 w-3.5 shrink-0 object-contain"
                              style={iconFilter ? { filter: iconFilter } : undefined}
                            />
                          ) : (
                            <span className="inline-block h-3.5 w-3.5 shrink-0 rounded bg-border" />
                          )}
                          <span className="truncate">{formatStatByKey(columnKey, value)}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-start">
        <div />
        <div className="justify-self-center flex items-start gap-2 text-text-primary/75 mt-4">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              className={PAGINATION_BUTTON_CLASS}
            >
              <ChevronFirst className="h-4 w-4" />
            </button>
            <span className="text-xs leading-none">first</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - PAGE_SKIP))}
              disabled={page <= 1}
              className={PAGINATION_BUTTON_CLASS}
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <span className="text-xs leading-none">skip</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className={PAGINATION_BUTTON_CLASS}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs leading-none">back</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className={PAGE_INDICATOR_CLASS}>
              {page}
            </span>
            <span className="text-xs leading-none">page</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pageCount, page + 1))}
              disabled={page >= pageCount}
              className={PAGINATION_BUTTON_CLASS}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-xs leading-none">next</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pageCount, page + PAGE_SKIP))}
              disabled={page >= pageCount}
              className={PAGINATION_BUTTON_CLASS}
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
            <span className="text-xs leading-none">skip</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(pageCount)}
              disabled={page >= pageCount}
              className={PAGINATION_BUTTON_CLASS}
            >
              <ChevronLast className="h-4 w-4" />
            </button>
            <span className="text-xs leading-none">last</span>
          </div>
        </div>

        <div className="justify-self-end self-start text-xs text-text-primary/60">
          {isRefreshing
            ? 'Updating...'
            : `${firstShown}-${lastShown} of ${total.toLocaleString()}`}
        </div>
      </div>
    </section>
  );
};
