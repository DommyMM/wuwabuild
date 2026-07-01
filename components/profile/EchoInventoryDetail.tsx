'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEchoUsages, LBEcho, LBEchoUsage } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { calculateEchoRV, getBuildCVRatingColor, getEchoCVFrameColor, getEchoCVTierStyle, getEchoRVTierStyle } from '@/lib/calculations/rollValues';
import { getSubstatTierInfo } from '@/lib/calculations/substatTiers';
import { isPercentStat } from '@/lib/constants/statMappings';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { renderGameTemplateWithHighlights } from '@/lib/text/gameText';
import { QualityTierBar, SubstatRollBar } from '@/components/leaderboards/BuildExpandedEchoPanels';
import { FetterHoverCard } from '@/components/echo/FetterHoverCard';
import { getFetterElementColor } from '@/components/echo/EchoHoverCard';

interface EchoInventoryDetailProps {
  echo: LBEcho;
  uid: string;
  /** Surface a build in the profile's own builds table (expand + scroll) instead of leaving the page. */
  onOpenBuild: (buildId: string, characterId: string) => void;
}

function statIconFor(icons: Record<string, string> | null, stat: string): string {
  return icons?.[stat] ?? icons?.[stat.replace('%', '')] ?? '';
}

function formatStatValue(stat: string | null | undefined, value: number | null | undefined): string {
  if (stat == null || value == null) return '';
  return isPercentStat(stat) ? `${Number(value).toFixed(1)}%` : String(Math.round(Number(value)));
}

const EYEBROW_CLASS = 'font-ropa text-[10px] leading-none uppercase tracking-[0.18em] text-text-primary/50';

