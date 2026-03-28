'use client';

import React, { useMemo } from 'react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCharacterDisplayName } from '@/lib/character';
import { ELEMENT_BLOOM, ELEMENT_COLOR, ELEMENT_ICON_FILTERS, ELEMENT_TINT } from '@/lib/elementVisuals';
import { LBBuildDetailEntry, LBBuildRowEntry, LB_STAT_ENTRIES } from '@/lib/lb';
import { getWeaponPaths } from '@/lib/paths';
import { SEQUENCE_BADGE_STYLES } from '@/components/leaderboards/constants';
import { BuildExpandedEchoPanels } from '@/components/leaderboards/BuildExpandedEchoPanels';
import { resolveRegionBadge } from '@/components/leaderboards/formatters';

// Stat display config: code → label shown, whether it's a percent
const STAT_ROWS: Array<{ code: string; label: string; isPercent: boolean }> = [
  { code: 'H',  label: 'HP',                          isPercent: false },
  { code: 'A',  label: 'ATK',                         isPercent: false },
  { code: 'D',  label: 'DEF',                         isPercent: false },
  { code: 'ER', label: 'Energy Regen',                isPercent: true  },
  { code: 'CR', label: 'Crit Rate',                   isPercent: true  },
  { code: 'CD', label: 'Crit DMG',                    isPercent: true  },
];

// Element DMG codes in priority order — first non-zero wins
const ELEMENT_DMG_CODES = ['AD', 'GD', 'FD', 'ED', 'HD', 'SD'] as const;
const ELEMENT_DMG_LABELS: Record<string, string> = {
  AD: 'Aero DMG Bonus',
  GD: 'Glacio DMG Bonus',
  FD: 'Fusion DMG Bonus',
  ED: 'Electro DMG Bonus',
  HD: 'Havoc DMG Bonus',
  SD: 'Spectro DMG Bonus',
};

const BONUS_ROWS: Array<{ code: string; label: string }> = [
  { code: 'BA', label: 'Basic Attack DMG Bonus' },
  { code: 'HA', label: 'Heavy Attack DMG Bonus' },
  { code: 'RS', label: 'Resonance Skill DMG Bonus' },
  { code: 'RL', label: 'Resonance Liberation DMG Bonus' },
];

