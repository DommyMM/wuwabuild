'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useGameData } from '@/contexts/GameDataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getEchoUsages, LBEcho, LBEchoUsage } from '@/lib/lb';
import { getEchoPaths, getWeaponPaths } from '@/lib/paths';
import { calculateEchoDefaultStat } from '@/lib/calculations/echoes';
import { calculateEchoRV, ECHO_SUBSTAT_CV_MAX, getBuildCVRatingColor, getEchoCVFrameColor, getEchoCVTierStyle, getEchoRVTierStyle } from '@/lib/calculations/rollValues';
import { getSubstatTierInfo } from '@/lib/calculations/substatTiers';
import { isPercentStat } from '@/lib/constants/statMappings';
import { getSetBonusesFromPieceEffect } from '@/lib/constants/setBonuses';
import { ELEMENT_ICON_FILTERS } from '@/lib/elementVisuals';
import { renderGameTemplateWithHighlights, resolveFetterPieceDescription } from '@/lib/text/gameText';
import { formatDateLabel } from '@/components/leaderboards/formatters';
import { SubstatRollBar, TierLadder } from '@/components/echo/StatTierBars';
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

const EYEBROW_CLASS = 'font-ropa text-2xs leading-none uppercase tracking-[0.14em] text-text-primary/60';

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
        <div className="text-xs text-red-300/80">Could not load builds</div>
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
                  <span className="flex h-full w-full items-center justify-center text-3xs text-text-primary/50">{charName.slice(0, 3)}</span>
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
                  <span className="text-2xs font-bold leading-none tabular-nums">{u.cv.toFixed(1)}</span>
                  <span className="mt-0.5 text-[8px] font-semibold leading-none tracking-wide text-text-primary/70 uppercase">
                    {u.sequence > 0 ? `S${u.sequence} · CV` : 'CV'}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-xs text-text-primary/45">Not equipped in any build</div>
      )}
    </div>
  );
};
  
