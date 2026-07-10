'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEchoUsages, LBEcho, LBEchoUsage } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { calculateEchoDefaultStat } from '@/lib/calculations/echoes';
import { calculateEchoRV, getBuildCVRatingColor, getEchoCVTierStyle, getEchoRVTierStyle } from '@/lib/calculations/rollValues';
import { getSubstatTierInfo } from '@/lib/calculations/substatTiers';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getSetBonusesFromPieceEffect } from '@/lib/constants/setBonuses';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { renderGameTemplateWithHighlights, resolveFetterPieceDescription } from '@/lib/text/gameText';
import { formatDateLabel } from '@/components/leaderboards/formatters';
import { QualityTierBar, SubstatRollBar } from '@/components/leaderboards/BuildExpandedEchoPanels';
import { formatFetterBonusValue, getFetterPieceModels } from '@/components/echo/FetterHoverCard';
import { getFetterElementColor } from '@/components/echo/EchoHoverCard';

interface EchoInventoryDetailProps {
  echo: LBEcho;
  uid: string;
  isExpanded: boolean;
  onOpenBuild: (buildId: string, characterId: string) => void;
}

function statIconFor(icons: Record<string, string> | null, stat: string): string {
  return icons?.[stat] ?? icons?.[stat.replace('%', '')] ?? '';
}

function formatStatValue(stat: string | null | undefined, value: number | null | undefined): string {
  if (stat == null || value == null) return '';
  return isPercentStat(stat) ? `${Number(value).toFixed(1)}%` : String(Math.round(Number(value)));
}

const EYEBROW_CLASS = 'font-ropa text-[11px] leading-none uppercase tracking-[0.14em] text-text-primary/60';

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

