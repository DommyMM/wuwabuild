'use client';

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ElementType } from '@/lib/echo';
import { LBBuildEntry } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import {
  formatFlatStat,
  formatPercentStat,
  formatTimestamp,
  getElementDMGLabel,
} from './buildsFormatters';

const ELEMENT_TINT_CLASS: Record<string, string> = {
  Aero: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(85,255,181,0.11)_0%,transparent_62%)]',
  Havoc: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(230,73,166,0.12)_0%,transparent_62%)]',
  Spectro: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(248,229,108,0.11)_0%,transparent_62%)]',
  Glacio: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(65,174,251,0.12)_0%,transparent_62%)]',
  Electro: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(180,107,255,0.12)_0%,transparent_62%)]',
  Fusion: 'bg-[radial-gradient(100%_70%_at_5%_0%,rgba(240,116,78,0.12)_0%,transparent_62%)]',
};

interface BuildsEntryCardProps {
  entry: LBBuildEntry;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
}

export const BuildsEntryCard: React.FC<BuildsEntryCardProps> = ({ entry, rank, expanded, onToggle }) => {
  const { getCharacter, getWeapon, getEcho, getFetterByElement } = useGameData();
  const { t } = useLanguage();

  const character = getCharacter(entry.state.characterId);
  const weapon = getWeapon(entry.state.weaponId);
  const characterName = character
    ? t(character.nameI18n ?? { en: character.name })
    : entry.state.characterId || 'Unknown Character';
  const weaponName = weapon
    ? t(weapon.nameI18n ?? { en: weapon.name })
    : entry.state.weaponId || 'Unknown Weapon';

  const setSummaries = useMemo(() => {
    const counts = new Map<ElementType, number>();
    for (const panel of entry.state.echoPanels) {
      if (!panel.id) continue;
      const echo = getEcho(panel.id);
      const element = panel.selectedElement ?? echo?.elements?.[0];
      if (!element) continue;
      counts.set(element, (counts.get(element) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([element, count]) => {
        const fetter = getFetterByElement(element);
        const threshold = fetter?.pieceCount ?? 2;
        return {
          element,
          count,
          threshold,
          icon: fetter?.icon ?? '',
          label: fetter ? t(fetter.name) : element,
          active: count >= threshold,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [entry.state.echoPanels, getEcho, getFetterByElement, t]);

  const highestElement = useMemo(() => (
    [
      { code: 'AD', value: entry.stats.AD },
      { code: 'GD', value: entry.stats.GD },
      { code: 'FD', value: entry.stats.FD },
      { code: 'ED', value: entry.stats.ED },
      { code: 'HD', value: entry.stats.HD },
      { code: 'SD', value: entry.stats.SD },
    ].reduce((best, curr) => (curr.value > best.value ? curr : best), { code: 'AD', value: 0 })
  ), [entry.stats.AD, entry.stats.ED, entry.stats.FD, entry.stats.GD, entry.stats.HD, entry.stats.SD]);

  const highestMoveBonus = useMemo(() => (
    [
      { code: 'BA', value: entry.stats.BA },
      { code: 'HA', value: entry.stats.HA },
      { code: 'RS', value: entry.stats.RS },
      { code: 'RL', value: entry.stats.RL },
    ].reduce((best, curr) => (curr.value > best.value ? curr : best), { code: 'BA', value: 0 })
  ), [entry.stats.BA, entry.stats.HA, entry.stats.RL, entry.stats.RS]);

  const activeSetSummaries = setSummaries.filter((summary) => summary.active);
  const tintClass = character?.element ? (ELEMENT_TINT_CLASS[character.element] ?? '') : '';

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-background/80 p-3 shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition-colors hover:border-accent/45">
      {tintClass && (
        <div className={`pointer-events-none absolute inset-0 ${tintClass}`} />
      )}
      <button
        type="button"
        onClick={onToggle}
        className="relative w-full text-left"
      >
        <div className="grid grid-cols-[auto_1fr] items-start gap-3 sm:grid-cols-[auto_1fr_auto]">
          <div className="rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
            #{rank}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text-primary md:text-base">
              {characterName}
            </div>
            <div className="mt-0.5 text-xs text-text-primary/70">
              {weaponName} · S{entry.state.sequence} · R{entry.state.weaponRank}
            </div>
            <div className="mt-0.5 text-xs text-text-primary/55">
              {entry.state.watermark.username || 'Anonymous'} · UID {entry.state.watermark.uid || '—'}
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 sm:mt-0">
            <span className="rounded-md border border-accent/35 bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">
              {entry.cv.toFixed(1)} CV
            </span>
            <span className="rounded-md border border-border bg-background px-2 py-1 text-xs text-text-primary/70">
              {formatTimestamp(entry.timestamp)}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-text-primary/60 transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded bg-accent/15 px-2 py-0.5 text-[11px] text-accent">
            CR {formatPercentStat(entry.stats.CR)} / CD {formatPercentStat(entry.stats.CD)}
          </span>
          <span className="rounded bg-border px-2 py-0.5 text-[11px] text-text-primary/75">
            S{entry.state.sequence}
          </span>
          <span className="rounded bg-border px-2 py-0.5 text-[11px] text-text-primary/75">
            R{entry.state.weaponRank}
          </span>
          <span className="rounded bg-border px-2 py-0.5 text-[11px] text-text-primary/75">
            {entry.state.echoPanels.filter((panel) => panel.id).length}/5 Echoes
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-primary sm:grid-cols-5">
          <div className="rounded border border-border bg-background-secondary px-2 py-1">
            ATK: {formatFlatStat(entry.stats.A)}
          </div>
          <div className="rounded border border-border bg-background-secondary px-2 py-1">
            HP: {formatFlatStat(entry.stats.H)}
          </div>
          <div className="rounded border border-border bg-background-secondary px-2 py-1">
            DEF: {formatFlatStat(entry.stats.D)}
          </div>
          <div className="rounded border border-border bg-background-secondary px-2 py-1">
            ER: {formatPercentStat(entry.stats.ER)}
          </div>
          <div className="rounded border border-border bg-background-secondary px-2 py-1">
            {getElementDMGLabel(highestElement.code)}: {formatPercentStat(highestElement.value)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {activeSetSummaries.map((summary) => (
            <span
              key={summary.element}
              className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent"
            >
              {summary.icon && (
                <img src={summary.icon} alt="" className="h-3.5 w-3.5 object-contain" />
              )}
              {summary.label} {summary.count}pc
            </span>
          ))}
          {activeSetSummaries.length === 0 && (
            <span className="text-xs text-text-primary/50">No active set bonus</span>
          )}
          <span className="ml-auto text-xs text-text-primary/55">
            Top move bonus: {getElementDMGLabel(highestMoveBonus.code)} {formatPercentStat(highestMoveBonus.value)}
          </span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded border border-border bg-background p-2">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-text-primary/55">Character</div>
                  <div className="flex items-center gap-2">
                    {character?.head ? (
                      <img src={character.head} alt={characterName} className="h-11 w-11 rounded object-cover" />
                    ) : (
                      <div className="h-11 w-11 rounded bg-border" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-primary">{characterName}</div>
                      <div className="text-xs text-text-primary/70">Lv.{entry.state.characterLevel}</div>
                    </div>
                  </div>
                </div>
                <div className="rounded border border-border bg-background p-2">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-text-primary/55">Weapon</div>
                  <div className="flex items-center gap-2">
                    {weapon ? (
                      <img src={getWeaponPaths(weapon)} alt={weaponName} className="h-11 w-11 object-contain" />
                    ) : (
                      <div className="h-11 w-11 rounded bg-border" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text-primary">{weaponName}</div>
                      <div className="text-xs text-text-primary/70">Lv.{entry.state.weaponLevel} · R{entry.state.weaponRank}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded border border-border bg-background p-2">
                <div className="mb-2 text-[11px] uppercase tracking-wide text-text-primary/55">Echoes</div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
                  {entry.state.echoPanels.map((panel, index) => {
                    const echo = panel.id ? getEcho(panel.id) : null;
                    const echoName = echo ? t(echo.nameI18n ?? { en: echo.name }) : 'Empty Slot';
                    const selectedSet = panel.selectedElement ?? echo?.elements?.[0];
                    const setIcon = selectedSet ? getFetterByElement(selectedSet)?.icon ?? '' : '';
                    return (
                      <div key={`${panel.id ?? 'empty'}-${index}`} className="rounded border border-border bg-background-secondary p-2 text-xs">
                        {echo ? (
                          <>
                            <div className="mb-1 flex items-center gap-2">
                              <img src={getEchoPaths(echo, panel.phantom)} alt={echoName} className="h-7 w-7 rounded object-contain" />
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-text-primary">{echoName}</div>
                                <div className="text-[10px] text-text-primary/60">Lv.{panel.level}</div>
                              </div>
                            </div>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              {setIcon ? <img src={setIcon} alt="" className="h-3.5 w-3.5 object-contain" /> : <span />}
                              {panel.stats.mainStat.type && (
                                <span className="truncate text-accent">
                                  {panel.stats.mainStat.type} {panel.stats.mainStat.value}
                                </span>
                              )}
                            </div>
                            <div className="space-y-0.5">
                              {panel.stats.subStats
                                .filter((sub) => sub.type && sub.value !== null)
                                .map((sub, subIndex) => (
                                  <div key={subIndex} className="flex justify-between gap-1 text-[10px] text-text-primary/70">
                                    <span className="truncate">{sub.type}</span>
                                    <span>{sub.value}</span>
                                  </div>
                                ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex min-h-20 items-center justify-center text-text-primary/40">Empty Slot</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