function formatFlat(value: number): string {
  return Math.round(value).toLocaleString();
}
function formatPct(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface LeaderboardCardProps {
  entry: LBBuildRowEntry;
  detail: LBBuildDetailEntry;
  /** globalRank of this build; undefined when not available (browse context) */
  globalRank?: number;
  /** total entries on the leaderboard for TOP% calculation */
  totalEntries?: number;
  /** damage value from leaderboard row */
  damage?: number;
  activeTrackKey?: string;
  activeWeaponId?: string;
  teamCharacterIds?: string[];
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  entry,
  detail,
  globalRank,
  totalEntries,
  damage,
  activeTrackKey,
  activeWeaponId,
  teamCharacterIds = [],
}) => {
  const { getCharacter, getWeapon, getEcho, statIcons } = useGameData();
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
  const tintClass = element
    ? (ELEMENT_TINT[element] ?? 'from-transparent via-transparent to-transparent')
    : 'from-transparent via-transparent to-transparent';
  const bloomClass = element ? (ELEMENT_BLOOM[element] ?? '') : '';
  const elementColor = element ? (ELEMENT_COLOR[element] ?? '#ffffff') : '#ffffff';
  const elementIconFilter = element ? (ELEMENT_ICON_FILTERS[`${element} DMG`] ?? undefined) : undefined;

  const sequenceLevel = Math.max(0, Math.min(6, Math.trunc(Number(entry.sequence) || 0)));
  const seqBadgeClass = SEQUENCE_BADGE_STYLES[sequenceLevel];

  // Build stat rows from entry.stats
  const statRows = useMemo(() => {
    const stats = entry.stats as Record<string, number>;
    const rows: Array<{ label: string; value: string; icon: string | undefined; filter?: string }> = [];

    for (const row of STAT_ROWS) {
      const rawValue = stats[row.code] ?? 0;
      if (rawValue === 0 && row.code !== 'H') continue;
      const statEntry = LB_STAT_ENTRIES.find((e) => e.code === row.code);
      const iconKey = statEntry?.label ?? row.label;
      rows.push({
        label: row.label,
        value: row.isPercent ? formatPct(rawValue) : formatFlat(rawValue),
        icon: statIcons?.[iconKey] ?? undefined,
      });
    }

    // Element DMG — first non-zero
    for (const code of ELEMENT_DMG_CODES) {
      const rawValue = stats[code] ?? 0;
      if (rawValue > 0) {
        const fullLabel = ELEMENT_DMG_LABELS[code] ?? code;
        const shortLabel = fullLabel.replace(' Bonus', '');
        const entryData = LB_STAT_ENTRIES.find((e) => e.code === code);
        const iconKey = entryData?.label ?? shortLabel;
        rows.push({
          label: fullLabel,
          value: formatPct(rawValue),
          icon: statIcons?.[iconKey] ?? undefined,
          filter: ELEMENT_ICON_FILTERS[shortLabel] ?? undefined,
        });
        break;
      }
    }

    // Bonus rows
    for (const row of BONUS_ROWS) {
      const rawValue = stats[row.code] ?? 0;
      if (rawValue === 0) continue;
      const entryData = LB_STAT_ENTRIES.find((e) => e.code === row.code);
      const iconKey = entryData?.label ?? row.label;
      rows.push({
        label: row.label,
        value: formatPct(rawValue),
        icon: statIcons?.[iconKey] ?? undefined,
      });
    }

    return rows;
  }, [entry.stats, statIcons]);

  // Rank display
  const hasRank = typeof globalRank === 'number' && globalRank > 0;
  const rankDisplay = hasRank ? `#${globalRank.toLocaleString()}` : '—';
  const topPct = hasRank && totalEntries && totalEntries > 0
    ? ((globalRank! / totalEntries) * 100)
    : null;
  const topPctDisplay = topPct !== null
    ? topPct < 0.01 ? 'TOP <0.01%' : `TOP ${topPct.toFixed(topPct < 1 ? 2 : 1)}%`
    : null;

  // Rank color: gold for 1, silver for 2, bronze for 3, white otherwise
  const rankColorClass = globalRank === 1
    ? 'text-amber-300'
    : globalRank === 2
      ? 'text-zinc-300'
      : globalRank === 3
        ? 'text-amber-600'
        : 'text-white/90';

  // Weapon stats
  const weaponMainStatLabel = weapon?.main_stat ?? null;
  const weaponMainValue = detail.buildState.weaponLevel
    ? null // could compute, but we just show from entry
    : null;

  const translateText = (i18n: Record<string, string> | undefined, fallback: string) =>
    t(i18n ?? { en: fallback });

  // Team portraits
  const teamMembers = teamCharacterIds
    .map((id) => getCharacter(id))
    .filter(Boolean) as NonNullable<ReturnType<typeof getCharacter>>[];

  return (
    <div className="font-plus-jakarta tracking-wide leading-none text-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
      {/* Main card frame */}
      <div className="relative overflow-hidden rounded-lg bg-cover bg-center bg-[url('https://files.wuthery.com/p/GameData/UIResources/Common/Image/BgCg/T_Bg1_UI.png')]">
        {/* Background overlays */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/10" />
          <div className={`absolute inset-0 bg-linear-to-b ${tintClass}`} />
          <div className={`absolute inset-0 mix-blend-screen ${bloomClass}`} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,transparent_35%,rgba(0,0,0,0.22)_100%)]" />
        </div>

        {/* wuwa.build watermark */}
        <div className="pointer-events-none absolute right-4 top-3 z-10 text-right text-xs font-semibold tracking-[0.18em] text-white/18 lowercase [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]">
          wuwa.build
        </div>

        {/* Three-column layout */}
        <div className="relative z-10 flex" style={{ minHeight: '340px' }}>

          {/* ── LEFT COLUMN: Portrait + Weapon (~22%) ── */}
          <div className="relative flex w-[22%] shrink-0 flex-col overflow-hidden rounded-r-[36px] shadow-[4px_0_15px_rgba(0,0,0,0.2)]">
            {/* Portrait fills top portion */}
            <div className="relative flex-1 overflow-hidden">
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

            {/* Weapon card pinned at bottom of left column */}
            <div className="shrink-0 border-t border-white/12 bg-black/40 px-3 py-2.5 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                {weapon ? (
                  <img
                    src={getWeaponPaths(weapon)}
                    alt={weaponName}
                    className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded bg-white/8" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold leading-tight text-white/92">
                    {weaponName}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="rounded border border-white/20 bg-black/45 px-1.5 py-0.5 text-[11px] font-medium text-white/75">
                      Lv.{entry.weapon.level}
                    </span>
                    <span className="rounded border border-white/16 bg-black/45 px-1.5 py-0.5 text-[11px] font-medium text-white/75">
                      R{entry.weapon.rank}
                    </span>
                  </div>
                  {weaponMainStatLabel && (
                    <div className="mt-1 text-[11px] text-white/55">{weaponMainStatLabel}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── CENTER COLUMN: Header + Stats (~40%) ── */}
          <div className="flex flex-1 flex-col px-4 py-3">
            {/* Header row */}
            <div className="mb-3 flex items-start gap-2">
              {character?.elementIcon && (
                <img
                  src={character.elementIcon}
                  alt={element ?? ''}
                  className="mt-0.5 h-5 w-5 shrink-0 object-contain"
                  style={elementIconFilter ? { filter: elementIconFilter } : undefined}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold leading-tight text-white/95">{characterName}</span>
                  <span
                    className={`inline-flex h-5.5 items-center justify-start rounded border pl-1.5 pr-2 text-xs font-semibold leading-none tracking-wide ${seqBadgeClass}`}
                  >
                    S{sequenceLevel}
                  </span>
                  <span className="text-sm text-white/55">Lv.90/90</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                  {regionBadge && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${regionBadge.className}`}>
                      {regionBadge.label}
                    </span>
                  )}
                  <span>{entry.owner.username || 'Anonymous'}</span>
                  <span className="text-white/35">UID {entry.owner.uid}</span>
                </div>
              </div>
            </div>

            {/* Stats table — two columns */}
            <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-0.5 content-start">
              {statRows.map((row, i) => (
                <div
                  key={`stat-${i}-${row.label}`}
                  className="flex items-center justify-between rounded px-1 py-1"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {row.icon ? (
                      <img
                        src={row.icon}
                        alt=""
                        className="h-4.5 w-4.5 shrink-0 object-contain"
                        style={row.filter ? { filter: row.filter } : undefined}
                      />
                    ) : (
                      <span className="h-4.5 w-4.5 shrink-0 rounded bg-white/12" />
                    )}
                    <span className="truncate text-sm font-medium text-white/72">{row.label}</span>
                  </div>
                  <span className="ml-2 shrink-0 text-sm font-semibold text-white/95">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Rank Panel (~38%) ── */}
          <div className="flex w-[28%] shrink-0 flex-col justify-between border-l border-white/10 bg-black/18 px-4 py-3 backdrop-blur-[2px]">
            {/* Rank hero */}
            <div className="flex flex-col items-center justify-center gap-1 py-2">
              <div className={`text-6xl font-black tracking-tight leading-none ${rankColorClass} [text-shadow:0_2px_18px_rgba(0,0,0,0.6)]`}>
                {rankDisplay}
              </div>
              {damage ? (
                <div className="mt-1 text-center text-xl font-bold text-white/85">
                  {damage.toLocaleString()}
                </div>
              ) : null}
              {(activeTrackKey || activeWeaponId) && (
                <div className="mt-0.5 text-center text-xs font-medium text-white/45">
                  {activeTrackKey?.toUpperCase()}{activeTrackKey && activeWeaponId ? ' · ' : ''}{activeWeaponId}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="my-1 h-px w-full bg-white/10" />

            {/* Team portraits */}
            {teamMembers.length > 0 && (
              <div className="flex flex-col gap-1.5 py-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-white/35">Team</span>
                <div className="flex gap-1.5">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="relative h-9 w-9 overflow-hidden rounded-lg border border-white/16 bg-black/35"
                      title={t(member.nameI18n ?? { en: member.name })}
                    >
                      {member.head ? (
                        <img src={member.head} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-white/8" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            {teamMembers.length > 0 && <div className="my-1 h-px w-full bg-white/10" />}

            {/* Bottom metrics */}
            <div className="flex flex-col gap-1.5 py-1">
              {topPctDisplay && (
                <div
                  className="self-start rounded-md border border-white/20 bg-black/35 px-2.5 py-1 text-xs font-bold tracking-wide"
                  style={{ color: elementColor }}
                >
                  {topPctDisplay}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-white/55">
                <span className="font-semibold text-white/80">{entry.cv.toFixed(1)}</span>
                <span>CV</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW: Echo panels (full width) ── */}
        <div className="relative z-10 border-t border-white/10 bg-black/18 px-3 py-3">
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
  );
};
