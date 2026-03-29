'use client';

import React, { useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { calculateWeaponStats } from '@/lib/calculations/stats';
import { ELEMENT_BLOOM, ELEMENT_COLOR, ELEMENT_ICON_FILTERS, ELEMENT_TINT } from '@/lib/elementVisuals';
import { LBBuildDetailEntry, LBBuildRowEntry, LB_STAT_ENTRIES } from '@/lib/lb';
import { SequenceStrip } from '@/components/card/SequenceStrip';
import { WeaponGroup } from '@/components/card/WeaponGroup';
import { ForteCardSection } from '@/components/card/ForteCardSection';
import { BuildExpandedEchoPanels } from '@/components/leaderboards/BuildExpandedEchoPanels';
import { resolveRegionBadge } from '@/components/leaderboards/formatters';

// LB stat code → full display key used by statIcons / StatsTableSection
const LB_CODE_TO_STAT_KEY: Record<string, string> = {
  H: 'HP', A: 'ATK', D: 'DEF',
  CR: 'Crit Rate', CD: 'Crit DMG',
  ER: 'Energy Regen', HB: 'Healing Bonus',
  AD: 'Aero DMG', GD: 'Glacio DMG', FD: 'Fusion DMG',
  ED: 'Electro DMG', HD: 'Havoc DMG', SD: 'Spectro DMG',
  BA: 'Basic Attack DMG', HA: 'Heavy Attack DMG',
  RS: 'Resonance Skill DMG', RL: 'Resonance Liberation DMG',
};

const FLAT_STATS = new Set(['HP', 'ATK', 'DEF']);
const ELEMENT_DMG_KEYS = new Set(['Aero DMG', 'Glacio DMG', 'Fusion DMG', 'Electro DMG', 'Havoc DMG', 'Spectro DMG']);
const ELEMENT_TO_DMG_KEY: Record<string, string> = {
  Aero: 'Aero DMG', Glacio: 'Glacio DMG', Fusion: 'Fusion DMG',
  Electro: 'Electro DMG', Havoc: 'Havoc DMG', Spectro: 'Spectro DMG',
};

const STAT_ORDER = [
  'HP', 'ATK', 'DEF',
  'Crit Rate', 'Crit DMG', 'Energy Regen', 'Healing Bonus',
  'Aero DMG', 'Glacio DMG', 'Fusion DMG', 'Electro DMG', 'Havoc DMG', 'Spectro DMG',
  'Basic Attack DMG', 'Heavy Attack DMG', 'Resonance Skill DMG', 'Resonance Liberation DMG',
];

interface LeaderboardCardProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ entry, detail }) => {
  const { getCharacter, getWeapon, getEcho, statIcons, fetters, levelCurves } = useGameData();
  const { t } = useLanguage();

  const character = getCharacter(entry.character.id);
  const weapon = getWeapon(entry.weapon.id);
  const regionBadge = resolveRegionBadge(entry.owner.uid);

  const characterName = character
    ? formatCharacterDisplayName(character, {
        baseName: t(character.nameI18n ?? { en: character.name }),
        roverElement: detail.buildState.roverElement,
      })
    : 'Unknown';

  const weaponName = weapon ? t(weapon.nameI18n ?? { en: weapon.name }) : 'Unknown Weapon';
  const element = character?.element ?? null;

  const tintClass = element ? (ELEMENT_TINT[element] ?? 'from-transparent via-transparent to-transparent') : 'from-transparent via-transparent to-transparent';
  const bloomClass = element ? (ELEMENT_BLOOM[element] ?? '') : '';
  const elementColor = element ? (ELEMENT_COLOR[element] ?? '#ffffff') : '#ffffff';
  const elementDmgKey = element ? (ELEMENT_TO_DMG_KEY[element] ?? null) : null;

  const weaponStats = useMemo(
    () => weapon ? calculateWeaponStats(weapon, entry.weapon.level, levelCurves) : null,
    [weapon, entry.weapon.level, levelCurves],
  );

  const weaponAtkIcon = statIcons?.['ATK'] ?? null;
  const weaponMainIcon = weapon?.main_stat ? (statIcons?.[weapon.main_stat] ?? null) : null;