// Row expansion styled after an in-game appraisal panel: artwork and Sonata on
// the left, identity and rolled stats in the primary column, and quality/context
// in the right rail. Expands/collapses with the same animation as build rows.
export const EchoInventoryDetail: React.FC<EchoInventoryDetailProps> = ({ echo, uid, isExpanded, onOpenBuild }) => {
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
  const pieceModels = set ? getFetterPieceModels(set) : [];
  const skillTemplate = echoMeta?.skill?.description ? t(echoMeta.skill.description) : '';
  const skillParams = echoMeta?.skill?.params?.[0] ?? [];
  const mainIcon = echo.mainStatType ? statIconFor(statIcons, echo.mainStatType) : '';
  const cvTier = getEchoCVTierStyle(echo.cv);
  const subs = (echo.panel?.stats.subStats ?? []).filter((s) => s.type && s.value != null);
  const rv = echo.rv > 0 ? echo.rv : calculateEchoRV(subs, getSubstatValues);
  const rvTier = getEchoRVTierStyle(rv);
  const level = echo.panel?.level ?? 25;
  const phantom = echo.panel?.phantom ?? false;
  // Fixed stat every echo of this cost grants at this level (4/3-cost flat ATK,
  // 1-cost flat HP), additive with the rolled main stat and substats.
  const baseStatType = echo.cost === 1 ? 'HP' : echo.cost === 3 || echo.cost === 4 ? 'ATK' : null;
  const baseStatValue = baseStatType ? calculateEchoDefaultStat(echo.cost, level) : 0;
  const baseIcon = baseStatType ? statIconFor(statIcons, baseStatType) : '';
  const firstSeenLabel = formatDateLabel(echo.firstSeenAt);
  const lastSeenLabel = formatDateLabel(echo.lastSeenAt);

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          className="overflow-x-visible overflow-y-hidden border-t border-border/50 bg-black/15"
        >
          <div className="px-4 py-4">
            <div className="mx-auto w-full max-w-[1320px]">
        <div
          className="relative overflow-hidden rounded-xl border border-white/12 bg-[linear-gradient(170deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.035)_34%,rgba(0,0,0,0.46)_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),inset_0_-14px_24px_rgba(0,0,0,0.18),0_8px_16px_rgba(0,0,0,0.35)]"
        >
          <div className="flex flex-col md:flex-row">
            {/* Artwork and Sonata form one visual/elemental rail; identity metadata
                lives with the stat ledger where there is more horizontal room. */}
            <div className="relative flex w-full shrink-0 flex-col md:w-80">
              <div className="relative flex h-52 shrink-0 items-center justify-center overflow-hidden">
                {echoMeta && (
                  <>
                    <img
                      src={getEchoPaths(echoMeta, phantom)}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 h-full w-full scale-125 object-cover opacity-45 blur-xl saturate-125"
                    />
                    {/* Framed portrait plate: the square asset reads deliberate with
                        a ring instead of floating hard-edged over the blur. */}
                    <img
                      src={getEchoPaths(echoMeta, phantom)}
                      alt=""
                      aria-hidden
                      className="relative z-1 my-2 h-[calc(100%-1rem)] rounded-xl object-contain shadow-[0_10px_18px_rgba(0,0,0,0.65)] ring-1 ring-white/12"
                    />
                  </>
                )}
                {/* Bottom fade blends the art into the card surface below. */}
                <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-2 h-10 bg-linear-to-t from-black/60 to-transparent" />
              </div>

              <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                {set && (
                  <div>
                    <div className={`mb-1.5 ${EYEBROW_CLASS}`}>Sonata Effect</div>
                    <div
                      className="flex min-w-0 items-center gap-2 rounded-md border bg-black/70 px-2 py-1.5"
                      style={{ borderColor: setElementColor ?? 'rgba(255,255,255,0.14)' }}
                    >
                      {set.icon && <img src={set.icon} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                      <span className="truncate text-sm font-medium text-accent">{setName}</span>
                    </div>
                    {/* Inline 2pc/5pc text (same models the hover card renders). */}
                    <div className="mt-1.5 space-y-1.5">
                      {pieceModels.map(({ pieceCount, effect }) => {
                        const bonuses = getSetBonusesFromPieceEffect(effect);
                        const renderBonuses = bonuses.length > 0 && (effect.buffIds?.length ?? 0) === 0;
                        const { renderedParts } = resolveFetterPieceDescription(effect, {
                          descriptionTemplate: t(effect.effectDescription),
                        });
                        return (
                          <div
                            key={`${set.id}-${pieceCount}`}
                            className="rounded-md bg-black/45 px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                          >
                            <div className={`mb-1 ${EYEBROW_CLASS}`}>{pieceCount}-Piece</div>
                            {renderBonuses ? (
                              <div className="space-y-0.5">
                                {bonuses.map((bonus) => (
                                  <p key={bonus.stat} className="text-xs leading-relaxed text-text-primary/80">
                                    {statLabel(bonus.stat)}{' '}
                                    <span className="font-semibold text-cyan-200">+{formatFetterBonusValue(bonus.value)}%</span>
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs leading-relaxed whitespace-pre-line text-text-primary/80">{renderedParts}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Identity and stats share the primary reading column. This keeps the
                name close to the values that define the individual echo. */}
            <div className="flex min-w-0 flex-1 flex-col border-t border-white/8 p-5 md:border-t-0 md:border-l">
              {/* Single-line header: truncating name with the level/cost chips
                  pinned at the row end so the name never wraps. */}
              <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-white/8 pb-3.5">
                <div className="min-w-0 flex-1 truncate font-gowun text-xl leading-tight font-semibold text-text-primary" title={echoName}>
                  {echoName}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded bg-white/8 px-1.5 py-1 font-gowun text-xs leading-none font-semibold tabular-nums text-text-primary/85 ring-1 ring-white/8">
                    +{level}
                  </span>
                  <span className="rounded bg-white/6 px-1.5 py-1 font-ropa text-[10px] leading-none uppercase tracking-[0.14em] text-text-primary/65 ring-1 ring-white/8">
                    {echo.cost} Cost
                  </span>
                  {phantom && (
                    <span className="rounded bg-cyan-300/8 px-1.5 py-1 text-[10px] leading-none font-semibold text-cyan-200 ring-1 ring-cyan-200/15">
                      Phantom
                    </span>
                  )}
                </div>
              </div>

              {echo.mainStatType && (
                <div className="flex items-center justify-between gap-3 rounded-md bg-white/10 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)]">
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

              {/* Fixed base stat band: quieter than the main stat because it never
                  rolls — every echo of this cost carries the same value at this level. */}
              {baseStatType && baseStatValue > 0 && (
                <div
                  className="mt-1.5 flex items-center justify-between gap-3 rounded-md bg-white/4 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                  title={`Every ${echo.cost}-cost echo grants this fixed flat ${baseStatType} at +${level}, on top of its rolled main stat and substats.`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {baseIcon ? (
                      <img src={baseIcon} alt="" className="h-5 w-5 shrink-0 object-contain opacity-80" />
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded bg-white/10" />
                    )}
                    <span className="truncate text-sm font-semibold text-text-primary/75">{statLabel(baseStatType)}</span>
                    <span className="rounded bg-white/8 px-1.5 py-0.5 font-ropa text-[9px] leading-none uppercase tracking-[0.18em] text-text-primary/50">
                      Base
                    </span>
                  </span>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-text-primary/80">
                    {formatStatValue(baseStatType, baseStatValue)}
                  </span>
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                {subs.map((sub, i) => {
                  const type = sub.type as string;
                  const icon = statIconFor(statIcons, type);
                  const label = statLabel(type);
                  const tierInfo = getSubstatTierInfo(Number(sub.value), getSubstatValues(type));
                  return (
                    <div
                      key={`${echo.echoKey}-detail-sub-${i}`}
                      className="flex items-center gap-2.5 rounded-sm bg-black/35 py-1.5 pr-3 pl-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                    >
                      {icon ? (
                        <img src={icon} alt="" className="h-4.5 w-4.5 shrink-0 object-contain" />
                      ) : (
                        <span className="h-4.5 w-4.5 shrink-0 rounded bg-white/10" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary/75" title={label}>{label}</span>
                      <div className="w-44 shrink-0 sm:w-52">
                        {/* Value already renders tier-colored at the row end. */}
                        <SubstatRollBar
                          rollValues={getSubstatValues(type) ?? []}
                          currentValue={Number(sub.value)}
                          isPercent={isPercentStat(type)}
                          showValueLabel={false}
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

            </div>

            {/* Appraisal and provenance stay secondary to the identity/stat column. */}
            <div className="flex w-full shrink-0 flex-col border-t border-white/8 p-5 md:w-76 md:border-t-0 md:border-l">
              {/* The tier bar already floats the value over the active cell, so
                  the header row carries the label only. */}
              <div className="shrink-0 space-y-3">
                <div>
                  <div className={`mb-1 ${EYEBROW_CLASS}`}>Crit Value</div>
                  <QualityTierBar currentLabel={cvTier.label} valueText={echo.cv.toFixed(1)} />
                </div>
                <div>
                  <div className={`mb-1 ${EYEBROW_CLASS}`}>Roll Value</div>
                  <QualityTierBar currentLabel={rvTier.label} valueText={`${rv.toFixed(0)}%`} />
                </div>
              </div>

              {skillTemplate && (
                <div className="mt-4 border-t border-white/8 pt-4">
                  <div className={`mb-2 ${EYEBROW_CLASS}`}>Echo Skill</div>
                  <div className="scrollbar-thin max-h-48 overflow-y-auto pr-1 text-sm leading-relaxed whitespace-pre-line text-text-primary/80 [--scrollbar-width:4px]">
                    {renderGameTemplateWithHighlights({
                      template: skillTemplate,
                      getParamValue: (index) => skillParams[index] ?? null,
                      highlightClassName: 'text-cyan-200 font-semibold',
                      keepUnknownPlaceholders: true,
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 shrink-0 border-t border-white/8 pt-3">
                <EquippedByStrip uid={uid} echoKey={echo.echoKey} usageCount={Number(echo.usageCount)} onOpenBuild={onOpenBuild} />
              </div>

              {/* Sighting date: echo identity is content-based (echo_key), so this
                  is the upload date of the first build carrying this exact echo. */}
              {firstSeenLabel && (
                <div
                  className="mt-3 shrink-0 font-ropa text-[10px] leading-none uppercase tracking-[0.14em] text-text-primary/45"
                  title={`First seen in an upload ${firstSeenLabel}${lastSeenLabel && lastSeenLabel !== firstSeenLabel ? `, last seen ${lastSeenLabel}` : ''}.`}
                >
                  Added <span className="text-text-primary/60">{firstSeenLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