export const EchoInventoryDetail: React.FC<EchoInventoryDetailProps> = ({ echo, uid, isExpanded, onOpenBuild }) => {
  const { getEcho, getSubstatValues, statIcons, statTranslations, fetters } = useGameData();
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();

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
  // Fixed stat every echo of this cost grants at this level (4/3-cost flat ATK, 1-cost flat HP), additive with the rolled main stat and substats
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
          transition={prefersReducedMotion
            ? { duration: 0.12, ease: 'linear' }
            : { duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-clip border-t border-border/50 bg-black/15"
        >
          <div className="sticky left-0 w-full max-w-(--scrollport,none)">
          <div className="px-4 py-5 md:px-6">
            <div className="mx-auto w-full max-w-330">
              <div className="flex flex-col gap-5 md:flex-row">
                {/* Identity rail */}
                <div className="flex w-full shrink-0 flex-col md:w-76">
                  {echoMeta && (
                    <div
                      className="panel-glass relative aspect-square w-full max-w-56 shrink-0 self-center overflow-hidden md:max-w-64"
                      style={{ borderColor: `${getEchoCVFrameColor(echo.cv)}66` }}
                    >
                      <img
                        src={getEchoPaths(echoMeta, phantom)}
                        alt={echoName}
                        className="absolute inset-0 h-full w-full rounded-[inherit] object-cover"
                      />
                    </div>
                  )}

                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className={EYEBROW_CLASS}>Crit Value</span>
                        <span className="leading-none tabular-nums">
                          <span className="font-gowun text-base font-semibold" style={{ color: cvTier.color }}>{echo.cv.toFixed(1)}</span>
                          <span className="ml-1 text-2xs text-text-primary/45">/ {ECHO_SUBSTAT_CV_MAX}</span>
                        </span>
                      </div>
                      <TierLadder currentLabel={cvTier.label} />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <span className={EYEBROW_CLASS}>Roll Value</span>
                        <span className="font-gowun text-base font-semibold leading-none tabular-nums" style={{ color: rvTier.color }}>{rv.toFixed(0)}%</span>
                      </div>
                      <TierLadder currentLabel={rvTier.label} />
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/8 pt-3">
                    <EquippedByStrip uid={uid} echoKey={echo.echoKey} usageCount={Number(echo.usageCount)} onOpenBuild={onOpenBuild} />
                  </div>

                  {firstSeenLabel && (
                    <div className="mt-3 font-ropa text-3xs leading-relaxed uppercase tracking-[0.14em] text-text-primary/45">
                      Added <span className="text-text-primary/60">{firstSeenLabel}</span>
                      {lastSeenLabel && lastSeenLabel !== firstSeenLabel && (
                        <> · Last seen <span className="text-text-primary/60">{lastSeenLabel}</span></>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="mb-4 flex min-w-0 items-center gap-3 border-b border-white/8 pb-3.5">
                    <div className="min-w-0 flex-1 truncate font-gowun text-xl leading-tight font-semibold text-text-primary" title={echoName}>
                      {echoName}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <span className="rounded bg-white/8 px-1.5 py-1 font-gowun text-xs leading-none font-semibold tabular-nums text-text-primary/85 ring-1 ring-white/8">
                        +{level}
                      </span>
                      <span className="rounded bg-white/6 px-1.5 py-1 font-ropa text-3xs leading-none uppercase tracking-[0.14em] text-text-primary/65 ring-1 ring-white/8">
                        {echo.cost} Cost
                      </span>
                      {phantom && (
                        <span className="rounded bg-cyan-300/8 px-1.5 py-1 text-3xs leading-none font-semibold text-cyan-200 ring-1 ring-cyan-200/15">
                          Phantom
                        </span>
                      )}
                    </div>
                  </div>

                  {echo.mainStatType && (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/60 px-3 py-2.5">
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
                      <span className="shrink-0 font-gowun text-lg font-bold tabular-nums text-text-primary">
                        {formatStatValue(echo.mainStatType, echo.mainStatValue)}
                      </span>
                    </div>
                  )}

                  {baseStatType && baseStatValue > 0 && (
                    <div
                      className="mt-1.5 flex items-center justify-between gap-3 rounded-md bg-black/35 px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                      title={`Every ${echo.cost}-cost echo grants this fixed flat ${statLabel(baseStatType)} at +${level}, on top of its rolled main stat and substats.`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {baseIcon ? (
                          <img src={baseIcon} alt="" className="h-5 w-5 shrink-0 object-contain opacity-80" />
                        ) : (
                          <span className="h-5 w-5 shrink-0 rounded bg-white/10" />
                        )}
                        <span className="truncate text-sm font-semibold text-text-primary/75">{statLabel(baseStatType)}</span>
                        <span className="rounded bg-white/8 px-2 py-1 font-ropa text-[9px] leading-none uppercase tracking-[0.18em] text-text-primary/50">
                          Base
                        </span>
                      </span>
                      <span className="shrink-0 font-gowun text-lg font-bold tabular-nums text-text-primary/80">
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
                          className="flex items-center gap-2.5 rounded bg-black/40 py-1.5 pr-3 pl-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
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
                            className="w-14 shrink-0 text-right font-gowun text-base font-semibold tabular-nums"
                            style={tierInfo ? { color: tierInfo.color } : undefined}
                          >
                            {formatStatValue(type, sub.value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex w-full shrink-0 flex-col md:w-80">
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
                                    <p key={bonus.stat} className="text-sm leading-relaxed text-text-primary/80">
                                      {statLabel(bonus.stat)}{' '}
                                      <span className="font-semibold text-cyan-200">+{formatFetterBonusValue(bonus.value)}%</span>
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed whitespace-pre-line text-text-primary/80">{renderedParts}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {skillTemplate && (
                    <div className={set ? 'mt-4 border-t border-white/8 pt-3' : ''}>
                      <div className={`mb-1.5 ${EYEBROW_CLASS}`}>Echo Skill</div>
                      <div className="max-h-48 overflow-y-auto pr-1 text-sm leading-relaxed whitespace-pre-line text-text-primary/75">
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
            </div>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