  // Build stat rows from entry.stats, same filter logic as StatsTableSection
  const statRows = useMemo(() => {
    const stats = entry.stats as Record<string, number>;
    const valueMap: Record<string, number> = {};
    for (const lbEntry of LB_STAT_ENTRIES) {
      const key = LB_CODE_TO_STAT_KEY[lbEntry.code];
      if (!key) continue;
      valueMap[key] = stats[lbEntry.code] ?? 0;
    }
    return STAT_ORDER
      .map((key) => ({ key, value: valueMap[key] ?? 0 }))
      .filter(({ key, value }) => {
        if (value === 0) return false;
        if (ELEMENT_DMG_KEYS.has(key)) return key === elementDmgKey;
        return true;
      });
  }, [entry.stats, elementDmgKey]);

  // Active echo sets from echoSummary
  const activeSets = useMemo(() => {
    return Object.entries(entry.echoSummary.sets)
      .map(([setId, count]) => {
        const fetter = fetters.find((f) => String(f.id) === setId);
        const threshold = fetter?.pieceCount ?? 2;
        return { setId, count, active: count >= threshold, fetter };
      })
      .filter((s) => s.active)
      .sort((a, b) => b.count - a.count);
  }, [entry.echoSummary.sets, fetters]);

  const translateText = (i18n: Record<string, string> | undefined, fallback: string) =>
    t(i18n ?? { en: fallback });

  const forte = detail.buildState.forte;
  const sequenceLevel = Math.max(0, Math.min(6, Math.trunc(Number(entry.sequence) || 0)));

  const formatValue = (key: string, value: number) =>
    FLAT_STATS.has(key) ? Math.round(value).toLocaleString() : `${value.toFixed(1)}%`;

  return (
    <div className="font-plus-jakarta tracking-wide leading-none text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
      <div className="relative overflow-hidden rounded-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')] aspect-[2.4/1]">
        {/* Background overlays */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/10" />
          <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
          <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_35%,rgba(0,0,0,0.22)_100%)]" />
        </div>

        {/* watermark */}
        <div className="pointer-events-none absolute right-3/8 top-8/25 z-10 text-right text-xs font-semibold tracking-[0.18em] text-white/18 lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          wuwa.build
        </div>