// Lazy "Equipped by" strip, phrased like the in-game panel: which of this
// player's builds equip this echo. Mounts only when a row is expanded, so the
// fetch is deferred until opened; remounts fresh per echo, so no in-place reset.
const EquippedByStrip: React.FC<{
  uid: string;
  echoKey: string;
  usageCount: number;
  onOpenBuild: (buildId: string, characterId: string) => void;
}> = ({ uid, echoKey, usageCount, onOpenBuild }) => {
  const { getCharacter, getWeapon } = useGameData();
  const { t } = useLanguage();
  const [usages, setUsages] = useState<LBEchoUsage[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getEchoUsages(uid, echoKey, controller.signal)
      .then((rows) => { if (active) setUsages(rows); })
      .catch((err) => { if (active && !controller.signal.aborted) { setError(true); void err; } });
    return () => { active = false; controller.abort(); };
  }, [uid, echoKey]);

  return (
    <div className="min-w-0">
      <div className={`mb-1.5 ${EYEBROW_CLASS}`}>Equipped by</div>
      {usages === null && !error ? (
        <div className="flex gap-1.5">
          {Array.from({ length: Math.min(4, Math.max(1, usageCount)) }).map((_, i) => (
            <div key={i} className="h-11 w-11 animate-pulse rounded-md bg-black/45" />
          ))}
        </div>
      ) : error ? (
        <div className="text-xs text-red-300/80">Could not load builds.</div>
      ) : usages && usages.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {usages.map((u) => {
            const character = getCharacter(u.characterId);
            const weapon = getWeapon(u.weaponId);
            const charName = character ? t(character.nameI18n ?? { en: character.name }) : u.characterId;
            const borderColor = getBuildCVRatingColor(u.cv, u.mainStats);
            return (
              <button
                key={`${u.buildId}-${u.slotIndex}`}
                type="button"
                onClick={() => onOpenBuild(u.buildId, u.characterId)}
                title={`${charName} · ${u.cv.toFixed(1)} CV${u.sequence > 0 ? ` · S${u.sequence}` : ''} · view build`}
                className="group/usage relative block h-11 w-11 cursor-pointer overflow-hidden rounded-md border bg-black/55 shadow-[0_4px_10px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
                style={{ borderColor }}
              >
                {character?.head ? (
                  <img src={character.head} alt={charName} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[10px] text-text-primary/50">{charName.slice(0, 3)}</span>
                )}
                {weapon && (
                  <img
                    src={getWeaponPaths(weapon)}
                    alt=""
                    className="absolute right-0 bottom-0 h-4 w-4 rounded-tl bg-black/75 object-contain p-px"
                  />
                )}
                {/* Hover flips the tile from portrait to the build's CV readout. */}
                <span
                  className="absolute inset-0 flex flex-col items-center justify-center bg-black/72 opacity-0 transition-opacity group-hover/usage:opacity-100"
                  style={{ color: borderColor }}
                >
                  <span className="text-[11px] font-bold leading-none tabular-nums">{u.cv.toFixed(1)}</span>
                  <span className="mt-0.5 text-[8px] font-semibold leading-none tracking-wide text-text-primary/70 uppercase">
                    {u.sequence > 0 ? `S${u.sequence} · CV` : 'CV'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-text-primary/45">Not equipped in any build.</div>
      )}
    </div>
  );
};

// Row expansion styled after the in-game echo detail panel: an identity card
// with the art and sonata on the left, and a stat ledger on the right where
// each substat carries its roll ladder and tier-colored value, footed by CV/RV
// graded on the shared quality ladder. Fixed width, centered in the band.
export const EchoInventoryDetail: React.FC<EchoInventoryDetailProps> = ({ echo, uid, onOpenBuild }) => {
  const { getEcho, getSubstatValues, statIcons, statTranslations, fetters } = useGameData();
  const { t } = useLanguage();

  const fetterById = useMemo(() => {
    const map = new Map<string, (typeof fetters)[number]>();
    for (const fetter of fetters) map.set(String(fetter.id), fetter);
    return map;
  }, [fetters]);

  const statLabel = (type: string) => (statTranslations?.[type] ? t(statTranslations[type]) : type);

  const echoMeta = getEcho(echo.echoId);
  const echoName = echoMeta ? t(echoMeta.nameI18n ?? { en: echoMeta.name }) : echo.echoId;
  const set = fetterById.get(echo.activeSetId);
  const setName = set ? t(set.name) : '';
  const setElementColor = set ? getFetterElementColor(set) : undefined;
  const skillTemplate = echoMeta?.skill?.description ? t(echoMeta.skill.description) : '';
  const skillParams = echoMeta?.skill?.params?.[0] ?? [];
  const mainIcon = echo.mainStatType ? statIconFor(statIcons, echo.mainStatType) : '';
  const cvFrame = getEchoCVFrameColor(echo.cv);
  const cvTier = getEchoCVTierStyle(echo.cv);
  const subs = (echo.panel?.stats.subStats ?? []).filter((s) => s.type && s.value != null);
  const rv = echo.rv > 0 ? echo.rv : calculateEchoRV(subs, getSubstatValues);
  const rvTier = getEchoRVTierStyle(rv);
  const level = echo.panel?.level ?? 25;
  const phantom = echo.panel?.phantom ?? false;

  return (
    <div className="border-t border-border/50 bg-black/15 px-4 py-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={`mx-auto w-full ${skillTemplate ? 'max-w-6xl' : 'max-w-5xl'}`}
      >
        <div
          className="relative overflow-hidden rounded-xl border bg-[linear-gradient(170deg,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.04)_30%,rgba(0,0,0,0.46)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.35)]"
          style={{ borderColor: `${cvFrame}b3` }}
        >
          <div className="flex flex-col md:flex-row">
            {/* Identity card: art backdrop, gold name, cost, sonata, equipped-by. */}
            <div className="relative w-full shrink-0 overflow-hidden md:w-75">
              {echoMeta && (
                <img
                  src={getEchoPaths(echoMeta, phantom)}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 h-full w-full object-cover object-top opacity-90 mask-[linear-gradient(to_right,black_55%,transparent_100%)]"
                />
              )}
              {/* Scrim keeps the lower half readable, like the in-game card fading its art out. */}
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />

              <div className="relative flex h-full min-h-55 flex-col p-4">
                <div
                  className="font-gowun text-xl leading-tight font-bold text-amber-200 drop-shadow-[0_2px_5px_rgba(0,0,0,0.95)]"
                  title={echoName}
                >
                  {echoName}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-black/70 px-1.5 py-1 font-gowun text-xs leading-none font-bold tabular-nums text-amber-200">
                    +{level}
                  </span>
                  <span className="rounded bg-black/70 px-1.5 py-1 font-ropa text-[10px] leading-none uppercase tracking-[0.18em] text-amber-200/85">
                    {echo.cost} Cost
                  </span>
                  {phantom && (
                    <span className="rounded bg-black/70 px-1.5 py-1 text-[10px] leading-none font-semibold text-cyan-300">
                      Phantom
                    </span>
                  )}
                </div>

                <div className="flex-1" />

                {set && (
                  <div className="mb-3">
                    <div className={`mb-1.5 ${EYEBROW_CLASS}`}>Sonata Effect</div>
                    <FetterHoverCard fetter={set} placement="top" triggerClassName="inline-flex max-w-full cursor-pointer">
                      <span
                        className="flex min-w-0 items-center gap-2 rounded-md border bg-black/70 px-2 py-1.5"
                        style={{ borderColor: setElementColor ?? 'rgba(255,255,255,0.14)' }}
                      >
                        {set.icon && <img src={set.icon} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                        <span className="truncate text-sm font-medium text-accent">{setName}</span>
                      </span>
                    </FetterHoverCard>
                  </div>
                )}

                <EquippedByStrip uid={uid} echoKey={echo.echoKey} usageCount={Number(echo.usageCount)} onOpenBuild={onOpenBuild} />
              </div>
            </div>

            {/* Stat ledger: bright main band, then substat rows carrying their
                roll ladder mid-row with the tier-colored value right-aligned. */}
            <div className="min-w-0 flex-1 border-t border-white/8 p-4 md:border-t-0 md:border-l">
              {echo.mainStatType && (
                <div className="flex items-center justify-between gap-3 rounded-md bg-white/10 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]">
                  <span className="flex min-w-0 items-center gap-2">
                    {mainIcon ? (
                      <img
                        src={mainIcon}
                        alt=""
                        className="h-5 w-5 shrink-0 object-contain"
                        style={ELEMENT_ICON_FILTERS[echo.mainStatType] ? { filter: ELEMENT_ICON_FILTERS[echo.mainStatType] } : undefined}
                      />
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded bg-white/15" />
                    )}
                    <span className="truncate text-sm font-semibold text-text-primary/90">{statLabel(echo.mainStatType)}</span>
                  </span>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-text-primary">
                    {formatStatValue(echo.mainStatType, echo.mainStatValue)}
                  </span>
                </div>
              )}

              <div className="mt-2 space-y-1">
                {subs.map((sub, i) => {
                  const type = sub.type as string;
                  const icon = statIconFor(statIcons, type);
                  const label = statLabel(type);
                  const tierInfo = getSubstatTierInfo(Number(sub.value), getSubstatValues(type));
                  return (
                    <div
                      key={`${echo.echoKey}-detail-sub-${i}`}
                      className="flex items-center gap-2.5 rounded-sm bg-black/35 py-1 pr-3 pl-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                    >
                      {icon ? (
                        <img src={icon} alt="" className="h-4.5 w-4.5 shrink-0 object-contain" />
                      ) : (
                        <span className="h-4.5 w-4.5 shrink-0 rounded bg-white/10" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary/75" title={label}>{label}</span>
                      <div className="w-44 shrink-0 sm:w-52">
                        <SubstatRollBar
                          rollValues={getSubstatValues(type) ?? []}
                          currentValue={Number(sub.value)}
                          isPercent={isPercentStat(type)}
                        />
                      </div>
                      <span
                        className="w-14 shrink-0 text-right text-base font-semibold tabular-nums"
                        style={tierInfo ? { color: tierInfo.color } : undefined}
                      >
                        {formatStatValue(type, sub.value)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grade footer: CV and RV side by side on the shared quality ladder. */}
              <div className="mt-3 grid grid-cols-2 gap-x-6 border-t border-white/8 pt-2.5">
                <div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className={EYEBROW_CLASS}>Crit Value</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${cvTier.isMax ? 'cv-glow' : ''}`}
                      style={cvTier.isMax ? undefined : { color: cvTier.color }}
                    >
                      {echo.cv.toFixed(1)}
                    </span>
                  </div>
                  <QualityTierBar currentLabel={cvTier.label} valueText={echo.cv.toFixed(1)} />
                </div>
                <div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className={EYEBROW_CLASS}>Roll Value</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${rvTier.isMax ? 'cv-glow' : ''}`}
                      style={rvTier.isMax ? undefined : { color: rvTier.color }}
                    >
                      {rv.toFixed(0)}%
                    </span>
                  </div>
                  <QualityTierBar currentLabel={rvTier.label} valueText={`${rv.toFixed(0)}%`} />
                </div>
              </div>
            </div>

            {/* Echo skill: the in-game panel's description text, params at level 1. */}
            {skillTemplate && (
              <div className="w-full shrink-0 border-t border-white/8 p-4 md:w-72 md:border-t-0 md:border-l">
                <div className={`mb-2 ${EYEBROW_CLASS}`}>Echo Skill</div>
                <div className="scrollbar-thin max-h-56 overflow-y-auto pr-1 text-xs leading-relaxed whitespace-pre-line text-text-primary/80 [--scrollbar-width:4px]">
                  {renderGameTemplateWithHighlights({
                    template: skillTemplate,
                    getParamValue: (index) => skillParams[index] ?? null,
                    highlightClassName: 'text-cyan-200 font-semibold',
                    keepUnknownPlaceholders: true,
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