        <div className="relative z-10 flex h-full">
          {/* ── LEFT: Character portrait, full card height ── */}
          <div className="relative shrink-0 overflow-hidden" style={{ width: '22%' }}>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.02)_42%,rgba(0,0,0,0.34)_100%)]" />
            <div className={`absolute bottom-0 left-0 right-0 h-1/3 bg-linear-to-t ${tintClass} opacity-40 mix-blend-screen pointer-events-none`} />
            {character?.banner ? (
              <img
                src={character.banner}
                alt={characterName}
                className="absolute inset-0 h-full w-full object-contain object-bottom"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 bg-white/5" />
            )}
          </div>

          {/* ── RIGHT: name/weapon/forte + stats + echoes ── */}
          <div className="flex flex-col w-full min-w-0">
            <div className="flex flex-1 min-h-0">
              {/* Left block: sequence + name + weapon + forte + sets */}
              <div className="flex min-w-0 shrink-0 flex-col pt-4 gap-1" style={{ minWidth: '420px' }}>
                <div className="flex gap-4">
                  <SequenceStrip
                    chains={character?.chains ?? []}
                    sequence={sequenceLevel}
                    element={element ?? ''}
                    characterName={character?.nameI18n}
                  />
                  <div className="flex flex-1 min-w-0 flex-col space-y-2">
                    {/* Name + level */}
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-4xl text-white">{characterName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl text-white">Lv.{detail.buildState.characterLevel ?? 90}/90</span>
                        {character?.elementIcon && (
                          <img src={character.elementIcon} alt={element ?? ''} className="h-8 w-8 object-contain" />
                        )}
                        {character?.roleIcon && (
                          <img src={character.roleIcon} alt="" className="h-8 w-8 object-contain" />
                        )}
                      </div>
                      {/* Owner info */}
                      <div className="flex items-center gap-2 mt-1 text-sm text-white/55">
                        {regionBadge && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${regionBadge.className}`}>
                            {regionBadge.label}
                          </span>
                        )}
                        <span>{entry.owner.username || 'Anonymous'}</span>
                        <span className="text-white/35">UID {entry.owner.uid}</span>
                      </div>
                    </div>

                    {/* Weapon */}
                    {weapon && weaponStats ? (
                      <WeaponGroup
                        weapon={weapon}
                        weaponStats={weaponStats}
                        weaponLevel={entry.weapon.level}
                        weaponRank={entry.weapon.rank}
                        weaponAtkIcon={weaponAtkIcon}
                        weaponMainIcon={weaponMainIcon}
                      />
                    ) : (
                      <div className="flex items-center gap-2 opacity-85">
                        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-white/24 bg-black/22">
                          <span className="text-2xl font-semibold leading-none text-white/32">?</span>
                        </div>
                        <span className="text-2xl font-semibold text-white/55">{weaponName}</span>
                      </div>
                    )}

                    {/* Forte */}
                    {character && forte && (
                      <ForteCardSection character={character} forte={forte} />
                    )}
                  </div>
                </div>

                {/* Active sets + CV */}
                <div className="flex gap-2 pt-2 pl-4 text-sm font-semibold leading-none">
                  <div className="flex items-center rounded-xl bg-black/35 p-1.5">
                    <span className="rounded-md" style={{ color: elementColor }}>{entry.cv.toFixed(1)} CV</span>
                  </div>
                  {activeSets.map(({ setId, count, fetter }) => {
                    const displayName = fetter ? t(fetter.name) : `Set ${setId}`;
                    const words = displayName.trim().split(/\s+/u).filter(Boolean);
                    const shouldSplit = words.length >= 3 || (words.length === 2 && displayName.length >= 16);
                    const setNameContent = shouldSplit
                      ? <>{words.slice(0, Math.min(2, words.length - 1)).join(' ')}<br />{words.slice(Math.min(2, words.length - 1)).join(' ')}</>
                      : displayName;
                    const pieceLabel = count >= 5 ? '5' : count >= 3 && (fetter?.pieceCount ?? 2) === 3 ? '3' : '2';
                    return (
                      <div key={setId} className="flex h-8 max-w-45 items-center gap-2 rounded-xl bg-black/35 px-2 py-1">
                        {fetter?.icon && <img src={fetter.icon} alt="" className="h-5 w-5 object-contain" />}
                        <span className={`text-center ${shouldSplit ? 'text-xs leading-none' : ''}`}>{setNameContent}</span>
                        <span className="rounded-md border border-amber-300/55 bg-amber-300/18 px-1 text-xs">{pieceLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Stats table — mirrors StatsTableSection */}
              <div className={`flex h-full w-full flex-col px-8 pl-2 ${statRows.length >= 12 ? 'justify-start pt-2' : 'justify-center pt-4'}`}>
                {statRows.map(({ key, value }) => {
                  const icon = statIcons?.[key] ?? statIcons?.[key.replace('%', '')];
                  const filter = ELEMENT_ICON_FILTERS[key];
                  const isFlatStat = FLAT_STATS.has(key);
                  const isDense = statRows.length >= 12;
                  return (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-md font-medium ${isDense ? 'min-h-0 flex-1 gap-1.5' : `gap-2 ${isFlatStat ? 'h-9' : 'h-8.5'}`}`}
                    >
                      <div className={`flex items-center min-w-0 ${isDense ? 'gap-1.5' : 'gap-2'}`}>
                        {icon ? (
                          <img src={icon} alt={key} className="h-6 w-6 shrink-0 object-contain" style={filter ? { filter } : undefined} />
                        ) : null}
                        <span className="min-w-0 text-lg leading-tight">{key}</span>
                      </div>
                      <span className="text-lg text-white/95 leading-tight">{formatValue(key, value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Echo panels */}
            <BuildExpandedEchoPanels
              detail={detail}
              character={character}
              characterName={characterName}
              regionBadge={regionBadge}
              statIcons={statIcons}
              getEcho={getEcho}
              translateText={translateText}
              activeSelectedSubstats={new Set<string>()}
              hasSelectedSubstats={false}
              showHeader={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
